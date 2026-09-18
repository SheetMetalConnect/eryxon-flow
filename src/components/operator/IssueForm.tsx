import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Camera, AlertTriangle, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import {
  deriveIssueLocationContext,
  uploadIssueAttachments,
} from "@/lib/issues/reporting";

interface PrefilledData {
  affectedQuantity?: number;
  isShortfall?: boolean;
}

interface IssueFormProps {
  operationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledData?: PrefilledData | null;
}

interface IssueCategory {
  id: string;
  code: string;
  description: string;
  severity_default: "low" | "medium" | "high" | "critical";
}

interface OperationIssueContext {
  sequence: number;
  cell_id: string;
  operation_name: string;
  part: {
    id: string;
    part_number: string;
    current_cell_id: string | null;
    job: {
      id: string;
      job_number: string;
    };
  };
}

type IssueType = "general" | "ncr";
type NcrCategory = "material_defect" | "dimensional" | "surface_finish" | "process_error" | "other";

export default function IssueForm({ operationId, open, onOpenChange, onSuccess, prefilledData }: IssueFormProps) {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const operatorName = activeOperator?.full_name || profile?.full_name || 'Unknown';
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [issueType, setIssueType] = useState<IssueType>("general");
  const [ncrCategory, setNcrCategory] = useState<NcrCategory | "">("");
  const [affectedQuantity, setAffectedQuantity] = useState<number | "">("");
  const [standstill, setStandstill] = useState(false);

  const isShortfall = prefilledData?.isShortfall ?? false;

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (prefilledData?.affectedQuantity) {
        setAffectedQuantity(prefilledData.affectedQuantity);
        setIssueType("ncr");
        setNcrCategory("process_error");
        setSeverity("high");
      }
    }
  }, [open, prefilledData]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("issue_categories")
        .select("*")
        .eq("active", true)
        .order("code");
      if (!error && data) {
        const typedData = data.map(cat => ({
          ...cat,
          severity_default: cat.severity_default as "low" | "medium" | "high" | "critical"
        }));
        setCategories(typedData);
      }
    } catch (error) {
      // Table might not exist yet - that's ok, we'll show severity selector instead
      logger.debug("IssueForm", "Issue categories table not available");
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const cat = categories.find(c => c.id === categoryId);
    if (cat?.severity_default) {
      setSeverity(cat.severity_default);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId || !profile?.tenant_id || !description.trim()) return;
    if (loading) return;

    setLoading(true);
    try {
      const issueId = crypto.randomUUID();
      const { data: operationData, error: operationError } = await supabase
        .from("operations")
        .select(`
          sequence,
          cell_id,
          operation_name,
          part:parts!inner(
            id,
            part_number,
            current_cell_id,
            job:jobs!inner(
              id,
              job_number
            )
          )
        `)
        .eq("id", operationId)
        .single();

      if (operationError) throw operationError;

      const typedOperation = operationData as OperationIssueContext | null;
      if (!typedOperation) {
        throw new Error(t("issues.failedToReportIssue"));
      }

      const { data: nextOperations } = await supabase
        .from("operations")
        .select("cell_id, sequence, status")
        .eq("part_id", typedOperation.part.id)
        .gt("sequence", typedOperation.sequence)
        .order("sequence", { ascending: true });

      const { currentCellId, intendedNextCellId } = deriveIssueLocationContext({
        operationCellId: typedOperation.cell_id,
        partCurrentCellId: typedOperation.part.current_cell_id,
        operationSequence: typedOperation.sequence,
        nextOperations: nextOperations || [],
      });

      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      const fullDescription = selectedCategory
        ? `[${selectedCategory.code}] ${description.trim()}`
        : description.trim();

      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("issues").insert({
        id: issueId,
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        created_by: operatorId,
        description: fullDescription,
        severity,
        issue_type: issueType,
        ncr_category: issueType === "ncr" && ncrCategory ? ncrCategory : null,
        affected_quantity: affectedQuantity !== "" ? affectedQuantity : null,
        current_cell_id: currentCellId,
        intended_next_cell_id: intendedNextCellId,
        // Parks the operation under a Yellow Card via the issues trigger.
        causes_standstill: standstill,
      });

      if (error) throw error;

      const attachmentResult = await uploadIssueAttachments({
        storage: supabase.storage,
        tenantId: profile.tenant_id,
        issueId,
        files,
      });

      let attachmentsPersisted = attachmentResult.uploadedPaths.length === 0;

      if (attachmentResult.uploadedPaths.length > 0) {
        const { error: updateError } = await supabase
          .from("issues")
          .update({ image_paths: attachmentResult.uploadedPaths })
          .eq("id", issueId)
          .eq("tenant_id", profile.tenant_id);

        if (updateError) {
          attachmentsPersisted = false;
          logger.error("IssueForm", "Failed to persist uploaded issue attachments", updateError);
        }
      }

      if (attachmentResult.failedFiles.length > 0) {
        logger.warn("IssueForm", "Some issue attachments failed to upload", {
          issueId,
          failedFiles: attachmentResult.failedFiles,
        });
      }


      toast.success(t("issues.issueReported"));
      if (attachmentResult.failedFiles.length > 0 || !attachmentsPersisted) {
        toast.warning(
          t("issues.issueReportedPhotosPending"),
        );
      }
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("issues.failedToReportIssue"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategoryId("");
    setSeverity("medium");
    setDescription("");
    setFiles(null);
    setIssueType("general");
    setNcrCategory("");
    setAffectedQuantity("");
    setStandstill(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const hasCategories = categories.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("issues.reportIssue")}</DialogTitle>
          {isShortfall && (
            <DialogDescription className="sr-only">
              {t("issues.shortfallContext")}
            </DialogDescription>
          )}
        </DialogHeader>

        {isShortfall && (
          <Alert className="shrink-0 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {t("issues.shortfallAlert")}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          <div>
            <Label htmlFor="issueType">{t("issues.issueType")}</Label>
            <Select value={issueType} onValueChange={(v: IssueType) => setIssueType(v)}>
              <SelectTrigger id="issueType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("issues.type.general")}</SelectItem>
                <SelectItem value="ncr">{t("issues.type.ncr")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {issueType === "ncr" && (
            <div>
              <Label htmlFor="ncrCategory">{t("issues.ncrCategory")}</Label>
              <Select value={ncrCategory} onValueChange={(v: NcrCategory) => setNcrCategory(v)}>
                <SelectTrigger id="ncrCategory" className="mt-1">
                  <SelectValue placeholder={t("issues.selectNcrCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material_defect">{t("issues.ncrCategories.materialDefect")}</SelectItem>
                  <SelectItem value="dimensional">{t("issues.ncrCategories.dimensional")}</SelectItem>
                  <SelectItem value="surface_finish">{t("issues.ncrCategories.surfaceFinish")}</SelectItem>
                  <SelectItem value="process_error">{t("issues.ncrCategories.processError")}</SelectItem>
                  <SelectItem value="other">{t("issues.ncrCategories.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="affectedQuantity" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t("issues.affectedQuantity")}
            </Label>
            <Input
              id="affectedQuantity"
              type="number"
              min="0"
              value={affectedQuantity}
              onChange={(e) => setAffectedQuantity(e.target.value ? parseInt(e.target.value) : "")}
              placeholder={t("issues.affectedQuantityPlaceholder")}
              className="mt-1"
            />
          </div>

          {hasCategories && (
            <div>
              <Label htmlFor="category">{t("issues.category")}</Label>
              <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue placeholder={t("issues.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.code}: {cat.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="severity">{t("issues.severityLabel")}</Label>
            <Select value={severity} onValueChange={(v: string) => setSeverity(v as "low" | "medium" | "high" | "critical")}>
              <SelectTrigger id="severity" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("issues.severity.low")}</SelectItem>
                <SelectItem value="medium">{t("issues.severity.medium")}</SelectItem>
                <SelectItem value="high">{t("issues.severity.high")}</SelectItem>
                <SelectItem value="critical">{t("issues.severity.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">{t("issues.description")} *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isShortfall
                ? t("issues.shortfallDescPlaceholder")
                : t("issues.describeIssue")}
              rows={4}
              className="mt-1"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="space-y-0.5 pr-3">
              <Label htmlFor="standstill" className="text-sm font-medium text-foreground">
                {t("issues.standstill")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("issues.standstillDesc")}
              </p>
            </div>
            <Switch id="standstill" checked={standstill} onCheckedChange={setStandstill} />
          </div>

          <div>
            <label
              htmlFor="photos"
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">
                {files && files.length > 0
                  ? t("issues.filesSelected", { count: files.length })
                  : t("issues.addPhoto")}
              </span>
            </label>
            <input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(e) => setFiles(e.target.files)}
              className="hidden"
            />
          </div>

          </div>
          <div className="shrink-0 flex gap-3 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex-1"
              size="lg"
            >
              {loading ? t("common.saving") : t("issues.report")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
