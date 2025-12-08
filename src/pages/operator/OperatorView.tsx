import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOperationsWithDetails,
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
  OperationWithDetails
} from "@/lib/database";
import { JobRow } from "@/components/terminal/JobRow";
import { DetailPanel } from "@/components/terminal/DetailPanel";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define the interface locally if not exported, matching the one in JobRow
import { TerminalJob } from '@/types/terminal';

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
  const [selectedCellId, setSelectedCellId] = useState<string>(() => localStorage.getItem("operator_selected_cell") || "all");
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // File URLs
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);

  // Panel collapse/resize states
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(70); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resizable panel handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(newWidth, 40), 85)); // Clamp between 40% and 85%
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support for tablets
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = ((touch.clientX - rect.left) / rect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(newWidth, 40), 85));
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Load Data
  const loadData = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);

      // Fetch operations and cells in parallel
      const [opsData, cellsData] = await Promise.all([
        fetchOperationsWithDetails(profile.tenant_id),
        supabase
          .from("cells")
          .select("id, name, color")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence")
      ]);

      setOperations(opsData);
      if (cellsData.data) setCells(cellsData.data);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time subscription
    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel("operator-terminal-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operations", filter: `tenant_id=eq.${profile.tenant_id}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries", filter: `tenant_id=eq.${profile.tenant_id}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);

  // Handle cell selection change
  const handleCellChange = (value: string) => {
    setSelectedCellId(value);
    localStorage.setItem("operator_selected_cell", value);
    setSelectedJobId(null); // Clear selection when changing cells
  };

  // Map operations to TerminalJob
  const mapOperationToJob = (op: OperationWithDetails): TerminalJob => {
    // Debug log for part data
    if (op.part.file_paths && op.part.file_paths.length > 0) {
      console.log("Mapping op with files:", op.id, op.part.part_number, op.part.file_paths);
    } else {
      // console.log("Mapping op WITHOUT files:", op.id, op.part.part_number, op.part);
    }

    const hasPdf = op.part.file_paths?.some(p => p.toLowerCase().endsWith('.pdf')) || false;
    const hasModel = op.part.file_paths?.some(p => p.toLowerCase().endsWith('.step') || p.toLowerCase().endsWith('.stp')) || false;

    // Map operation status - skip completed operations (handled by filter below)
    let status: TerminalJob['status'] = 'expected';
    if (op.status === 'in_progress') status = 'in_progress';
    else if (op.status === 'on_hold') status = 'on_hold';
    else if (op.status === 'not_started') status = 'in_buffer';
    else if (op.status === 'completed') status = 'expected'; // Will be filtered out

    // If there's an active time entry, the operation should be considered in_progress
    if (op.active_time_entry) status = 'in_progress';

    // Calculate remaining hours
    const estimated = op.estimated_time || 0;
    const actual = op.actual_time || 0;
    const remaining = Math.max(0, estimated - actual);

    return {
      id: op.id, // Use operation ID as the unique key
      operationId: op.id,
      partId: op.part.id,
      jobId: op.part.job.id,
      jobCode: op.part.job.job_number,
      description: op.part.part_number, // Or op.operation_name? Design showed Part Name as description
      material: op.part.material,
      quantity: op.part.quantity,
      currentOp: op.operation_name,
      totalOps: 0, // Placeholder
      hours: Number(remaining.toFixed(1)), // Format to 1 decimal place
      dueDate: op.part.job.due_date || new Date().toISOString(),
      status: status,
      hasPdf,
      hasModel,
      filePaths: op.part.file_paths || [],
      activeTimeEntryId: op.active_time_entry?.id,
      activeOperatorId: op.active_time_entry?.operator_id,
      activeOperatorName: op.active_time_entry?.operator?.full_name,
      isCurrentUserClocked: op.active_time_entry?.operator_id === operatorId,
      notes: op.notes,
      cellName: op.cell.name,
      cellColor: op.cell.color || "#3b82f6",
      cellId: op.cell_id,
      currentSequence: op.sequence,
      // New part fields
      drawingNo: op.part.drawing_no,
      cncProgramName: op.part.cnc_program_name,
      isBulletCard: op.part.is_bullet_card,
    };
  };

  const allJobs = useMemo(() => operations.map(mapOperationToJob), [operations, operatorId]);

  // Filter by Cell
  const filteredJobs = useMemo(() => {
    if (selectedCellId === "all") return allJobs;
    return allJobs.filter(job => job.cellId === selectedCellId);
  }, [allJobs, selectedCellId]);

  // Filter into 3 lists
  const inProcessJobs = filteredJobs.filter(j => j.status === 'in_progress');

  // For Buffer vs Expected, let's just split the 'in_buffer' ones (which are 'not_started')
  // We'll take the first 5 as Buffer, rest as Expected for now to simulate the flow
  const notStartedJobs = filteredJobs.filter(j => j.status === 'in_buffer' || j.status === 'expected');
  const inBufferJobs = notStartedJobs.slice(0, 5).map(j => ({ ...j, status: 'in_buffer' as const }));
  const expectedJobs = notStartedJobs.slice(5).map(j => ({ ...j, status: 'expected' as const }));

  const selectedJob = allJobs.find(j => j.id === selectedJobId) || null;

  // Get all operations for the selected part to show in the Ops tab
  const selectedPartOperations = useMemo(() => {
    if (!selectedJob) return [];
    return operations
      .filter(op => op.part.id === selectedJob.partId)
      .sort((a, b) => a.sequence - b.sequence);
  }, [selectedJob, operations]);

  // Load file URLs when selection changes
  useEffect(() => {
    const loadFiles = async () => {
      if (!selectedJob?.filePaths?.length) {
        console.log("No file paths for job:", selectedJob?.jobCode);
        setPdfUrl(null);
        setStepUrl(null);
        return;
      }

      console.log("Loading files for:", selectedJob.jobCode, selectedJob.filePaths);

      try {
        let pdf: string | null = null;
        let step: string | null = null;

        for (const path of selectedJob.filePaths) {
          const ext = path.toLowerCase();
          console.log("Checking file:", path, "Ext:", ext);

          if (ext.endsWith(".pdf") && !pdf) {
            const { data } = await supabase.storage.from("parts-cad").createSignedUrl(path, 3600);
            if (data?.signedUrl) pdf = data.signedUrl;
          } else if ((ext.endsWith(".step") || ext.endsWith(".stp")) && !step) {
            const { data } = await supabase.storage.from("parts-cad").createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              console.log("Found STEP file, creating blob URL from:", data.signedUrl);
              const response = await fetch(data.signedUrl);
              const blob = await response.blob();
              step = URL.createObjectURL(blob);
            }
          }
        }
        setPdfUrl(pdf);
        setStepUrl(step);
      } catch (e) {
        console.error("Error loading file URLs", e);
      }
    };

    loadFiles();
  }, [selectedJob]);

  // Actions
  const handleStart = async () => {
    if (!selectedJob || !operatorId || !profile?.tenant_id) return;
    try {
      await startTimeTracking(selectedJob.operationId, operatorId, profile.tenant_id);
      toast.success(`Started: ${selectedJob.currentOp}`);
      // Data will reload via subscription
    } catch (error: any) {
      toast.error(error.message || "Failed to start");
    }
  };

  const handlePause = async () => {
    if (!selectedJob || !operatorId) return;
    try {
      await stopTimeTracking(selectedJob.operationId, operatorId);
      toast.success("Operation paused");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause");
    }
  };

  const handleComplete = async () => {
    if (!selectedJob || !operatorId || !profile?.tenant_id) return;
    try {
      await completeOperation(selectedJob.operationId, profile.tenant_id, operatorId);
      toast.success("Operation completed");
      setSelectedJobId(null); // Deselect
    } catch (error: any) {
      toast.error(error.message || "Failed to complete");
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-[calc(100vh-160px)] w-full bg-background text-foreground overflow-hidden font-sans relative",
        isDragging && "select-none cursor-col-resize"
      )}
    >
      {loading && (
        <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-primary font-medium animate-pulse">Loading Terminal Data...</p>
          </div>
        </div>
      )}
      {/* LEFT PANEL - Resizable */}
      <div
        className="flex flex-col border-r border-border transition-all duration-200"
        style={{ width: rightPanelCollapsed ? '100%' : `${leftPanelWidth}%` }}
      >
        {/* HEADER / CELL SELECTOR */}
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground font-medium">Terminal View:</span>
            <Select value={selectedCellId} onValueChange={handleCellChange}>
              <SelectTrigger className="w-[200px] bg-card border-input text-foreground">
                <SelectValue placeholder="Select Cell" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all">All Cells</SelectItem>
                {cells.map(cell => (
                  <SelectItem key={cell.id} value={cell.id}>{cell.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredJobs.length} {t("terminal.jobsFound")}
          </div>
        </div>

        {/* 1. IN PROCESS */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-border bg-gradient-to-b from-status-active/5 to-transparent overflow-hidden">
          <div className="px-3 py-1.5 bg-status-active/10 backdrop-blur-sm border-l-2 border-status-active flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-status-active">{t("terminal.inProcess")} ({inProcessJobs.length})</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.jobNumber")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.partNumber")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.operation")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.cell")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.material")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">{t("terminal.columns.quantity")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-right">{t("terminal.columns.hours")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.dueDate")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">{t("terminal.columns.files")}</th>
                </tr>
              </thead>
              <tbody>
                {inProcessJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground italic">
                      {t("terminal.noActiveJobs")}
                    </td>
                  </tr>
                ) : (
                  inProcessJobs.map(job => (
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

        {/* 2. IN BUFFER */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-border bg-gradient-to-b from-info/5 to-transparent overflow-hidden">
          <div className="px-3 py-1.5 bg-alert-info-bg/80 backdrop-blur-sm border-l-2 border-alert-info-border flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-info">{t("terminal.inBuffer")} ({inBufferJobs.length})</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.jobNumber")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.partNumber")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.operation")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.cell")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.material")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">{t("terminal.columns.quantity")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-right">{t("terminal.columns.hours")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.dueDate")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">{t("terminal.columns.files")}</th>
                </tr>
              </thead>
              <tbody>
                {inBufferJobs.map(job => (
                  <JobRow
                    key={job.id}
                    job={job}
                    isSelected={selectedJobId === job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    variant="buffer"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. EXPECTED */}
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-status-pending/5 to-transparent overflow-hidden">
          <div className="px-3 py-1.5 bg-status-pending/10 backdrop-blur-sm border-l-2 border-status-pending flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-status-pending">{t("terminal.expected")} ({expectedJobs.length})</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.jobNumber")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.partNumber")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.operation")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.cell")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.material")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">{t("terminal.columns.quantity")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-right">{t("terminal.columns.hours")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("terminal.columns.dueDate")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">{t("terminal.columns.files")}</th>
                </tr>
              </thead>
              <tbody>
                {expectedJobs.map(job => (
                  <JobRow
                    key={job.id}
                    job={job}
                    isSelected={selectedJobId === job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    variant="expected"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RESIZABLE DIVIDER */}
      {!rightPanelCollapsed && (
        <div
          className={cn(
            "w-1 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center group transition-colors relative z-20",
            isDragging && "bg-primary/50"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" /> {/* Larger touch target */}
          <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* RIGHT PANEL - Resizable/Collapsible */}
      <div
        className={cn(
          "bg-card flex flex-col border-l border-border shadow-2xl z-10 transition-all duration-200",
          "backdrop-blur-md bg-card/95", // Glass morphism
          rightPanelCollapsed ? "w-10" : ""
        )}
        style={{ width: rightPanelCollapsed ? '40px' : `${100 - leftPanelWidth}%` }}
      >
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="absolute top-2 -left-3 z-30 h-6 w-6 p-0 rounded-full bg-card border border-border shadow-md hover:bg-accent"
          style={{ marginLeft: rightPanelCollapsed ? '7px' : '0' }}
        >
          {rightPanelCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {rightPanelCollapsed ? (
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <span className="text-muted-foreground text-[10px] [writing-mode:vertical-lr] rotate-180">
              Details Panel
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
            operations={selectedPartOperations}
            onDataRefresh={loadData}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 mb-4 flex items-center justify-center">
              <span className="text-3xl">👈</span>
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">No Job Selected</h3>
            <p className="text-sm">Select a job from the list to view details and controls.</p>
          </div>
        )}
      </div>
    </div>
  );
}
