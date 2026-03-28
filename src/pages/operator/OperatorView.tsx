import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { useOperatorTerminal } from "@/hooks/useOperatorTerminal";
import { OperatorViewHeader } from "@/components/operator/OperatorViewHeader";
import { OperatorWorkQueue } from "@/components/operator/OperatorWorkQueue";
import { OperatorDetailSidebar } from "@/components/operator/OperatorDetailSidebar";

export default function OperatorView() {
  const { t } = useTranslation();

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
    pdfUrl,
    stepUrl,
    pmiData,
    geometryData,
    handleStart,
    handlePause,
    handleComplete,
    loadData,
  } = useOperatorTerminal();

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-[calc(100vh-160px)] w-full overflow-hidden bg-background font-sans text-foreground",
        isDragging && "cursor-col-resize select-none",
      )}
    >
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

      {/* Left panel */}
      <div
        className="flex flex-col border-r border-border transition-all duration-200"
        style={{ width: collapsed ? "100%" : `${leftPanelWidth}%` }}
      >
        <OperatorViewHeader
          cells={cells}
          selectedCellId={selectedCellId}
          onCellChange={handleCellChange}
          jobCount={filteredJobs.length}
        />
        <OperatorWorkQueue
          inProcessJobs={inProcessJobs}
          inBufferJobs={inBufferJobs}
          expectedJobs={expectedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
        />
      </div>

      {/* Resizable divider */}
      {!collapsed ? (
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

      {/* Right panel */}
      <div
        className={cn(
          "z-10 flex flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-200",
          collapsed ? "w-10" : "",
        )}
        style={{
          width: collapsed ? "40px" : `${100 - leftPanelWidth}%`,
        }}
      >
        <OperatorDetailSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          selectedJob={selectedJob}
          onStart={handleStart}
          onPause={handlePause}
          onComplete={handleComplete}
          stepUrl={stepUrl}
          pdfUrl={pdfUrl}
          pmiData={pmiData}
          serverGeometry={geometryData}
          operations={selectedPartOperations}
          onDataRefresh={() => void loadData()}
        />
      </div>
    </div>
  );
}
