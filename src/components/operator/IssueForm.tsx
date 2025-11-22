import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { triggerIssueCreatedWebhook } from "@/lib/webhooks";
import { useTranslation } from "react-i18next";

interface IssueFormProps {
  operationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function IssueForm({ operationId, open, onOpenChange, onSuccess }: IssueFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Basic fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [issueType, setIssueType] = useState<"general" | "ncr">("general");
  const [files, setFiles] = useState<FileList | null>(null);

  // NCR-specific fields
  const [ncrCategory, setNcrCategory] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [affectedQuantity, setAffectedQuantity] = useState<number | null>(null);
  const [disposition, setDisposition] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !profile?.tenant_id || !title.trim()) return;

    setLoading(true);
    try {
      const issueId = crypto.randomUUID();
      const imagePaths: string[] = [];

      // Upload images if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const path = `${profile.tenant_id}/issues/${issueId}/${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("issues")
            .upload(path, file);

          if (uploadError) throw uploadError;
          imagePaths.push(path);
        }
      }

      // Get operation and part details for webhook
      const { data: operationData } = await supabase
        .from("operations")
        .select(`
          operation_name,
          part:parts!inner(
            id,
            part_number,
            job:jobs!inner(
              id,
              job_number
            )
          )
        `)
        .eq("id", operationId)
        .single();

      // Build issue data
      const issueData: any = {
        id: issueId,
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        reported_by_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        severity,
        issue_type: issueType,
        status: 'open',
        image_paths: imagePaths.length > 0 ? imagePaths : null,
      };

      // Add NCR-specific fields if it's an NCR
      if (issueType === 'ncr') {
        if (ncrCategory) issueData.ncr_category = ncrCategory;
        if (rootCause) issueData.root_cause = rootCause;
        if (correctiveAction) issueData.corrective_action = correctiveAction;
        if (preventiveAction) issueData.preventive_action = preventiveAction;
        if (affectedQuantity !== null) issueData.affected_quantity = affectedQuantity;
        if (disposition) issueData.disposition = disposition;
        issueData.verification_required = verificationRequired;
      }

      // Create issue
      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("issues").insert(issueData);

      if (error) throw error;

      // Trigger webhook for issue created
      if (operationData) {
        const operation: any = operationData;
        const webhookEvent = issueType === 'ncr' ? 'ncr.created' : 'issue.created';
        triggerIssueCreatedWebhook(profile.tenant_id, {
          issue_id: issueId,
          operation_id: operationId,
          operation_name: operation.operation_name,
          part_id: operation.part.id,
          part_number: operation.part.part_number,
          job_id: operation.part.job.id,
          job_number: operation.part.job.job_number,
          created_by: profile.id,
          operator_name: profile.full_name || 'Unknown',
          severity,
          title: title.trim(),
          description: description.trim(),
          created_at: createdAt,
          issue_type: issueType,
        }).catch(error => {
          console.error('Failed to trigger webhook:', error);
          // Don't fail the operation if webhook fails
        });
      }

      toast.success(issueType === 'ncr' ? t("issues.ncrReported") : t("issues.issueReported"));

      // Reset form
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setIssueType("general");
      setFiles(null);
      setNcrCategory("");
      setRootCause("");
      setCorrectiveAction("");
      setPreventiveAction("");
      setAffectedQuantity(null);
      setDisposition("");
      setVerificationRequired(false);

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || t("issues.failedToReportIssue"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("issues.reportIssue")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Issue Type Selection */}
          <div>
            <Label htmlFor="issue-type">{t("issues.issueType")}</Label>
            <Select value={issueType} onValueChange={(v: any) => setIssueType(v)}>
              <SelectTrigger id="issue-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("issues.types.general")}</SelectItem>
                <SelectItem value="ncr">{t("issues.types.ncr")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic Fields */}
          <div>
            <Label htmlFor="title">{t("issues.title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("issues.titlePlaceholder")}
              required
            />
          </div>

          <div>
            <Label htmlFor="severity">{t("issues.severityLabel")}</Label>
            <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
              <SelectTrigger id="severity">
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
            <Label htmlFor="description">{t("issues.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("issues.describeIssue")}
              rows={4}
            />
          </div>

          {/* NCR-Specific Fields */}
          {issueType === 'ncr' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm">{t("issues.ncrDetails")}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ncr-category">{t("issues.ncrCategory")}</Label>
                  <Select value={ncrCategory} onValueChange={setNcrCategory}>
                    <SelectTrigger id="ncr-category">
                      <SelectValue placeholder={t("issues.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material_defect">{t("issues.categories.materialDefect")}</SelectItem>
                      <SelectItem value="dimensional">{t("issues.categories.dimensional")}</SelectItem>
                      <SelectItem value="surface_finish">{t("issues.categories.surfaceFinish")}</SelectItem>
                      <SelectItem value="process_error">{t("issues.categories.processError")}</SelectItem>
                      <SelectItem value="other">{t("issues.categories.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="disposition">{t("issues.disposition")}</Label>
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger id="disposition">
                      <SelectValue placeholder={t("issues.selectDisposition")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scrap">{t("issues.dispositions.scrap")}</SelectItem>
                      <SelectItem value="rework">{t("issues.dispositions.rework")}</SelectItem>
                      <SelectItem value="use_as_is">{t("issues.dispositions.useAsIs")}</SelectItem>
                      <SelectItem value="return_to_supplier">{t("issues.dispositions.returnToSupplier")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="affected-quantity">{t("issues.affectedQuantity")}</Label>
                <Input
                  id="affected-quantity"
                  type="number"
                  min="0"
                  value={affectedQuantity || ""}
                  onChange={(e) => setAffectedQuantity(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder={t("issues.affectedQuantityPlaceholder")}
                />
              </div>

              <div>
                <Label htmlFor="root-cause">{t("issues.rootCause")}</Label>
                <Textarea
                  id="root-cause"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder={t("issues.rootCausePlaceholder")}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="corrective-action">{t("issues.correctiveAction")}</Label>
                <Textarea
                  id="corrective-action"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder={t("issues.correctiveActionPlaceholder")}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="preventive-action">{t("issues.preventiveAction")}</Label>
                <Textarea
                  id="preventive-action"
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  placeholder={t("issues.preventiveActionPlaceholder")}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verification-required"
                  checked={verificationRequired}
                  onCheckedChange={(checked) => setVerificationRequired(checked as boolean)}
                />
                <Label htmlFor="verification-required" className="cursor-pointer">
                  {t("issues.verificationRequired")}
                </Label>
              </div>
            </div>
          )}

          {/* Photo Upload */}
          <div>
            <Label htmlFor="photos">{t("issues.photosOptional")}</Label>
            <div className="mt-2">
              <label
                htmlFor="photos"
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {files && files.length > 0
                    ? t("issues.filesSelected", { count: files.length })
                    : t("issues.choosePhotos")}
                </span>
              </label>
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t("forms.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
              {loading ? t("forms.submitting") : issueType === 'ncr' ? t("issues.reportNCR") : t("issues.reportIssue")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
