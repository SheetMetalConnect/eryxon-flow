import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { triggerIssueCreatedWebhook } from "@/lib/webhooks";
import { useTranslation } from "react-i18next";

interface IssueFormProps {
  operationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface IssueCategory {
  id: string;
  code: string;
  description: string;
  severity_default: "low" | "medium" | "high" | "critical";
}

export default function IssueForm({ operationId, open, onOpenChange, onSuccess }: IssueFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("issue_categories")
        .select("*")
        .eq("active", true)
        .order("code");
      if (!error && data) {
        setCategories(data);
      }
    } catch (error) {
      // Table might not exist yet - that's ok, we'll show severity selector instead
      console.log("Issue categories table not available");
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
    if (!profile?.id || !profile?.tenant_id || !description.trim()) return;
    if (loading) return;

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

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw new Error(`Failed to upload image: ${uploadError.message}`);
          }
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

      // Get category info if selected
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      const fullDescription = selectedCategory
        ? `[${selectedCategory.code}] ${description.trim()}`
        : description.trim();

      // Create issue
      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("issues").insert({
        id: issueId,
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        created_by: profile.id,
        description: fullDescription,
        severity,
        image_paths: imagePaths.length > 0 ? imagePaths : null,
      });

      if (error) throw error;

      // Trigger webhook for issue created
      if (operationData) {
        const operation: any = operationData;
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
          description: fullDescription,
          created_at: createdAt,
        }).catch(error => {
          console.error('Failed to trigger issue.created webhook:', error);
        });
      }

      toast.success(t("issues.issueReported", "Issue reported"));
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || t("issues.failedToReportIssue", "Failed to report issue"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategoryId("");
    setSeverity("medium");
    setDescription("");
    setFiles(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const hasCategories = categories.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("issues.reportIssue", "Report Issue")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category selector - only if categories exist in DB */}
          {hasCategories && (
            <div>
              <Label htmlFor="category">{t("issues.category", "Category")}</Label>
              <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue placeholder={t("issues.selectCategory", "Select category")} />
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

          {/* Severity - always shown */}
          <div>
            <Label htmlFor="severity">{t("issues.severityLabel", "Severity")}</Label>
            <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
              <SelectTrigger id="severity" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("issues.severity.low", "Low")}</SelectItem>
                <SelectItem value="medium">{t("issues.severity.medium", "Medium")}</SelectItem>
                <SelectItem value="high">{t("issues.severity.high", "High")}</SelectItem>
                <SelectItem value="critical">{t("issues.severity.critical", "Critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">{t("issues.description", "Description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("issues.describeIssue", "Describe the issue...")}
              rows={4}
              className="mt-1"
              required
            />
          </div>

          {/* Photo upload */}
          <div>
            <label
              htmlFor="photos"
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">
                {files && files.length > 0
                  ? t("issues.filesSelected", "{{count}} photo(s)", { count: files.length })
                  : t("issues.addPhoto", "Add photo")}
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

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex-1"
              size="lg"
            >
              {loading ? t("common.saving", "Saving...") : t("issues.report", "Report")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
