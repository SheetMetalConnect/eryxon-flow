import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
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
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { TerminalJob } from "@/types/terminal";

interface Cell {
  id: string;
  name: string;
  color: string | null;
}

export function useOperatorTerminal() {
  const { t } = useTranslation();
  const profile = useProfile();
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

  /* ── Map operations to terminal jobs ── */
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

  return {
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
  };
}
