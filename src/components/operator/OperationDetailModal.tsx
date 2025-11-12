import { useState } from "react";
import { OperationWithDetails, startTimeTracking, stopTimeTracking, completeOperation } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Play, Square, CheckCircle, Package, AlertCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import MetadataDisplay from "@/components/ui/MetadataDisplay";
import IssueForm from "./IssueForm";

interface OperationDetailModalProps {
  operation: OperationWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function OperationDetailModal({
  operation,
  open,
  onOpenChange,
  onUpdate,
}: OperationDetailModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showAssemblyWarning, setShowAssemblyWarning] = useState(false);
  const [incompleteChildren, setIncompleteChildren] = useState<string[]>([]);

  const isCurrentUserTiming = operation.active_time_entry?.operator_id === profile?.id;
  const canStartTiming = !operation.active_time_entry && operation.status !== "completed";
  const canComplete = operation.status !== "completed" && !operation.active_time_entry;
  const canReportIssue = isCurrentUserTiming;

  const checkAssemblyDependencies = async () => {
    if (!profile?.tenant_id) return true;

    // Check if this part has children
    const { data: children } = await supabase
      .from("parts")
      .select("id, part_number, status")
      .eq("parent_part_id", operation.part.id)
      .eq("tenant_id", profile.tenant_id);

    if (!children || children.length === 0) {
      return true; // No children, proceed
    }

    const incomplete = children
      .filter(c => c.status !== "completed")
      .map(c => c.part_number);

    if (incomplete.length > 0) {
      setIncompleteChildren(incomplete);
      setShowAssemblyWarning(true);
      return false;
    }

    return true;
  };

  const handleStartTiming = async () => {
    if (!profile?.id || !profile?.tenant_id) return;

    // Check assembly dependencies first
    const canProceed = await checkAssemblyDependencies();
    if (!canProceed) return;

    setLoading(true);
    try {
      await startTimeTracking(operation.id, profile.id, profile.tenant_id);
      toast.success("Time tracking started");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to start time tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnyway = async () => {
    setShowAssemblyWarning(false);
    if (!profile?.id || !profile?.tenant_id) return;

    setLoading(true);
    try {
      await startTimeTracking(operation.id, profile.id, profile.tenant_id);
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
      await stopTimeTracking(operation.id, profile.id);
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
      await completeOperation(operation.id, profile.tenant_id);
      toast.success("Operation marked as complete");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete operation");
    } finally {
      setLoading(false);
    }
  };

  const dueDate = operation.part.job.due_date_override || operation.part.job.due_date;
  const remainingTime = operation.estimated_time - (operation.actual_time || 0);
  const isOvertime = remainingTime < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{operation.operation_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job & Part Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Job</div>
              <div className="font-semibold">{operation.part.job.job_number}</div>
              {operation.part.job.customer && (
                <div className="text-sm text-muted-foreground">
                  {operation.part.job.customer}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Part</div>
              <div className="font-semibold">{operation.part.part_number}</div>
              <div className="text-sm text-muted-foreground">
                {operation.part.material} • Qty: {operation.part.quantity}
              </div>
            </div>
          </div>

          <Separator />

          {/* Cell & Status */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Cell</div>
              <Badge
                style={{
                  backgroundColor: operation.cell.color || "hsl(var(--cell-default))",
                  color: "white",
                }}
              >
                {operation.cell.name}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <Badge variant="outline" className="capitalize">
                {operation.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Estimated</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {operation.estimated_time}m
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Actual</div>
              <div className="text-lg font-semibold">{operation.actual_time || 0}m</div>
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
          {operation.part.parent_part_id && (
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
          {operation.active_time_entry && !isCurrentUserTiming && (
            <div className="flex items-center gap-2 p-3 bg-active-work/10 border border-active-work/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-active-work" />
              <div className="text-sm">
                <span className="font-medium">{operation.active_time_entry.operator.full_name}</span>
                {" "}is currently working on this operation
              </div>
            </div>
          )}

          {/* Notes */}
          {operation.notes && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Notes</div>
              <div className="text-sm p-3 bg-muted rounded">{operation.notes}</div>
            </div>
          )}

          {/* Metadata */}
          {(operation as any).metadata && (
            <MetadataDisplay metadata={(operation as any).metadata} />
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            {canReportIssue && (
              <Button
                onClick={() => setShowIssueForm(true)}
                variant="outline"
                size="lg"
                className="w-full h-12 text-base gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <AlertTriangle className="h-5 w-5" />
                Report Issue
              </Button>
            )}
            
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
        </div>
      </DialogContent>
      
      <IssueForm
        operationId={operation.id}
        open={showIssueForm}
        onOpenChange={setShowIssueForm}
        onSuccess={onUpdate}
      />

      <AlertDialog open={showAssemblyWarning} onOpenChange={setShowAssemblyWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-issue-high" />
              Assembly Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is an assembly. Not all component parts are complete.
              <div className="mt-3">
                <div className="text-sm font-medium text-foreground mb-2">Incomplete components:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {incompleteChildren.map(part => (
                    <li key={part}>{part}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartAnyway}>
              Start Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
