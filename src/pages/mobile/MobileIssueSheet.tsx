import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/integrations/supabase/client";
import { dispatchIssueCreated } from "@/lib/event-dispatch";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { OperationWithDetails } from "@/lib/database";

type Severity = "low" | "medium" | "high" | "critical";

const SEVERITIES: Array<{ id: Severity; label: string; classes: string }> = [
  { id: "low", label: "Low", classes: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40" },
  { id: "medium", label: "Medium", classes: "bg-amber-500/15 text-amber-500 border-amber-500/40" },
  { id: "high", label: "High", classes: "bg-orange-500/15 text-orange-500 border-orange-500/40" },
  { id: "critical", label: "Critical", classes: "bg-red-500/15 text-red-500 border-red-500/40" },
];

interface MobileIssueSheetProps {
  open: boolean;
  onClose: () => void;
  operation: OperationWithDetails;
  onCreated: () => Promise<void> | void;
}

/**
 * Touch-first issue reporter. Slides up from the bottom of the screen and
 * keeps the entire form above the keyboard so operators can describe the
 * problem and snap a photo without scrolling.
 */
export default function MobileIssueSheet({
  open,
  onClose,
  operation,
  onCreated,
}: MobileIssueSheetProps) {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const haptics = useHaptics();
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const operatorId = activeOperator?.id || profile?.id;
  const operatorName =
    activeOperator?.full_name || profile?.full_name || "Unknown";

  const reset = () => {
    setSeverity("medium");
    setDescription("");
    setFiles([]);
  };

  const submit = async () => {
    if (!operatorId || !profile?.tenant_id || !description.trim()) {
      void haptics.warning();
      toast.error(t("issues.descriptionRequired", "Add a short description"));
      return;
    }
    setBusy(true);
    try {
      const issueId = crypto.randomUUID();
      const imagePaths: string[] = [];
      for (const file of files) {
        const path = `${profile.tenant_id}/issues/${issueId}/${file.name}`;
        const { error } = await supabase.storage
          .from("issues")
          .upload(path, file);
        if (error) {
          logger.error("MobileIssueSheet", "Image upload error", error);
          throw new Error(error.message);
        }
        imagePaths.push(path);
      }

      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("issues").insert({
        id: issueId,
        tenant_id: profile.tenant_id,
        operation_id: operation.id,
        created_by: operatorId,
        description: description.trim(),
        severity,
        image_paths: imagePaths.length > 0 ? imagePaths : null,
        issue_type: "general",
      });
      if (error) throw error;

      void dispatchIssueCreated(profile.tenant_id, {
        issue_id: issueId,
        operation_id: operation.id,
        operation_name: operation.operation_name,
        part_id: operation.part.id,
        part_number: operation.part.part_number,
        job_id: operation.part.job.id,
        job_number: operation.part.job.job_number,
        created_by: operatorId,
        operator_name: operatorName,
        severity,
        description: description.trim(),
        created_at: createdAt,
      });

      await haptics.success();
      toast.success(t("issues.issueReported", "Issue reported"));
      reset();
      onClose();
      await onCreated();
    } catch (error) {
      await haptics.error();
      logger.error("MobileIssueSheet", "Failed to create issue", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("issues.failedToReportIssue", "Failed to report issue"),
      );
    } finally {
      setBusy(false);
    }
  };

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list) return;
    const next: File[] = [];
    for (let i = 0; i < list.length; i++) next.push(list[i]);
    setFiles((prev) => [...prev, ...next]);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DrawerContent className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <DrawerHeader className="px-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2 text-left text-base font-semibold">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("issues.report", "Report issue")}
            </DrawerTitle>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-muted/40 active:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-left text-[12px] text-muted-foreground">
            {operation.part.job.job_number} · {operation.operation_name}
          </p>
        </DrawerHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("issues.severity", "Severity")}
            </Label>
            <div role="radiogroup" className="mt-2 grid grid-cols-4 gap-2">
              {SEVERITIES.map((option) => (
                <button
                  key={option.id}
                  role="radio"
                  aria-checked={severity === option.id}
                  type="button"
                  onClick={() => {
                    void haptics.selection();
                    setSeverity(option.id);
                  }}
                  className={cn(
                    "h-11 rounded-xl border text-[13px] font-semibold transition-colors",
                    severity === option.id
                      ? option.classes
                      : "border-border/60 bg-card/40 text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label
              htmlFor="issue-description"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("issues.description", "What happened?")}
            </Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t(
                "issues.descriptionPlaceholder",
                "Describe the problem so the next operator can pick up where you left off.",
              )}
              className="mt-1 min-h-[120px] rounded-2xl bg-card/60 text-base"
              autoCapitalize="sentences"
              enterKeyHint="done"
            />
          </div>

          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("issues.photos", "Photos")}
            </Label>
            <label
              className={cn(
                "mt-2 flex h-20 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/40 text-[13px] font-medium text-muted-foreground",
                "active:bg-card/60",
              )}
            >
              <Camera className="h-5 w-5" />
              {files.length === 0
                ? t("issues.attachPhoto", "Attach photo")
                : t("issues.attachAnother", "Add another photo")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={onPickFiles}
              />
            </label>
            {files.length > 0 ? (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 px-2 py-2 text-[11px]"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) =>
                          prev.filter((_, removedIndex) => removedIndex !== index),
                        )
                      }
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground active:bg-muted/80"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Button
            type="button"
            disabled={busy || description.trim() === ""}
            onClick={() => void submit()}
            className="h-12 w-full rounded-2xl text-[15px] font-semibold"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("issues.submit", "Submit issue")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
