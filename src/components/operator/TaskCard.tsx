import { TaskWithDetails } from "@/lib/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Package, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskIssues } from "@/hooks/useTaskIssues";
import TaskDetailModal from "./TaskDetailModal";

interface TaskCardProps {
  task: TaskWithDetails;
  onUpdate: () => void;
  compact?: boolean;
}

export default function TaskCard({ task, onUpdate, compact = false }: TaskCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const { profile } = useAuth();
  const { pendingCount, highestSeverity } = useTaskIssues(task.id, profile?.tenant_id);
  
  const dueDate = task.part.job.due_date_override || task.part.job.due_date;
  const remainingTime = task.estimated_time - (task.actual_time || 0);
  const isOvertime = remainingTime < 0;
  const isAssignedToMe = task.assigned_operator_id === profile?.id;

  const statusColors = {
    not_started: "bg-muted",
    in_progress: "bg-accent",
    completed: "bg-completed",
    on_hold: "bg-on-hold",
  };

  if (compact) {
    return (
      <>
        <Card
          className={`p-3 cursor-pointer transition-all hover:shadow-md ${
            task.active_time_entry ? "ring-2 ring-active-work" : ""
          }`}
          onClick={() => setShowDetail(true)}
        >
          {/* Status Bar */}
          <div className={`h-1 -mx-3 -mt-3 mb-2 rounded-t ${statusColors[task.status]}`} />

          {/* Compact Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{task.task_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {task.part.job.job_number} / {task.part.part_number}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {task.part.parent_part_id && (
                <Badge variant="outline" className="text-xs p-1">
                  <Package className="h-3 w-3" />
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-xs p-1">
                  <AlertTriangle className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>

          {/* Compact Info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{task.actual_time || 0}/{task.estimated_time}m</span>
            </div>
            {task.active_time_entry && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-active-work animate-pulse" />
                <span className="text-xs font-medium truncate max-w-20">
                  {task.active_time_entry.operator.full_name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </Card>

        <TaskDetailModal
          task={task}
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
        className={`p-4 cursor-pointer transition-all hover:shadow-md ${
          task.active_time_entry ? "ring-2 ring-active-work" : ""
        }`}
        onClick={() => setShowDetail(true)}
      >
        {/* Status Bar */}
        <div className={`h-1 -mx-4 -mt-4 mb-3 rounded-t ${statusColors[task.status]}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              Job {task.part.job.job_number}
            </div>
            <div className="text-xs text-muted-foreground">
              {task.part.part_number}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {task.part.parent_part_id && (
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Assy
              </Badge>
            )}
            {pendingCount > 0 && highestSeverity && (
              <Badge
                variant="outline"
                className="text-xs border-issue-critical"
                style={{
                  borderColor: `hsl(var(--issue-${highestSeverity}))`,
                  color: `hsl(var(--issue-${highestSeverity}))`,
                }}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {pendingCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Task Name */}
        <h4 className="font-medium mb-2">{task.task_name}</h4>

        {/* Assignment Badge */}
        {isAssignedToMe && (
          <Badge variant="secondary" className="text-xs mb-2">
            Assigned to You
          </Badge>
        )}

        {/* Time Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {task.actual_time || 0}/{task.estimated_time}m
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
            Due: {format(new Date(dueDate), "MMM d, yyyy")}
          </div>
        )}

        {/* Active Operator */}
        {task.active_time_entry && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <div className="h-2 w-2 rounded-full bg-active-work animate-pulse" />
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium">
              {task.active_time_entry.operator.full_name}
            </span>
          </div>
        )}
      </Card>

      <TaskDetailModal
        task={task}
        open={showDetail}
        onOpenChange={setShowDetail}
        onUpdate={onUpdate}
      />
    </>
  );
}
