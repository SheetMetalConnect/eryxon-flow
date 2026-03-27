import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useCADProcessing,
  isCADServiceEnabled,
  type PMIData,
  type GeometryData,
} from "@/hooks/useCADProcessing";
import {
  fetchOperationsWithDetails,
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
  type OperationWithDetails,
} from "@/lib/database";
import { JobRow } from "@/components/terminal/JobRow";
import { DetailPanel } from "@/components/terminal/DetailPanel";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { TerminalJob } from "@/types/terminal";

interface Cell {
  id: string;
  name: string;
  color: string | null;
}

export default function OperatorView() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>(
    () => localStorage.getItem("operator_selected_cell") || "all",
  );
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [pmiData, setPmiData] = useState<PMIData | null>(null);
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null);

  const { processCAD } = useCADProcessing();

  /* ── Resizable / collapsible right panel ── */
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, 40), 85));
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((touch.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, 40), 85));
    },
    [isDragging],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  /* ── Data loading ── */
  const loadData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      const [opsData, cellsData] = await Promise.all([
        fetchOperationsWithDetails(profile.tenant_id),
        supabase
          .from("cells")
          .select("id, name, color")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
      ]);

      setOperations(opsData);
      if (cellsData.data) setCells(cellsData.data);
    } catch (error) {
      logger.error("OperatorView", "Error loading data", error);
      toast.error(t("notifications.failedToLoadData"));
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, t]);

  useEffect(() => {
    void loadData();

    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel("operator-terminal-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void loadData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, profile?.tenant_id]);

  const handleCellChange = (value: string) => {
    setSelectedCellId(value);
    localStorage.setItem("operator_selected_cell", value);
    setSelectedJobId(null);
  };

  /* ── Map operations → terminal jobs ── */
  const mapOperationToJob = useCallback(
    (op: OperationWithDetails): TerminalJob => {
      const hasPdf =
        op.part.file_paths?.some((path) =>
          path.toLowerCase().endsWith(".pdf"),
        ) || false;
      const hasModel =
        op.part.file_paths?.some((path) => {
          const lp = path.toLowerCase();
          return lp.endsWith(".step") || lp.endsWith(".stp");
        }) || false;

      let status: TerminalJob["status"] = "expected";
      if (op.status === "in_progress") status = "in_progress";
      else if (op.status === "on_hold") status = "on_hold";
      else if (op.status === "not_started") status = "in_buffer";
      else if (op.status === "completed") status = "expected";

      if (op.active_time_entry) status = "in_progress";

      const estimated = op.estimated_time || 0;
      const actual = op.actual_time || 0;
      const remaining = Math.max(0, estimated - actual);

      // Defensively coerce database values to expected primitives.
      // Supabase SELECT * can include JSON/unknown columns that would
      // crash React if accidentally rendered as JSX children (error #185).
      return {
        id: op.id,
        operationId: op.id,
        partId: op.part.id,
        jobId: op.part.job.id,
        jobCode: String(op.part.job.job_number ?? ""),
        description: String(op.part.part_number ?? ""),
        material: typeof op.part.material === "string" ? op.part.material : "",
        quantity: Number(op.part.quantity) || 0,
        currentOp: String(op.operation_name ?? ""),
        totalOps: 0,
        hours: Number(remaining.toFixed(1)),
        dueDate: typeof op.part.job.due_date === "string"
          ? op.part.job.due_date
          : new Date().toISOString(),
        status,
        hasPdf,
        hasModel,
        filePaths: Array.isArray(op.part.file_paths) ? op.part.file_paths : [],
        activeTimeEntryId: op.active_time_entry?.id,
        activeOperatorId: op.active_time_entry?.operator_id,
        activeOperatorName: typeof op.active_time_entry?.operator?.full_name === "string"
          ? op.active_time_entry.operator.full_name
          : undefined,
        isCurrentUserClocked: op.active_time_entry?.operator_id === operatorId,
        notes: typeof op.notes === "string" ? op.notes : null,
        cellName: String(op.cell.name ?? ""),
        cellColor: typeof op.cell.color === "string" ? op.cell.color : "#3b82f6",
        cellId: op.cell_id,
        currentSequence: op.sequence,
        drawingNo: typeof op.part.drawing_no === "string" ? op.part.drawing_no : null,
        cncProgramName: typeof op.part.cnc_program_name === "string" ? op.part.cnc_program_name : null,
        isBulletCard: Boolean(op.part.is_bullet_card),
        plannedStart: typeof op.planned_start === "string" ? op.planned_start : null,
      };
    },
    [operatorId],
  );

  const allJobs = useMemo(
    () => operations.map(mapOperationToJob),
    [mapOperationToJob, operations],
  );

  const filteredJobs = useMemo(() => {
    if (selectedCellId === "all") return allJobs;
    return allJobs.filter((job) => job.cellId === selectedCellId);
  }, [allJobs, selectedCellId]);

  const inProcessJobs = filteredJobs.filter(
    (job) => job.status === "in_progress",
  );
  const notStartedJobs = filteredJobs.filter(
    (job) => job.status === "in_buffer" || job.status === "expected",
  );
  const inBufferJobs = notStartedJobs
    .slice(0, 5)
    .map((job) => ({ ...job, status: "in_buffer" as const }));
  const expectedJobs = notStartedJobs
    .slice(5)
    .map((job) => ({ ...job, status: "expected" as const }));

  const selectedJob = allJobs.find((job) => job.id === selectedJobId) || null;

  const selectedPartOperations = useMemo(() => {
    if (!selectedJob) return [];
    return operations
      .filter((op) => op.part.id === selectedJob.partId)
      .sort((a, b) => a.sequence - b.sequence);
  }, [selectedJob, operations]);

  /* ── File loading (PDF / STEP / CAD) ── */
  useEffect(() => {
    const loadFiles = async () => {
      if (!selectedJob?.filePaths?.length) {
        setPdfUrl(null);
        setStepUrl(null);
        setPmiData(null);
        setGeometryData(null);
        return;
      }

      try {
        let pdf: string | null = null;
        let step: string | null = null;
        let signedStep: string | null = null;
        let stepFileName: string | null = null;

        for (const path of selectedJob.filePaths) {
          const lp = path.toLowerCase();

          if (lp.endsWith(".pdf") && !pdf) {
            const { data } = await supabase.storage
              .from("parts-cad")
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) pdf = data.signedUrl;
          } else if (
            (lp.endsWith(".step") || lp.endsWith(".stp")) &&
            !step
          ) {
            const { data } = await supabase.storage
              .from("parts-cad")
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              signedStep = data.signedUrl;
              stepFileName = path.split("/").pop() || "model.step";
              const response = await fetch(data.signedUrl);
              const blob = await response.blob();
              step = URL.createObjectURL(blob);
            }
          }
        }

        setPdfUrl(pdf);
        setStepUrl(step);

        if (signedStep && stepFileName && isCADServiceEnabled()) {
          try {
            const result = await processCAD(signedStep, stepFileName, {
              includeGeometry: true,
              includePMI: true,
              generateThumbnail: false,
            });
            if (result.success) {
              setPmiData(result.pmi ?? null);
              setGeometryData(result.geometry ?? null);
            } else {
              setPmiData(null);
              setGeometryData(null);
            }
          } catch (error) {
            logger.error("OperatorView", "Error during CAD processing", error);
            toast.error(t("production.cadProcessingFailed"));
            setPmiData(null);
            setGeometryData(null);
          }
        } else {
          setPmiData(null);
          setGeometryData(null);
        }
      } catch (error) {
        logger.error("OperatorView", "Error loading file URLs", error);
      }
    };

    void loadFiles();
  }, [selectedJob, processCAD, t]);

  /* ── Actions ── */
  const handleStart = async () => {
    if (!selectedJob || !operatorId || !profile?.tenant_id) return;
    try {
      await startTimeTracking(
        selectedJob.operationId,
        operatorId,
        profile.tenant_id,
      );
      toast.success(t("notifications.success"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("notifications.failed"),
      );
    }
  };

  const handlePause = async () => {
    if (!selectedJob || !operatorId) return;
    try {
      await stopTimeTracking(selectedJob.operationId, operatorId);
      toast.success(t("production.operationPaused"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("notifications.failed"),
      );
    }
  };

  const handleComplete = async () => {
    if (!selectedJob || !operatorId || !profile?.tenant_id) return;
    try {
      await completeOperation(
        selectedJob.operationId,
        profile.tenant_id,
        operatorId,
      );
      toast.success(t("production.operationCompleted"));
      setSelectedJobId(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("notifications.failed"),
      );
    }
  };

  /* ── Shared table header ── */
  const tableHead = (
    <thead className="sticky top-0 z-10 bg-muted/50">
      <tr className="border-b border-border">
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.jobNumber")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.partNumber")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.operation")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.cell")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.material")}
        </th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.quantity")}
        </th>
        <th className="px-2 py-1.5 text-right text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.hours")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.plannedStart", "Start")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.dueDate")}
        </th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.files")}
        </th>
      </tr>
    </thead>
  );

  /* ── Render ── */
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

      {/* ═══════ LEFT PANEL — Resizable ═══════ */}
      <div
        className="flex flex-col border-r border-border transition-all duration-200"
        style={{ width: rightPanelCollapsed ? "100%" : `${leftPanelWidth}%` }}
      >
        {/* Header / Cell Selector */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium text-muted-foreground">
              {t("navigation.terminalView", "Terminal View")}:
            </span>
            <Select value={selectedCellId} onValueChange={handleCellChange}>
              <SelectTrigger className="w-[200px] border-input bg-card text-foreground">
                <SelectValue
                  placeholder={t("terminal.selectCell", "Select Cell")}
                />
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
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredJobs.length} {t("terminal.jobsFound")}
          </div>
        </div>

        {/* ── 1. IN PROCESS ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-gradient-to-b from-status-active/5 to-transparent">
          <div className="flex shrink-0 items-center justify-between border-l-2 border-status-active bg-status-active/10 px-3 py-1.5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-status-active">
              {t("terminal.inProcess")} ({inProcessJobs.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left">
              {tableHead}
              <tbody>
                {inProcessJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center italic text-muted-foreground"
                    >
                      {t("terminal.noActiveJobs")}
                    </td>
                  </tr>
                ) : (
                  inProcessJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      isSelected={selectedJobId === job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      variant="process"
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 2. IN BUFFER ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-gradient-to-b from-info/5 to-transparent">
          <div className="flex shrink-0 items-center justify-between border-l-2 border-alert-info-border bg-alert-info-bg/80 px-3 py-1.5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-info">
              {t("terminal.inBuffer")} ({inBufferJobs.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left">
              {tableHead}
              <tbody>
                {inBufferJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center italic text-muted-foreground"
                    >
                      {t("terminal.noBufferJobs", "No jobs in buffer")}
                    </td>
                  </tr>
                ) : (
                  inBufferJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      isSelected={selectedJobId === job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      variant="buffer"
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 3. EXPECTED ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-status-pending/5 to-transparent">
          <div className="flex shrink-0 items-center justify-between border-l-2 border-status-pending bg-status-pending/10 px-3 py-1.5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-status-pending">
              {t("terminal.expected")} ({expectedJobs.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left">
              {tableHead}
              <tbody>
                {expectedJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center italic text-muted-foreground"
                    >
                      {t("terminal.noExpectedJobs", "No expected jobs")}
                    </td>
                  </tr>
                ) : (
                  expectedJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      isSelected={selectedJobId === job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      variant="expected"
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══════ RESIZABLE DIVIDER ═══════ */}
      {!rightPanelCollapsed ? (
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

      {/* ═══════ RIGHT PANEL — Collapsible ═══════ */}
      <div
        className={cn(
          "z-10 flex flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-200",
          rightPanelCollapsed ? "w-10" : "",
        )}
        style={{
          width: rightPanelCollapsed ? "40px" : `${100 - leftPanelWidth}%`,
        }}
      >
        {/* Collapse toggle — positioned relative to panel, not absolute */}
        <div className="flex shrink-0 items-center justify-center border-b border-border py-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="h-6 w-6 rounded-full border border-border bg-card p-0 shadow-sm hover:bg-accent"
          >
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </div>

        {rightPanelCollapsed ? (
          <div className="flex flex-1 flex-col items-center justify-center py-4">
            <span className="rotate-180 text-[10px] text-muted-foreground [writing-mode:vertical-lr]">
              {t("terminal.detailsPanel", "Details Panel")}
            </span>
          </div>
        ) : selectedJob ? (
          <DetailPanel
            job={selectedJob}
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
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <ChevronLeft className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="mb-2 text-xl font-medium text-foreground">
              {t("terminal.noJobSelected", "No Job Selected")}
            </h3>
            <p className="text-sm">
              {t(
                "terminal.noJobSelectedDescription",
                "Select a job from the list to view details and controls.",
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
