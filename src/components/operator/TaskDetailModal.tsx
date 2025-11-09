import { useState } from "react";
import { TaskWithDetails, startTimeTracking, stopTimeTracking, completeTask } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Play, Square, CheckCircle, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TaskDetailModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const isCurrentUserTiming = task.active_time_entry?.operator_id === profile?.id;
  const canStartTiming = !task.active_time_entry && task.status !== "completed";
  const canComplete = task.status !== "completed" && !task.active_time_entry;

  const handleStartTiming = async () => {
    if (!profile?.id || !profile?.tenant_id) return;

    setLoading(true);
    try {
      await startTimeTracking(task.id, profile.id, profile.tenant_id);
      toast.success("Time tracking started");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to start time tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleStopTiming = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      await stopTimeTracking(task.id, profile.id);
      toast.success("Time tracking stopped");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to stop time tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      await completeTask(task.id, profile.tenant_id);
      toast.success("Task marked as complete");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete task");
    } finally {
      setLoading(false);
    }
  };

  const dueDate = task.part.job.due_date_override || task.part.job.due_date;
  const remainingTime = task.estimated_time - (task.actual_time || 0);
  const isOvertime = remainingTime < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.task_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job & Part Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Job</div>
              <div className="font-semibold">{task.part.job.job_number}</div>
              {task.part.job.customer && (
                <div className="text-sm text-muted-foreground">
                  {task.part.job.customer}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Part</div>
              <div className="font-semibold">{task.part.part_number}</div>
              <div className="text-sm text-muted-foreground">
                {task.part.material} • Qty: {task.part.quantity}
              </div>
            </div>
          </div>

          <Separator />

          {/* Stage & Status */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Stage</div>
              <Badge
                style={{
                  backgroundColor: task.stage.color || "hsl(var(--stage-default))",
                  color: "white",
                }}
              >
                {task.stage.name}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <Badge variant="outline" className="capitalize">
                {task.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Estimated</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {task.estimated_time}m
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Actual</div>
              <div className="text-lg font-semibold">{task.actual_time || 0}m</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Remaining</div>
              <div
                className={`text-lg font-semibold ${
                  isOvertime ? "text-destructive" : ""
                }`}
              >
                {isOvertime ? "+" : ""}
                {Math.abs(remainingTime)}m
              </div>
            </div>
          </div>

          {/* Due Date */}
          {dueDate && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Due Date</div>
              <div className="font-medium">{format(new Date(dueDate), "PPP")}</div>
            </div>
          )}

          {/* Assembly Warning */}
          {task.part.parent_part_id && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <Package className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-900 dark:text-amber-100">
                  Assembly Part
                </div>
                <div className="text-amber-700 dark:text-amber-300">
                  This part is part of an assembly. Check dependencies before starting.
                </div>
              </div>
            </div>
          )}

          {/* Active Operator */}
          {task.active_time_entry && !isCurrentUserTiming && (
            <div className="flex items-center gap-2 p-3 bg-active-work/10 border border-active-work/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-active-work" />
              <div className="text-sm">
                <span className="font-medium">{task.active_time_entry.operator.full_name}</span>
                {" "}is currently working on this task
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Notes</div>
              <div className="text-sm p-3 bg-muted rounded">{task.notes}</div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            {canStartTiming && (
              <Button
                onClick={handleStartTiming}
                disabled={loading}
                size="lg"
                className="flex-1 h-14 text-lg gap-2"
              >
                <Play className="h-5 w-5" />
                Start Time
              </Button>
            )}

            {isCurrentUserTiming && (
              <Button
                onClick={handleStopTiming}
                disabled={loading}
                variant="destructive"
                size="lg"
                className="flex-1 h-14 text-lg gap-2"
              >
                <Square className="h-5 w-5" />
                Stop Time
              </Button>
            )}

            {canComplete && (
              <Button
                onClick={handleComplete}
                disabled={loading}
                variant="default"
                size="lg"
                className="flex-1 h-14 text-lg gap-2 bg-completed hover:bg-completed/90"
              >
                <CheckCircle className="h-5 w-5" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
