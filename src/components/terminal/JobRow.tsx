import { Badge } from "@/components/ui/badge";
import { FileText, Box, AlertTriangle, Clock3, User, Zap, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { TerminalJob } from "@/types/terminal";

interface JobRowProps {
  job: TerminalJob;
  isSelected: boolean;
  onClick: () => void;
  variant: "process" | "buffer" | "expected";
}

const variantClasses: Record<JobRowProps["variant"], string> = {
  process: "border-amber-500/30 bg-amber-500/10",
  buffer: "border-sky-500/30 bg-sky-500/10",
  expected: "border-border bg-card",
};

const operationClasses: Record<JobRowProps["variant"], string> = {
  process: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  buffer: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  expected: "bg-muted text-foreground",
};

export function JobRow({ job, isSelected, onClick, variant }: JobRowProps) {
  const { t } = useTranslation();
  const dueDate = job.dueDate ? new Date(job.dueDate) : null;
  const hasValidDueDate =
    dueDate !== null && Number.isFinite(dueDate.getTime());

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all hover:border-primary/30 hover:bg-muted/20",
        variantClasses[variant],
        isSelected && "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]",
        job.isCurrentUserClocked && "border-primary/50 bg-primary/10",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-mono text-base font-semibold text-foreground">
              {job.jobCode}
            </div>
            {job.isBulletCard ? (
              <Badge variant="destructive" className="gap-1 rounded-full">
                <Zap className="h-3.5 w-3.5" />
                {t("terminal.bulletCard")}
              </Badge>
            ) : null}
            {job.isCurrentUserClocked ? (
              <Badge className="gap-1 rounded-full bg-primary text-primary-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {t("terminal.you")}
              </Badge>
            ) : null}
            {job.activeTimeEntryId && !job.isCurrentUserClocked ? (
              <Badge variant="outline" className="gap-1 rounded-full">
                <User className="h-3.5 w-3.5" />
                {job.activeOperatorName?.split(" ")[0] || t("terminal.other")}
              </Badge>
            ) : null}
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">{job.description}</div>
            <div className="text-sm text-muted-foreground">{job.currentOp}</div>
          </div>
        </div>

        <div className="space-y-1 text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("terminal.columns.dueDate")}
          </div>
          <div className="text-sm font-semibold text-foreground">
            {hasValidDueDate ? dueDate.toLocaleDateString() : "-"}
          </div>
          <div className="text-xs text-muted-foreground">
            {job.hours}h {t("operator.remaining", "remaining")}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-background/70 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em]">
            {t("terminal.columns.cell")}
          </div>
          <div className="mt-1 flex items-center gap-2 font-medium text-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: job.cellColor || "currentColor" }}
            />
            {job.cellName || "-"}
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-background/70 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em]">
            {t("terminal.columns.material")}
          </div>
          <div className="mt-1 font-medium text-foreground">{job.material || "-"}</div>
        </div>
        <div className="rounded-xl border border-border/80 bg-background/70 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em]">
            {t("terminal.columns.quantity")}
          </div>
          <div className="mt-1 font-medium text-foreground">{job.quantity}</div>
        </div>
        <div className="rounded-xl border border-border/80 bg-background/70 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em]">
            {t("terminal.packet", "Packet")}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                operationClasses[variant],
              )}
            >
              <Layers3 className="h-3.5 w-3.5" />
              {job.currentOp}
            </span>
            {job.hasPdf ? <FileText className="h-4 w-4 text-primary" /> : null}
            {job.hasModel ? <Box className="h-4 w-4 text-sky-500" /> : null}
            {job.warnings?.length ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : null}
          </div>
        </div>
      </div>

      {job.notes ? (
        <div className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.notes}</div>
      ) : null}
    </button>
  );
}
