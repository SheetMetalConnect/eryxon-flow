import { Badge } from "@/components/ui/badge";
import { FileText, Box, AlertTriangle, Clock, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { TerminalJob } from "@/types/terminal";
import { getDueUrgency, dueUrgencyTextClass } from "@/lib/due-date";

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
  const dueDate = job.dueDate ? new Date(job.dueDate) : null;
  const hasValidDueDate = dueDate !== null && Number.isFinite(dueDate.getTime());
  const dueUrgency = getDueUrgency(job.dueDate);

  return (
    <tr
      onClick={onClick}
      className={cn(
        "cursor-pointer border-b border-border transition-colors hover:bg-accent/30",
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
          {job.jobCode}
        </div>
      </td>

      {/* Part Number */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm text-foreground">
        {job.description}
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

      {/* Cell */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm text-foreground">
        <span
          className="inline-block rounded px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: job.cellColor ? `${job.cellColor}20` : "transparent",
            color: job.cellColor || "inherit",
          }}
        >
          {job.cellName || "-"}
        </span>
      </td>

      {/* Material */}
      <td className="whitespace-nowrap px-2 py-1.5 text-sm text-foreground">
        {job.material || "-"}
      </td>

      {/* Quantity */}
      <td className="whitespace-nowrap px-2 py-1.5 text-center text-sm text-foreground">
        {job.quantity}
      </td>

      {/* Remaining Hours */}
      <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono text-sm text-foreground">
        {job.hours}h
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
    </tr>
  );
}
