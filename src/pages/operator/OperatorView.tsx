import { useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { useOperatorTerminal } from "@/hooks/useOperatorTerminal";
import { useKeyboardWedgeScanner } from "@/hooks/useKeyboardWedgeScanner";
import { useOperator } from "@/contexts/OperatorContext";
import { useLocationTracking } from "@/hooks/locations/useLocationTracking";
import { useRecordPlacement } from "@/hooks/locations/useRecordPlacement";
import { PlacementPickerModal } from "@/components/locations/PlacementPickerModal";
import { OperatorWorkQueue } from "@/components/operator/OperatorWorkQueue";
import { OperatorDetailSidebar } from "@/components/operator/OperatorDetailSidebar";
import { OperatorModeBanner } from "@/components/operator/OperatorModeBanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OperatorView() {
  const { t } = useTranslation();
  // Resolve the portal target after commit — reading it during render races the
  // layout's own render, so on cached-chunk loads the slot isn't in the DOM yet
  // and the cell selector silently never mounts.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHeaderSlot(document.getElementById("terminal-header-slot"));
  }, []);

  const {
    containerRef,
    collapsed,
    setCollapsed,
    leftPanelWidth,
    isDragging,
    handleMouseDown,
    handleTouchStart,
  } = useResizablePanel();

  const {
    loading,
    cells,
    workModeSettings,
    currentTerminalMode,
    setSelectedTerminalMode,
    workingHoursActive,
    terminalModeCounts,
    selectedCellId,
    handleCellChange,
    filteredJobs,
    inProcessJobs,
    inBufferJobs,
    expectedJobs,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    selectedPartOperations,
    selectedBatchPrompt,
    selectBatchMode,
    startActionLabel,
    pauseActionLabel,
    showCompleteAction,
    pdfUrl,
    stepUrl,
    pmiData,
    geometryData,
    scanFeedback,
    setScanFeedback,
    handleScannerToken,
    handleStart,
    handlePause,
    handleComplete,
    loadData,
  } = useOperatorTerminal();

  const { activeOperator } = useOperator();
  const { enabled: locationTrackingEnabled } = useLocationTracking();
  const { recordPlacement, isRecording } = useRecordPlacement();

  // When location tracking is on, completing an operation opens the placement
  // picker for the part the operator just finished. With tracking off the
  // complete flow is unchanged.
  const [placementTarget, setPlacementTarget] = useState<{
    partId: string;
    operationId: string;
    cellId: string | null;
    nextCellName: string | null;
  } | null>(null);

  const handleCompleteWithPlacement = useCallback(async () => {
    const job = selectedJob;
    await handleComplete();
    if (locationTrackingEnabled && job) {
      // The drop-off slot belongs to the cell the part heads to next, so the
      // next operator finds it — scope the picker to that cell, not this one.
      const sorted = [...selectedPartOperations].sort(
        (a, b) => a.sequence - b.sequence,
      );
      const currentIndex = sorted.findIndex((op) => op.id === job.operationId);
      const nextOp =
        currentIndex >= 0 && currentIndex < sorted.length - 1
          ? sorted[currentIndex + 1]
          : null;
      setPlacementTarget({
        partId: job.partId,
        operationId: job.operationId,
        cellId: nextOp?.cell_id ?? job.cellId ?? null,
        nextCellName: nextOp?.cell?.name ?? null,
      });
    }
  }, [selectedJob, selectedPartOperations, handleComplete, locationTrackingEnabled]);

  const handleConfirmPlacement = useCallback(
    (locationId: string) => {
      if (!placementTarget) return;
      recordPlacement(
        {
          partId: placementTarget.partId,
          locationId,
          operationId: placementTarget.operationId,
          operatorId: activeOperator?.id ?? null,
        },
        {
          onSuccess: () => setPlacementTarget(null),
        },
      );
    },
    [placementTarget, recordPlacement, activeOperator?.id],
  );

  useKeyboardWedgeScanner({
    onScan: handleScannerToken,
  });

  const scanFeedbackMessage = scanFeedback
    ? scanFeedback.kind === "success"
      ? t("terminal.scanner.success", {
          token: scanFeedback.token,
          operation: scanFeedback.operationLabel,
        })
      : t(`terminal.scanner.errors.${scanFeedback.reason}`, {
          token: scanFeedback.token,
          operation: scanFeedback.operationLabel,
          count: scanFeedback.matchCount,
          operator: scanFeedback.activeOperatorName,
        })
    : null;

  // On phones the desktop split-pane is unreadable. Show one pane at a time:
  // the queue full-width, and the selected job's detail full-width with a Back.
  const isMobile = useIsMobile();
  const showQueue = !isMobile || !selectedJob;
  const showDetail = !isMobile || Boolean(selectedJob);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full bg-background font-sans text-foreground md:h-[calc(100vh-160px)] md:overflow-hidden",
        !isMobile && "h-[calc(100vh-160px)] overflow-hidden",
        isDragging && "cursor-col-resize select-none",
      )}
    >
      {/* Portal cell selector into the top header bar */}
      {headerSlot
        ? createPortal(
            <div className="flex items-center gap-2">
              <Select value={selectedCellId} onValueChange={handleCellChange}>
                <SelectTrigger className="h-8 w-[180px] border-input bg-card text-sm text-foreground">
                  <SelectValue placeholder={t("terminal.selectCell", "Select Cell")} />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  <SelectItem value="all">
                    {t("terminal.allCells", "All Cells")}
                  </SelectItem>
                  {cells.map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {filteredJobs.length} {t("terminal.jobsFound")}
              </span>
            </div>,
            headerSlot,
          )
        : null}

      {/* Loading overlay */}
      {loading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="animate-pulse font-medium text-primary">
              {t("terminal.loading", "Loading Terminal Data...")}
            </p>
          </div>
        </div>
      ) : null}

      {/* Left panel (queue) */}
      {showQueue ? (
      <div
        className="flex flex-col border-r border-border transition-all duration-200"
        style={{ width: isMobile ? "100%" : collapsed ? "100%" : `${leftPanelWidth}%` }}
      >
        {scanFeedbackMessage ? (
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <div
              role={scanFeedback.kind === "error" ? "alert" : "status"}
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                scanFeedback.kind === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p>{scanFeedbackMessage}</p>
                <button
                  type="button"
                  className="text-xs font-medium uppercase tracking-wide opacity-70 transition-opacity hover:opacity-100"
                  onClick={() => setScanFeedback(null)}
                >
                  {t("common.dismiss", "Dismiss")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <OperatorModeBanner
          settings={workModeSettings}
          currentMode={currentTerminalMode}
          workingHoursActive={workingHoursActive}
          counts={terminalModeCounts}
          onModeChange={setSelectedTerminalMode}
        />
        <OperatorWorkQueue
          inProcessJobs={inProcessJobs}
          inBufferJobs={inBufferJobs}
          expectedJobs={expectedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
        />
      </div>
      ) : null}

      {/* Resizable divider (desktop only) */}
      {!collapsed && !isMobile ? (
        <div
          className={cn(
            "group relative z-20 flex w-1 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-primary/50",
            isDragging && "bg-primary/50",
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      ) : null}

      {/* Right panel (detail) */}
      {showDetail ? (
      <div
        className={cn(
          "z-10 flex flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-200",
          !isMobile && collapsed ? "w-10" : "",
        )}
        style={{
          width: isMobile ? "100%" : collapsed ? "40px" : `${100 - leftPanelWidth}%`,
        }}
      >
        {isMobile ? (
          <button
            type="button"
            onClick={() => setSelectedJobId(null)}
            className="flex items-center gap-1 border-b border-border px-4 py-3 text-sm font-medium text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.back", "Back")}
          </button>
        ) : null}
        <OperatorDetailSidebar
          collapsed={!isMobile && collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          selectedJob={selectedJob}
          onStart={handleStart}
          onPause={handlePause}
          onComplete={handleCompleteWithPlacement}
          startActionLabel={startActionLabel}
          pauseActionLabel={pauseActionLabel}
          showCompleteAction={showCompleteAction}
          batchPrompt={selectedBatchPrompt}
          onSelectBatchMode={selectBatchMode}
          stepUrl={stepUrl}
          pdfUrl={pdfUrl}
          pmiData={pmiData}
          serverGeometry={geometryData}
          operations={selectedPartOperations}
          onDataRefresh={() => void loadData()}
          locationTrackingEnabled={locationTrackingEnabled}
        />
      </div>
      ) : null}

      {/* Only mount the placement picker when location tracking is on. The module
          is off by default, and the modal eagerly queries storage_locations /
          part_placements on mount — keep it out of the tree so a terminal with
          tracking disabled never touches the location queries. */}
      {locationTrackingEnabled ? (
        <PlacementPickerModal
          open={placementTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPlacementTarget(null);
          }}
          cellId={placementTarget?.cellId ?? null}
          nextCellName={placementTarget?.nextCellName ?? null}
          isRecording={isRecording}
          onConfirm={handleConfirmPlacement}
        />
      ) : null}
    </div>
  );
}
