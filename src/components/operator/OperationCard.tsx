import { OperationWithDetails } from "@/lib/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Package, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationIssues } from "@/hooks/useOperationIssues";
import OperationDetailModal from "./OperationDetailModal";
import { useTranslation } from "react-i18next";
import { ResourceCountBadge } from "@/components/ui/ResourceUsageDisplay";

interface OperationCardProps {
  operation: OperationWithDetails;
  onUpdate: () => void;
  compact?: boolean;
}

export default function OperationCard({ operation, onUpdate, compact = false }: OperationCardProps) {
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);
  const { profile } = useAuth();
  const { pendingCount, highestSeverity } = useOperationIssues(operation.id, profile?.tenant_id);

  const dueDate = operation.part.job.due_date_override || operation.part.job.due_date;
  const remainingTime = operation.estimated_time - (operation.actual_time || 0);
  const isOvertime = remainingTime < 0;
  const isAssignedToMe = operation.assigned_operator_id === profile?.id;

  const statusColors = {
    not_started: "bg-status-pending",
    in_progress: "bg-status-active",
    completed: "bg-status-completed",
    on_hold: "bg-status-on-hold",
  };

  const severityColors = {
    low: { border: 'border-severity-low', text: 'text-severity-low' },
    medium: { border: 'border-severity-medium', text: 'text-severity-medium' },
    high: { border: 'border-severity-high', text: 'text-severity-high' },
    critical: { border: 'border-severity-critical', text: 'text-severity-critical' },
  };

  if (compact) {
    return (
      <>
        <Card
          className={`p-3 cursor-pointer transition-all hover:shadow-md ${operation.active_time_entry ? "ring-2 ring-status-active" : ""
            }`}
          onClick={() => setShowDetail(true)}
        >
          {/* Status Bar */}
          <div className={`h-1 -mx-3 -mt-3 mb-2 rounded-t ${statusColors[operation.status]}`} />

          {/* Compact Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{operation.operation_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {operation.part.job.job_number} / {operation.part.part_number}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {operation.part.parent_part_id && (
                <Badge variant="outline" className="text-xs p-1">
                  <Package className="h-3 w-3" />
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-xs p-1">
                  <AlertTriangle className="h-3 w-3" />
                </Badge>
              )}
              <ResourceCountBadge operationId={operation.id} />
            </div>
          </div>

          {/* Compact Info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{operation.actual_time || 0}/{operation.estimated_time}m</span>
            </div>
            {operation.active_time_entry && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-status-active animate-pulse" />
                <span className="text-xs font-medium truncate max-w-20">
                  {operation.active_time_entry.operator.full_name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
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

  return (
    <>
      <Card
        className={`p-4 cursor-pointer transition-all hover:shadow-md ${operation.active_time_entry ? "ring-2 ring-status-active" : ""
          }`}
        onClick={() => setShowDetail(true)}
      >
        {/* Status Bar */}
        <div className={`h-1 -mx-4 -mt-4 mb-3 rounded-t ${statusColors[operation.status]}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {t("operations.job")} {operation.part.job.job_number}
            </div>
            <div className="text-xs text-muted-foreground">
              {operation.part.part_number}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {operation.part.parent_part_id && (
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                {t("parts.assy")}
              </Badge>
            )}
            {pendingCount > 0 && highestSeverity && (
              <Badge
                variant="outline"
                className={`text-xs ${severityColors[highestSeverity as keyof typeof severityColors]?.border} ${severityColors[highestSeverity as keyof typeof severityColors]?.text}`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {pendingCount}
              </Badge>
            )}
            <ResourceCountBadge operationId={operation.id} />
          </div>
        </div>

        {/* Operation Name */}
        <h4 className="font-medium mb-2">{operation.operation_name}</h4>

        {/* Assignment Badge */}
        {isAssignedToMe && (
          <Badge variant="secondary" className="text-xs mb-2">
            {t("operations.assignedToYou")}
          </Badge>
        )}

        {/* Time Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {operation.actual_time || 0}/{operation.estimated_time}m
            </span>
          </div>
          {remainingTime !== 0 && (
            <span className={isOvertime ? "text-destructive font-medium" : ""}>
              {isOvertime ? "+" : ""}
              {Math.abs(remainingTime)}m
            </span>
          )}
        </div>

        {/* Due Date */}
        {dueDate && (
          <div className="text-xs text-muted-foreground mb-2">
            {t("operations.due")}: {format(new Date(dueDate), "MMM d, yyyy")}
          </div>
        )}

        {/* Active Operator */}
        {operation.active_time_entry && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <div className="h-2 w-2 rounded-full bg-status-active animate-pulse" />
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium">
              {operation.active_time_entry.operator.full_name}
            </span>
          </div>
        )}
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
