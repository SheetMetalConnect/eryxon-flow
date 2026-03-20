import { useState } from "react";
import { format } from "date-fns";
import {
  Clock3,
  User,
  Package,
  AlertTriangle,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationIssues } from "@/hooks/useOperationIssues";
import OperationDetailModal from "./OperationDetailModal";
import { useTranslation } from "react-i18next";
import { ResourceCountBadge } from "@/components/ui/ResourceUsageDisplay";

import { OperationWithDetails } from "@/lib/database";

interface OperationCardProps {
  operation: OperationWithDetails;
  onUpdate: () => void;
  compact?: boolean;
  assignedToMe?: boolean;
  assignedByName?: string;
}

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

  const dueDate = operation.part.job.due_date_override || operation.part.job.due_date;
  const remainingTime = (operation.estimated_time || 0) - (operation.actual_time || 0);
  const isOvertime = remainingTime < 0;
  const isAssignedToMe =
    operation.assigned_operator_id === profile?.id || assignedToMe;

  const statusTone = {
    not_started: "border-border bg-background/70 text-foreground",
    in_progress:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    completed:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    on_hold:
      "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  const severityTone = {
    low: "border-border text-muted-foreground",
    medium: "border-amber-500/30 text-amber-600 dark:text-amber-400",
    high: "border-orange-500/30 text-orange-600 dark:text-orange-400",
    critical: "border-destructive/30 text-destructive",
  };

  const cardPadding = compact ? "p-3" : "p-4";

  return (
    <>
      <Card
        className={`cursor-pointer rounded-2xl border-border/80 bg-card/95 ${cardPadding} shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20 ${
          operation.active_time_entry ? "border-primary/40 bg-primary/5" : ""
        }`}
        onClick={() => setShowDetail(true)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`rounded-full ${statusTone[operation.status]}`}
              >
                {operation.status.replace("_", " ")}
              </Badge>
              {operation.part.parent_part_id ? (
                <Badge variant="outline" className="rounded-full">
                  <Package className="mr-1 h-3.5 w-3.5" />
                  {t("parts.assy")}
                </Badge>
              ) : null}
              {pendingCount > 0 && highestSeverity ? (
                <Badge
                  variant="outline"
                  className={`rounded-full ${severityTone[highestSeverity as keyof typeof severityTone]}`}
                >
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                  {pendingCount}
                </Badge>
              ) : null}
              <ResourceCountBadge operationId={operation.id} />
            </div>

            <div>
              <div className="font-mono text-sm font-semibold text-foreground">
                {operation.part.job.job_number}
              </div>
              <div className="text-base font-semibold text-foreground">
                {operation.operation_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {operation.part.part_number}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t("operations.due")}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {dueDate ? format(new Date(dueDate), "MMM d, yyyy") : "-"}
            </div>
          </div>
        </div>

        {isAssignedToMe ? (
          <Badge className="mt-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
            <UserCheck className="mr-1 h-3.5 w-3.5" />
            {assignedByName
              ? t("operations.assignedByAdmin", { name: assignedByName })
              : t("operations.assignedToYou")}
          </Badge>
        ) : null}

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em]">
              {t("operations.time", "Time")}
            </div>
            <div className="mt-1 flex items-center gap-2 text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              {(operation.actual_time || 0).toFixed(1)}h /{" "}
              {(operation.estimated_time || 0).toFixed(1)}h
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em]">
              {t("operations.remaining", "Remaining")}
            </div>
            <div
              className={`mt-1 flex items-center gap-2 ${
                isOvertime ? "text-destructive" : "text-foreground"
              }`}
            >
              <ArrowRight className="h-4 w-4" />
              {isOvertime ? "+" : ""}
              {Math.abs(remainingTime).toFixed(1)}h
            </div>
          </div>
        </div>

        {operation.active_time_entry ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">
              {operation.active_time_entry.operator.full_name}
            </span>
          </div>
        ) : null}
      </Card>

      <OperationDetailModal
        operation={operation}
        open={showDetail}
        onOpenChange={setShowDetail}
        onUpdate={onUpdate}
      />
    </>
  );
}
