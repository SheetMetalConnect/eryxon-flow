import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, PackageCheck, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import IssueForm from "@/components/operator/IssueForm";
import ProductionQuantityModal from "@/components/operator/ProductionQuantityModal";
import type { TerminalJob } from "@/types/terminal";

interface TerminalActionBarProps {
  completeDisabled: boolean;
  completeTitle: string;
  isActionPending: boolean;
  job: TerminalJob;
  onComplete?: () => void;
  onDataRefresh?: () => void;
  onPause?: () => void;
  onStart?: () => void;
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
      <div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <p className="mb-2 text-center text-xs text-muted-foreground">
          {t("terminal.productionFlow")}
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {!job.isCurrentUserClocked ? (
            <Button
              onClick={onStart}
              disabled={job.startBlocked || isActionPending}
              title={job.startBlocked ? t("production.errors.notReleased") : undefined}
              className="min-h-10 rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700"
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
            className="min-h-10 rounded-lg border-primary/30 text-sm text-primary hover:bg-primary/10"
          >
            <PackageCheck className="mr-1.5 h-4 w-4" />
            {t("production.reportTitle", "Record output")}
          </Button>

          {showCompleteAction ? (
            <Button
              onClick={onComplete}
              className="min-h-10 rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700"
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
            className="min-h-10 rounded-lg border-amber-500/30 text-sm text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
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
        onSuccess={() => { setQuantityOpen(false); onDataRefresh?.(); }}
        onFileIssue={(quantity) => { setShortfall(quantity); setIssueOpen(true); }}
      />
    </>
  );
}
