import { Badge } from "@/components/ui/badge";
import { FileText, Box, AlertTriangle, Clock, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { TerminalJob } from "@/types/terminal";
import { getDueUrgency, dueUrgencyTextClass } from "@/lib/due-date";
import { TerminalCellInfo } from "./TerminalCellInfo";

interface JobRowProps {
  job: TerminalJob;
  isSelected: boolean;
  onClick: () => void;
  variant: "process" | "buffer" | "expected";
}

const getOperationBadgeColor = (opName: string) => {
  const name = opName.toLowerCase();
  if (name.includes("frezen") || name.includes("mill")) return "bg-operation-milling";
  if (name.includes("afbramen") || name.includes("deburr")) return "bg-status-completed";
  if (name.includes("assemblage") || name.includes("assembly")) return "bg-status-on-hold";
  if (name.includes("lassen") || name.includes("weld")) return "bg-operation-welding";
  if (name.includes("autorisatie") || name.includes("auth")) return "bg-operation-default";
  return "bg-operation-default";
};

const urgencyLabel: Record<string, string> = {
  overdue: "!",
  today: "⏰",
  soon: "⚡",
};

export function JobRow({ job, isSelected, onClick, variant }: JobRowProps) {
  const { t } = useTranslation();
  const rawDueDate = typeof job.dueDate === "string" ? job.dueDate : null;
  const dueDate = rawDueDate ? new Date(rawDueDate) : null;
  const hasValidDueDate = dueDate !== null && Number.isFinite(dueDate.getTime());
  const dueUrgency = getDueUrgency(rawDueDate);

  return (
    <tr
      onClick={onClick}
      className={cn(
        "h-10 cursor-pointer border-b border-border transition-colors hover:bg-accent/30",
        isSelected && "bg-accent/50 ring-1 ring-primary",
        variant === "process" && "bg-status-active/5",
        job.isCurrentUserClocked && "bg-primary/10 ring-1 ring-primary/50",
        job.isBulletCard && "border-l-2 border-l-destructive bg-destructive/5",
      )}
    >
      {/* Job Number */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm font-medium text-foreground">
        <div className="flex items-center gap-2">
          {job.isBulletCard ? (
            <Zap className="h-3.5 w-3.5 shrink-0 text-destructive" />
          ) : null}
          {job.isCurrentUserClocked ? (
            <Badge
              className="animate-pulse bg-primary px-1.5 py-0 text-[10px] font-bold text-primary-foreground"
              title={t("terminal.youAreClockedOn")}
            >
              <Clock className="mr-0.5 h-2.5 w-2.5" />
              {t("terminal.you")}
            </Badge>
          ) : null}
          {job.activeTimeEntryId && !job.isCurrentUserClocked ? (
            <Badge
              variant="outline"
              className="border-muted-foreground/50 px-1.5 py-0 text-[10px]"
              title={job.activeOperatorName}
            >
              <User className="mr-0.5 h-2.5 w-2.5" />
              {job.activeOperatorName?.split(" ")[0] || t("terminal.other")}
            </Badge>
          ) : null}
          {String(job.jobCode ?? "")}
        </div>
      </td>

      {/* Part Number */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm text-foreground">
        {String(job.description ?? "")}
      </td>

      {/* Operation */}
      <td className="px-2 py-1.5">
        <Badge
          className={cn(
            "whitespace-nowrap px-2 py-0.5 text-xs font-semibold text-primary-foreground",
            getOperationBadgeColor(job.currentOp),
          )}
        >
          {job.currentOp}
        </Badge>
      </td>

      {/* Cell — POLCA signal: current → next cell with GO/PAUSE */}
      <td className="whitespace-nowrap px-2 py-1.5">
        <TerminalCellInfo
          operationId={job.operationId}
          partId={job.partId}
          currentCellId={job.cellId}
          currentCellName={String(job.cellName || "-")}
          currentCellColor={job.cellColor || "#3b82f6"}
          currentSequence={job.currentSequence}
          variant={variant}
        />
      </td>

      {/* Material */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm text-foreground">
        {String(job.material || "-")}
      </td>

      {/* Quantity */}
      <td className="whitespace-nowrap px-2 py-1.5 text-center text-sm text-foreground">
        {job.quantity}
      </td>

      {/* Remaining Hours */}
      <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono text-sm text-foreground">
        {job.hours}h
      </td>

      {/* Planned Start */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm text-muted-foreground">
        {typeof job.plannedStart === "string"
          ? new Date(job.plannedStart).toLocaleDateString("nl-NL", {
              day: "2-digit",
              month: "2-digit",
            })
          : "-"}
      </td>

      {/* Due Date */}
      <td
        className={cn(
          "whitespace-nowrap px-2 py-1.5 text-sm font-medium",
          dueUrgencyTextClass[dueUrgency],
        )}
      >
        {urgencyLabel[dueUrgency] ? (
          <span className="mr-1">{urgencyLabel[dueUrgency]}</span>
        ) : null}
        {hasValidDueDate
          ? dueDate.toLocaleDateString("nl-NL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "-"}
      </td>

      {/* Files */}
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-center gap-1.5">
          {job.hasPdf ? (
            <div title="PDF Available">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
          ) : null}
          {job.hasModel ? (
            <div title="3D Model">
              <Box className="h-3.5 w-3.5 text-sky-500" />
            </div>
          ) : null}
          {job.warnings && job.warnings.length > 0 ? (
            <div title={job.warnings.join(", ")}>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </div>
          ) : null}
        </div>
      </td>

      {/* Backlog Status */}
      <td className="whitespace-nowrap px-2 py-1.5">
        {dueUrgency === "overdue" ? (
          <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
            {t("terminal.backlog.overdue", "Te laat")}
            <span className="text-red-400">▶</span>
          </span>
        ) : dueUrgency === "today" ? (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
            {t("terminal.backlog.today", "Vandaag")}
          </span>
        ) : dueUrgency === "soon" ? (
          <span className="text-[10px] font-medium text-orange-400">
            {t("terminal.backlog.soon", "Binnenkort")}
          </span>
        ) : null}
      </td>
    </tr>
  );
}
