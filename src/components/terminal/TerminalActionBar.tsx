import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronRight, Loader2, PackageCheck, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import IssueForm from "@/components/operator/IssueForm";
import ProductionQuantityModal from "@/components/operator/ProductionQuantityModal";
import type { TerminalJob } from "@/types/terminal";

interface TerminalActionBarProps {
  completeDisabled: boolean;
  completeTitle: string;
  isActionPending: boolean;
  job: TerminalJob;
  onComplete?: () => void | Promise<void>;
  onDataRefresh?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onStart?: () => void | Promise<void>;
  pauseActionLabel?: string;
  showCompleteAction: boolean;
  startActionLabel?: string;
}

export function TerminalActionBar({
  completeDisabled,
  completeTitle,
  isActionPending,
  job,
  onComplete,
  onDataRefresh,
  onPause,
  onStart,
  pauseActionLabel,
  showCompleteAction,
  startActionLabel,
}: TerminalActionBarProps) {
  const { t } = useTranslation();
  const [issueOpen, setIssueOpen] = useState(false);
  const [quantityOpen, setQuantityOpen] = useState(false);
  const [shortfall, setShortfall] = useState<number | null>(null);

  return (
    <>
      <div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-md" aria-busy={isActionPending}>
        <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">1</span>
          <span>{t("production.reportTitle")}</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-400">2</span>
          <span>{t("terminal.markComplete")}</span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {!job.isCurrentUserClocked ? (
            <Button
              onClick={onStart}
              disabled={job.startBlocked || isActionPending}
              title={job.startBlocked ? t("production.errors.notReleased") : undefined}
              className="min-h-10 rounded-lg bg-emerald-600 text-sm text-white transition-colors hover:bg-emerald-700 motion-reduce:transition-none"
            >
              <Play className="mr-1.5 h-4 w-4" />
              {startActionLabel ?? t("operations.start", "Start")}
            </Button>
          ) : (
            <Button onClick={onPause} disabled={isActionPending} variant="outline" className="min-h-10 rounded-lg text-sm">
              <Pause className="mr-1.5 h-4 w-4" />
              {pauseActionLabel ?? t("operations.pause", "Pause")}
            </Button>
          )}

          <Button
            onClick={() => setQuantityOpen(true)}
            disabled={isActionPending}
            variant="outline"
            className="min-h-10 rounded-lg border-primary/30 text-sm text-primary transition-colors hover:bg-primary/10 motion-reduce:transition-none"
          >
            <PackageCheck className="mr-1.5 h-4 w-4" />
            {t("production.reportTitle", "Record output")}
          </Button>

          {showCompleteAction ? (
            <Button
              onClick={onComplete}
              className="min-h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-emerald-700 hover:shadow motion-reduce:transition-none active:scale-[0.99]"
              disabled={completeDisabled || isActionPending}
              title={completeTitle}
            >
              <Square className="mr-1.5 h-4 w-4" />
              {job.isCurrentUserClocked
                ? t("terminal.stopAndComplete", "Stop & complete")
                : t("terminal.markComplete", "Mark complete")}
            </Button>
          ) : null}

          <Button
            variant="outline"
            disabled={isActionPending}
            onClick={() => { setShortfall(null); setIssueOpen(true); }}
            className="min-h-10 rounded-lg border-amber-500/30 text-sm text-amber-600 transition-colors hover:bg-amber-500/10 motion-reduce:transition-none dark:text-amber-400"
          >
            <AlertTriangle className="mr-1.5 h-4 w-4" />
            {t("issues.reportIssue", "Report issue")}
          </Button>
        </div>
      </div>

      <IssueForm
        operationId={job.operationId}
        open={issueOpen}
        onOpenChange={(open) => { setIssueOpen(open); if (!open) setShortfall(null); }}
        onSuccess={() => { setIssueOpen(false); setShortfall(null); }}
        prefilledData={shortfall === null ? null : { affectedQuantity: shortfall, isShortfall: true }}
      />
      <ProductionQuantityModal
        isOpen={quantityOpen}
        onClose={() => setQuantityOpen(false)}
        operationId={job.operationId}
        operationName={job.currentOp}
        partNumber={job.description}
        plannedQuantity={job.quantity}
        allowComplete={showCompleteAction && !completeDisabled}
        onSuccess={async (_quantity, completeAfterReport) => {
          if (completeAfterReport && onComplete) await onComplete();
          else await onDataRefresh?.();
          setQuantityOpen(false);
        }}
        onFileIssue={(quantity) => { setShortfall(quantity); setIssueOpen(true); }}
      />
    </>
  );
}
