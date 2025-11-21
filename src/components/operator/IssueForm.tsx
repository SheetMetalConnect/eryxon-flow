import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !profile?.tenant_id || !description.trim()) return;

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

      // Create issue
      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("issues").insert({
        id: issueId,
        tenant_id: profile.tenant_id,
        operation_id: operationId,
        created_by: profile.id,
        description: description.trim(),
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
          description: description.trim(),
          created_at: createdAt,
        }).catch(error => {
          console.error('Failed to trigger issue.created webhook:', error);
          // Don't fail the operation if webhook fails
        });
      }

      toast.success(t("issues.issueReported"));
      setDescription("");
      setSeverity("medium");
      setFiles(null);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("issues.reportIssue")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              rows={5}
              required
            />
          </div>

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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t("forms.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !description.trim()} className="flex-1">
              {t("issues.reportIssue")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
