import { useState, useEffect } from "react";
import {
  OperationWithDetails,
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
} from "@/lib/database";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Play,
  Square,
  CheckCircle,
  Package,
  AlertCircle,
  AlertTriangle,
  Box,
  FileText,
  Eye,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedMetadataDisplay } from "@/components/ui/EnhancedMetadataDisplay";
import { FlowCell } from "@/components/FlowCell";
import IssueForm from "./IssueForm";
import { STEPViewer } from "@/components/STEPViewerLazy";
import { PDFViewer } from "@/components/PDFViewerLazy";
import SubstepsManager from "./SubstepsManager";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";

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
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [loading, setLoading] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showAssemblyWarning, setShowAssemblyWarning] = useState(false);
  const [incompleteChildren, setIncompleteChildren] = useState<string[]>([]);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileType, setCurrentFileType] = useState<"step" | "pdf" | null>(
    null,
  );
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("");
  const [requiredResources, setRequiredResources] = useState<any[]>([]);

  const isCurrentUserTiming =
    operation.active_time_entry?.operator_id === operatorId;
  const canStartTiming =
    !operation.active_time_entry && operation.status !== "completed";
  const canComplete =
    operation.status !== "completed" && !operation.active_time_entry;
  const canReportIssue = operation.status !== "completed";

  useEffect(() => {
    const fetchResources = async () => {
      if (!operation.id) return;

      const { data, error } = await supabase
        .from("operation_resources")
        .select(
          `
          *,
          resource:resources(*)
        `,
        )
        .eq("operation_id", operation.id);

      if (!error && data) {
        setRequiredResources(data);
      }
    };

    fetchResources();
  }, [operation.id]);

  const checkAssemblyDependencies = async () => {
    if (!profile?.tenant_id) return true;

    const { data: children } = await supabase
      .from("parts")
      .select("id, part_number, status")
      .eq("parent_part_id", operation.part.id)
      .eq("tenant_id", profile.tenant_id);

    if (!children || children.length === 0) {
      return true; // No children, proceed
    }

    const incomplete = children
      .filter((c) => c.status !== "completed")
      .map((c) => c.part_number);

    if (incomplete.length > 0) {
      setIncompleteChildren(incomplete);
      setShowAssemblyWarning(true);
      return false;
    }

    return true;
  };

  const handleStartTiming = async () => {
    if (!operatorId || !profile?.tenant_id) return;

    const canProceed = await checkAssemblyDependencies();
    if (!canProceed) return;

    setLoading(true);
    try {
      await startTimeTracking(operation.id, operatorId, profile.tenant_id);
      toast.success(t("operations.timeTrackingStarted"));
      onUpdate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("operations.failedToStartTimeTracking"));
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnyway = async () => {
    setShowAssemblyWarning(false);
    if (!operatorId || !profile?.tenant_id) return;

    setLoading(true);
    try {
      await startTimeTracking(operation.id, operatorId, profile.tenant_id);
      toast.success(t("operations.timeTrackingStarted"));
      onUpdate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("operations.failedToStartTimeTracking"));
    } finally {
      setLoading(false);
    }
  };

  const handleStopTiming = async () => {
    if (!operatorId) return;

    setLoading(true);
    try {
      await stopTimeTracking(operation.id, operatorId);
      toast.success(t("operations.timeTrackingStopped"));
      onUpdate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("operations.failedToStopTimeTracking"));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      await completeOperation(operation.id, profile.tenant_id);
      toast.success(t("operations.operationComplete"));
      onUpdate();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("operations.failedToComplete"));
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (filePath: string) => {
    try {
      const fileExt = filePath.split(".").pop()?.toLowerCase();
      const fileType =
        fileExt === "pdf"
          ? "pdf"
          : fileExt === "step" || fileExt === "stp"
            ? "step"
            : null;

      if (!fileType) {
        toast.error(t("operations.unsupportedFileType"));
        return;
      }

      const { data, error } = await supabase.storage
        .from("parts-cad")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

      // For STEP files, fetch as blob to avoid CORS issues
      let viewUrl = data.signedUrl;
      if (fileType === "step") {
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        viewUrl = URL.createObjectURL(blob);
      }

      const fileName = filePath.split("/").pop() || "File";
      setCurrentFileUrl(viewUrl);
      setCurrentFileType(fileType);
      setCurrentFileTitle(fileName);
      setFileViewerOpen(true);
    } catch (error: unknown) {
      logger.error("OperationDetailModal", "Error opening file", error);
      toast.error(t("operations.failedToOpenFile"));
    }
  };

  const handleFileDialogClose = (open: boolean) => {
    if (!open && currentFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(currentFileUrl); // Prevent memory leak
      setCurrentFileUrl(null);
    }
    setFileViewerOpen(open);
  };

  const dueDate =
    operation.part.job.due_date_override || operation.part.job.due_date;
  const remainingTime = operation.estimated_time - (operation.actual_time || 0);
  const isOvertime = remainingTime < 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col glass-card border-l border-white/10"
      >
        <div className="flex-shrink-0 border-b border-white/10 bg-background/95 backdrop-blur-sm">
          <SheetHeader className="p-4">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold truncate">
                  {operation.operation_name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">{t("operations.job")} {operation.part.job.job_number}</span>
                  <span>•</span>
                  <span>{operation.part.part_number}</span>
                </div>
              </div>
              <Badge
                style={{
                  backgroundColor: operation.cell.color || "hsl(var(--cell-default))",
                  color: "white",
                }}
                className="shrink-0"
              >
                {operation.cell.name}
              </Badge>
            </div>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-2 px-4 pb-3">
            <div className="bg-muted/50 rounded-md p-2 text-center">
              <div className="text-xs text-muted-foreground">{t("operations.estimated")}</div>
              <div className="text-sm font-semibold flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                {operation.estimated_time}m
              </div>
            </div>
            <div className="bg-muted/50 rounded-md p-2 text-center">
              <div className="text-xs text-muted-foreground">{t("operations.actual")}</div>
              <div className="text-sm font-semibold">{operation.actual_time || 0}m</div>
            </div>
            <div className="bg-muted/50 rounded-md p-2 text-center">
              <div className="text-xs text-muted-foreground">{t("operations.remaining")}</div>
              <div className={`text-sm font-semibold ${isOvertime ? "text-destructive" : ""}`}>
                {isOvertime ? "+" : ""}{Math.abs(remainingTime)}m
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-md p-3">
                <div className="text-xs text-muted-foreground mb-0.5">{t("operations.part")}</div>
                <div className="font-medium text-sm">{operation.part.part_number}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {operation.part.material} • {t("operations.qty")}: {operation.part.quantity}
                </div>
              </div>
              <div className="bg-muted/30 rounded-md p-3">
                <div className="text-xs text-muted-foreground mb-0.5">{t("operations.statusLabel")}</div>
                <Badge variant="outline" className="capitalize text-xs">
                  {operation.status.replace("_", " ")}
                </Badge>
                {dueDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("operations.dueDate")}: {format(new Date(dueDate), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            </div>

            {/* Quick controls: Rush + Hold */}
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const newVal = !operation.part.is_bullet_card;
                  await supabase.from("parts").update({ is_bullet_card: newVal }).eq("id", operation.part.id);
                  toast.success(newVal ? t("operations.rushEnabled", "Rush ingeschakeld") : t("operations.rushDisabled", "Rush uitgeschakeld"));
                  onUpdate();
                }}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors",
                  operation.part.is_bullet_card
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                )}
              >
                ⚡ Rush
              </button>
              <button
                onClick={async () => {
                  const newStatus = operation.status === "on_hold" ? "not_started" : "on_hold";
                  await supabase.from("operations").update({ status: newStatus }).eq("id", operation.id);
                  toast.success(newStatus === "on_hold" ? t("operations.onHold", "On hold gezet") : t("operations.resumed", "Hervat"));
                  onUpdate();
                }}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors",
                  operation.status === "on_hold"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                )}
              >
                {operation.status === "on_hold" ? "▶ Hervatten" : "⏸ On Hold"}
              </button>
            </div>

            {typeof operation.part.job.customer === "string" && operation.part.job.customer && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                {operation.part.job.customer}
              </div>
            )}

            {/* Routing visualization */}
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("operations.routing", "Route")}
              </div>
              <FlowCell jobId={operation.part.job.id} />
            </div>

            {operation.part.parent_part_id && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
                <Package className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-medium text-amber-900 dark:text-amber-100">
                    {t("operations.assemblyPart")}
                  </div>
                  <div className="text-amber-700 dark:text-amber-300">
                    {t("operations.assemblyWarning")}
                  </div>
                </div>
              </div>
            )}

            {operation.active_time_entry && !isCurrentUserTiming && (
              <div className="flex items-center gap-2 p-2.5 bg-active-work/10 border border-active-work/30 rounded-md">
                <AlertCircle className="h-4 w-4 text-active-work shrink-0" />
                <div className="text-xs">
                  <span className="font-medium">
                    {operation.active_time_entry.operator.full_name}
                  </span>{" "}
                  {t("operations.currentlyWorking")}
                </div>
              </div>
            )}

            {typeof operation.notes === "string" && operation.notes && (
              <div className="bg-muted/30 rounded-md p-3">
                <div className="text-xs text-muted-foreground mb-1">{t("operations.notes")}</div>
                <div className="text-sm">{operation.notes}</div>
              </div>
            )}

            {(operation as any).metadata && (
              <EnhancedMetadataDisplay
                metadata={(operation as any).metadata}
                title="Process Settings"
                showTypeIndicator={true}
                compact={true}
              />
            )}

            {requiredResources.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  {t("operations.requiredResources")}
                </div>
                <div className="space-y-2">
                  {requiredResources.map((opResource: any) => (
                    <div
                      key={opResource.id}
                      className="border rounded-md p-3 bg-card/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="font-medium text-sm truncate">
                              {opResource.resource.name}
                            </p>
                            {opResource.quantity > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                ×{opResource.quantity}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <p className="capitalize">{t("operations.type")}: {opResource.resource.type.replace("_", " ")}</p>
                            {opResource.resource.identifier && (
                              <p>ID: {opResource.resource.identifier}</p>
                            )}
                            {opResource.resource.location && (
                              <p>{t("operations.location")}: {opResource.resource.location}</p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            opResource.resource.status === "available"
                              ? "default"
                              : opResource.resource.status === "in_use"
                              ? "secondary"
                              : opResource.resource.status === "maintenance"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-[10px] capitalize shrink-0"
                        >
                          {opResource.resource.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {opResource.notes && (
                        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-2 mt-2">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              {opResource.notes}
                            </p>
                          </div>
                        </div>
                      )}

                      {opResource.resource.metadata && (
                        <div className="mt-2">
                          <EnhancedMetadataDisplay
                            metadata={opResource.resource.metadata}
                            compact={true}
                            showTypeIndicator={false}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {operation.part.file_paths && operation.part.file_paths.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2 text-muted-foreground">
                  {t("operations.files")}
                </div>
                <div className="space-y-1.5">
                  {operation.part.file_paths.map((filePath: string, index: number) => {
                    const fileName = filePath.split("/").pop() || "Unknown";
                    const fileExt = filePath.split(".").pop()?.toLowerCase();
                    const isSTEP = fileExt === "step" || fileExt === "stp";
                    const isPDF = fileExt === "pdf";

                    if (!isSTEP && !isPDF) return null;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between border rounded-md p-2 bg-muted/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSTEP ? (
                            <Box className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate">{fileName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {isSTEP ? t("operations.3dModel") : t("operations.drawing")}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewFile(filePath)}
                          className="h-7 text-xs shrink-0"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {t("operations.view")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <SubstepsManager
              operationId={operation.id}
              operationName={operation.operation_name}
              onUpdate={onUpdate}
            />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/10 p-4 bg-background/95 backdrop-blur-sm space-y-2">
          {canReportIssue && (
            <Button
              onClick={() => setShowIssueForm(true)}
              variant="outline"
              size="sm"
              className="w-full h-9 text-sm gap-1.5 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
            >
              <AlertTriangle className="h-4 w-4" />
              {t("operations.reportIssue")}
            </Button>
          )}

          <div className="flex gap-2">
            {canStartTiming && (
              <Button
                onClick={handleStartTiming}
                disabled={loading}
                size="lg"
                className="flex-1 h-12 text-base gap-2"
                data-tour="start-timer"
              >
                <Play className="h-5 w-5" />
                {t("operations.startTime")}
              </Button>
            )}

            {isCurrentUserTiming && (
              <Button
                onClick={handleStopTiming}
                disabled={loading}
                variant="destructive"
                size="lg"
                className="flex-1 h-12 text-base gap-2"
              >
                <Square className="h-5 w-5" />
                {t("operations.stopTime")}
              </Button>
            )}

            {canComplete && (
              <Button
                onClick={handleComplete}
                disabled={loading}
                variant="default"
                size="lg"
                className="flex-1 h-12 text-base gap-2 bg-completed hover:bg-completed/90"
              >
                <CheckCircle className="h-5 w-5" />
                {t("operations.markComplete")}
              </Button>
            )}
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground"
          >
            {t("operations.close") || "Close"}
          </Button>
        </div>
      </SheetContent>

      <IssueForm
        operationId={operation.id}
        open={showIssueForm}
        onOpenChange={setShowIssueForm}
        onSuccess={onUpdate}
      />

      <AlertDialog
        open={showAssemblyWarning}
        onOpenChange={setShowAssemblyWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-issue-high" />
              {t("operations.assemblyWarningTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("operations.assemblyWarningDescription")}
              <div className="mt-3">
                <div className="text-sm font-medium text-foreground mb-2">
                  {t("operations.incompleteComponents")}:
                </div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {incompleteChildren.map((part) => (
                    <li key={part}>{part}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("operations.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartAnyway}>
              {t("operations.startAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={fileViewerOpen} onOpenChange={handleFileDialogClose}>
        <DialogContent className="w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl flex flex-col p-0 gap-0 border-0 bg-transparent shadow-2xl rounded-none sm:rounded-xl overflow-hidden inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <div className="relative flex-1 min-h-0 bg-background sm:rounded-xl overflow-hidden">
            <div className="absolute top-2 left-3 z-10 max-w-[60%]">
              <span className="text-[11px] text-muted-foreground/70 font-medium truncate block">{currentFileTitle}</span>
            </div>
            <DialogTitle className="sr-only">{currentFileTitle}</DialogTitle>
            {currentFileUrl && currentFileType === "step" && (
              <STEPViewer url={currentFileUrl} title={currentFileTitle} />
            )}
            {currentFileUrl && currentFileType === "pdf" && (
              <PDFViewer url={currentFileUrl} title={currentFileTitle} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
