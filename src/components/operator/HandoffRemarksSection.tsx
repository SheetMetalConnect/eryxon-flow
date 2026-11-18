import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MAX_HANDOFF_REMARKS = 280;

interface HandoffRemarksSectionProps {
  operationId: string;
  tenantId?: string;
  note: string | null;
  updatedAt?: string | null;
  onSaved: () => void;
}

function formatRelativeTime(value: string, language: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const elapsedSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "auto",
  });

  for (const [unit, unitSeconds] of divisions) {
    if (Math.abs(elapsedSeconds) >= unitSeconds || unit === "second") {
      return formatter.format(
        Math.round(elapsedSeconds / unitSeconds),
        unit,
      );
    }
  }

  return null;
}

export default function HandoffRemarksSection({
  operationId,
  tenantId,
  note,
  updatedAt,
  onSaved,
}: HandoffRemarksSectionProps) {
  const { t, i18n } = useTranslation();
  const [currentNote, setCurrentNote] = useState(note);
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState(updatedAt ?? null);
  const [draft, setDraft] = useState(note ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const noteRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setCurrentNote(note);
    setCurrentUpdatedAt(updatedAt ?? null);
    setDraft(note ?? "");
    setValidationMessage(null);
  }, [note, updatedAt]);

  useEffect(() => {
    if (!currentNote || isExpanded) {
      setIsOverflowing(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = noteRef.current;
      if (!element) {
        return;
      }

      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentNote, isExpanded]);

  const hasNote = Boolean(currentNote?.trim());
  const counterLabel = `${draft.length}/${MAX_HANDOFF_REMARKS}`;
  const metadataLine = useMemo(() => {
    if (!hasNote || !currentUpdatedAt) {
      return null;
    }

    const relativeTime = formatRelativeTime(currentUpdatedAt, i18n.language);
    if (!relativeTime) {
      return null;
    }

    return t("operations.handoffRemarks.updatedFallback", {
      time: relativeTime,
    });
  }, [currentUpdatedAt, hasNote, i18n.language, t]);

  const beginEditing = () => {
    setDraft(currentNote ?? "");
    setValidationMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(currentNote ?? "");
    setValidationMessage(null);
    setIsEditing(false);
  };

  const handleDraftChange = (value: string) => {
    const exceedsLimit = value.length > MAX_HANDOFF_REMARKS;
    setDraft(value.slice(0, MAX_HANDOFF_REMARKS));
    setValidationMessage(
      exceedsLimit ? t("operations.handoffRemarks.limitReached") : null,
    );
  };

  const handleSave = async () => {
    const nextNote = draft.trim();

    setIsSaving(true);
    try {
      const query = supabase
        .from("operations")
        .update({ notes: nextNote || null })
        .eq("id", operationId);

      const result = tenantId ? await query.eq("tenant_id", tenantId) : await query;
      if (result.error) {
        throw result.error;
      }

      setCurrentNote(nextNote || null);
      setCurrentUpdatedAt(new Date().toISOString());
      setDraft(nextNote);
      setIsEditing(false);
      setIsExpanded(false);
      setValidationMessage(null);
      toast.success(t("operations.handoffRemarks.saved"));
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("operations.handoffRemarks.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{t("operations.handoffRemarks.title")}</span>
          </div>
          {!isEditing && !hasNote ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("operations.handoffRemarks.empty")}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={isEditing ? cancelEditing : beginEditing}
        >
          <PencilLine className="h-3.5 w-3.5" />
          {isEditing
            ? t("operations.handoffRemarks.cancel")
            : hasNote
              ? t("operations.handoffRemarks.edit")
              : t("operations.handoffRemarks.add")}
        </Button>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            maxLength={MAX_HANDOFF_REMARKS}
            rows={4}
            aria-invalid={validationMessage ? "true" : "false"}
            className={cn(
              "min-h-[112px] resize-none",
              validationMessage &&
                "border-destructive focus-visible:ring-destructive",
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t("operations.handoffRemarks.helper")}
          </p>
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "text-xs",
                validationMessage ? "text-destructive" : "text-muted-foreground",
              )}
              role={validationMessage ? "alert" : "status"}
            >
              {validationMessage ??
                t("operations.handoffRemarks.validationHint")}
            </div>
            <div
              className={cn(
                "shrink-0 text-xs tabular-nums",
                draft.length >= MAX_HANDOFF_REMARKS
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {counterLabel}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              disabled={isSaving}
            >
              {t("operations.handoffRemarks.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? t("operations.handoffRemarks.saving")
                : t("operations.handoffRemarks.save")}
            </Button>
          </div>
        </div>
      ) : hasNote ? (
        <div className="mt-3">
          <p
            ref={noteRef}
            className={cn(
              "whitespace-pre-wrap text-sm text-foreground",
              !isExpanded && "line-clamp-4",
            )}
          >
            {currentNote}
          </p>
          {isOverflowing ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto px-0 py-0 text-xs"
              onClick={() => setIsExpanded((value) => !value)}
            >
              {isExpanded
                ? t("operations.handoffRemarks.showLess")
                : t("operations.handoffRemarks.showMore")}
            </Button>
          ) : null}
          {metadataLine ? (
            <p className="mt-2 text-xs text-muted-foreground">{metadataLine}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
