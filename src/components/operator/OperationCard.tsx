import { useState } from "react";
import { format, isPast } from "date-fns";
import {
  Clock3,
  User,
  Package,
  AlertTriangle,
  UserCheck,
  FileText,
  Box,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationIssues } from "@/hooks/useOperationIssues";
import OperationDetailModal from "./OperationDetailModal";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { OperationWithDetails } from "@/lib/database";

interface OperationCardProps {
  operation: OperationWithDetails;
  onUpdate: () => void;
  compact?: boolean;
  assignedToMe?: boolean;
  assignedByName?: string;
}

/** Left-edge color stripe by status */
const statusStripe: Record<string, string> = {
  in_progress: "bg-amber-500",
  not_started: "bg-slate-300 dark:bg-slate-600",
  completed: "bg-emerald-500",
  on_hold: "bg-orange-500",
};

export default function OperationCard({
  operation,
  onUpdate,
  compact = false,
  assignedToMe = false,
  assignedByName,
}: OperationCardProps) {
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);
  const { profile } = useAuth();
  const { pendingCount, highestSeverity } = useOperationIssues(
    operation.id,
    profile?.tenant_id,
  );

  const dueDate =
    operation.part.job.due_date_override || operation.part.job.due_date;
  const dueDateObj = dueDate ? new Date(dueDate) : null;
  const isOverdue =
    dueDateObj && Number.isFinite(dueDateObj.getTime()) && isPast(dueDateObj);
  const estimatedHours = (operation.estimated_time || 0) / 60;
  const actualHours = (operation.actual_time || 0) / 60;
  const remainingTime = estimatedHours - actualHours;
  const isOvertime = remainingTime < 0;
  const isAssignedToMe =
    operation.assigned_operator_id === profile?.id || assignedToMe;
  const isActive = Boolean(operation.active_time_entry);
  const hasPdf = operation.part.file_paths?.some((p) =>
    p.toLowerCase().endsWith(".pdf"),
  );
  const hasModel = operation.part.file_paths?.some((p) => {
    const lp = p.toLowerCase();
    return lp.endsWith(".step") || lp.endsWith(".stp");
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDetail(true)}
        className={cn(
          "group relative flex w-full overflow-hidden rounded-md border text-left transition-all",
          "border-border/60 bg-card hover:border-primary/40 hover:shadow-sm",
          isActive && "border-primary/40 bg-primary/[0.03]",
          isOverdue && !isActive && "border-red-400/40",
        )}
      >
        {/* Status stripe */}
        <div
          className={cn(
            "w-1 shrink-0",
            statusStripe[operation.status] || "bg-slate-300",
            isActive && "animate-pulse",
          )}
        />

        <div className={cn("min-w-0 flex-1", compact ? "px-2.5 py-2" : "px-3 py-2.5")}>
          {/* Row 1: Job number + due date */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {operation.part.job.job_number}
            </span>
            <span
              className={cn(
                "shrink-0 text-[10px] font-medium",
                isOverdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground",
              )}
            >
              {dueDateObj && Number.isFinite(dueDateObj.getTime())
                ? format(dueDateObj, "dd MMM")
                : ""}
            </span>
          </div>

          {/* Row 2: Operation name (primary info) */}
          <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {operation.operation_name}
          </div>

          {/* Row 3: Part number + material */}
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{operation.part.part_number}</span>
            {operation.part.material ? (
              <>
                <span className="text-border">·</span>
                <span className="truncate">{operation.part.material}</span>
              </>
            ) : null}
          </div>

          {/* Row 4: Meta line — time, icons, indicators */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {/* Remaining time */}
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  isOvertime
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )}
              >
                <Clock3 className="h-3 w-3" />
                {isOvertime ? "+" : ""}
                {Math.abs(remainingTime).toFixed(1)}h
              </span>

              {/* Quantity */}
              <span className="text-border">·</span>
              <span>{operation.part.quantity} pcs</span>
            </div>

            {/* Right-side icons */}
            <div className="flex items-center gap-1">
              {/* Active operator */}
              {isActive ? (
                <span
                  className="flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary"
                  title={operation.active_time_entry?.operator.full_name}
                >
                  <User className="h-2.5 w-2.5" />
                  {operation.active_time_entry?.operator.full_name
                    ?.split(" ")[0]}
                </span>
              ) : null}

              {/* Assigned to me */}
              {isAssignedToMe && !isActive ? (
                <UserCheck className="h-3 w-3 text-primary" />
              ) : null}

              {/* Assembly */}
              {operation.part.parent_part_id ? (
                <Package className="h-3 w-3 text-muted-foreground/60" />
              ) : null}

              {/* Files */}
              {hasPdf ? (
                <FileText className="h-3 w-3 text-muted-foreground/60" />
              ) : null}
              {hasModel ? (
                <Box className="h-3 w-3 text-muted-foreground/60" />
              ) : null}

              {/* Issues */}
              {pendingCount > 0 ? (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[9px] font-semibold",
                    highestSeverity === "critical" || highestSeverity === "high"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {pendingCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </button>

      <OperationDetailModal
        operation={operation}
        open={showDetail}
        onOpenChange={setShowDetail}
        onUpdate={onUpdate}
      />
    </>
  );
}
