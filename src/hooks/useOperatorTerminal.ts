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
  fetchOperationLookupDetails,
  startTimeTracking,
  startBatchTimeTracking,
  stopTimeTracking,
  stopBatchTimeTracking,
  completeOperation,
  type OperationWithDetails,
  type OperationBatchContext,
} from "@/lib/database";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { TerminalJob } from "@/types/terminal";
import {
  buildOperationScanLabel,
  findOperationsByScanToken,
  type ScanFeedback,
} from "@/lib/operatorScanner";
import {
  buildOperatorTerminalModeNote,
  DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS,
  getOperatorTerminalWorkModeSettings,
  getTerminalJobModeSummary,
  isWorkingHoursActive,
  parseOperatorTerminalModeNote,
  type OperatorTerminalMode,
  type OperatorTerminalSchedule,
  type OperatorTerminalWorkModeSettings,
} from "@/features/operator-terminal/workModes";

interface Cell {
  id: string;
  name: string;
  color: string | null;
}

type BatchScanMode = "single" | "batch";

interface TerminalModeCounts {
  blockedSetup: number;
  blockedWorkingHours: number;
  readyForSetup: number;
  readyForProduction: number;
  inSetup: number;
  inProduction: number;
}

export interface BatchPromptState {
  batchId: string;
  batchNumber: string;
  batchType: string;
  parentBatchNumber: string | null;
  totalMembers: number;
  readyMembers: number;
  completedMembers: number;
  activeMembers: number;
  unavailableReason: string | null;
  mode: BatchScanMode | null;
  isBatchActionAvailable: boolean;
  isBatchTimerActive: boolean;
}

function isClosedOperation(operation: OperationWithDetails) {
  return (
    operation.status === "completed" ||
    operation.batch_context?.status === "completed" ||
    operation.batch_context?.status === "cancelled"
  );
}

function buildBatchPrompt(
  batchContext: OperationBatchContext | null | undefined,
  operationId: string | null,
  operatorId: string | null | undefined,
  selectedMode: BatchScanMode | null,
): BatchPromptState | null {
  if (!batchContext || !operationId) return null;

  const members = batchContext.members ?? [];
  if (members.length <= 1) return null;

  const completedMembers = members.filter((member) => member.status === "completed");
  const activeMembers = members.filter((member) => member.active_time_entry);
  const partialMembers = members.filter(
    (member) =>
      member.operation_id !== operationId &&
      (member.status !== "not_started" || Boolean(member.active_time_entry)),
  );
  const readyMembers = members.filter(
    (member) =>
      member.status === "not_started" &&
      !member.active_time_entry,
  );
  const batchTimerTag = `batch:${batchContext.batch_id}`;
  const isBatchTimerActive = members.some(
    (member) =>
      member.active_time_entry?.operator_id === operatorId &&
      member.active_time_entry.notes === batchTimerTag,
  );

  let unavailableReason: string | null = null;

  if (batchContext.status === "completed" || batchContext.status === "cancelled") {
    unavailableReason = "closed";
  } else if (partialMembers.length > 0) {
    unavailableReason = "partial";
  } else if (
    activeMembers.some((member) => member.active_time_entry?.operator_id !== operatorId)
  ) {
    unavailableReason = "active_elsewhere";
  } else if (completedMembers.length > 0) {
    unavailableReason = "completed_members";
  }

  return {
    batchId: batchContext.batch_id,
    batchNumber: batchContext.batch_number,
    batchType: batchContext.batch_type,
    parentBatchNumber: batchContext.parent_batch?.batch_number ?? null,
    totalMembers: members.length,
    readyMembers: readyMembers.length,
    completedMembers: completedMembers.length,
    activeMembers: activeMembers.length,
    unavailableReason,
    mode: isBatchTimerActive ? "batch" : selectedMode,
    isBatchActionAvailable: unavailableReason === null,
    isBatchTimerActive,
  };
}

export function useOperatorTerminal() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [lookupOperations, setLookupOperations] = useState<OperationWithDetails[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>(
    () => localStorage.getItem("operator_selected_cell") || "all",
  );
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [batchModesByOperation, setBatchModesByOperation] = useState<
    Record<string, BatchScanMode>
  >({});
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [pmiData, setPmiData] = useState<PMIData | null>(null);
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null);
  const [workModeSettings, setWorkModeSettings] = useState<OperatorTerminalWorkModeSettings>(
    DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS,
  );
  const [workModeSettingsLoaded, setWorkModeSettingsLoaded] = useState(false);
  const [workingHoursSchedule, setWorkingHoursSchedule] = useState<OperatorTerminalSchedule>({
    openingTime: null,
    closingTime: null,
    timezone: null,
  });
  const [selectedTerminalMode, setSelectedTerminalMode] =
    useState<OperatorTerminalMode>("not_working");

  const { processCAD } = useCADProcessing();

  const persistTerminalMode = useCallback((mode: OperatorTerminalMode) => {
    setSelectedTerminalMode(mode);
    if (profile?.tenant_id && operatorId) {
      localStorage.setItem(
        `operator_terminal_mode:${profile.tenant_id}:${operatorId}`,
        mode,
      );
    }
  }, [operatorId, profile?.tenant_id]);

  useEffect(() => {
    if (!profile?.tenant_id || !operatorId) {
      setWorkModeSettingsLoaded(false);
      setSelectedTerminalMode("not_working");
      return;
    }

    setWorkModeSettingsLoaded(false);
    const storedMode = localStorage.getItem(
      `operator_terminal_mode:${profile.tenant_id}:${operatorId}`,
    );
    if (
      storedMode === "not_working" ||
      storedMode === "setup" ||
      storedMode === "production"
    ) {
      setSelectedTerminalMode(storedMode);
    }
  }, [operatorId, profile?.tenant_id]);

  /* ── Data loading ── */
  const loadData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);

      const [opsData, cellsData, tenantData] = await Promise.all([
        fetchOperationLookupDetails(profile.tenant_id),
        supabase
          .from("cells")
          .select("id, name, color")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
        supabase
          .from("tenants")
          .select("feature_flags, factory_opening_time, factory_closing_time, timezone")
          .eq("id", profile.tenant_id)
          .single(),
      ]);

      setLookupOperations(opsData);
      setOperations(opsData.filter((operation) => operation.status !== "completed"));
      if (cellsData.data) setCells(cellsData.data);
      if (tenantData.error) {
        throw tenantData.error;
      }
      const tenantSettings = getOperatorTerminalWorkModeSettings(
        tenantData.data?.feature_flags,
      );
      setWorkModeSettings(tenantSettings);
      setWorkingHoursSchedule({
        openingTime: tenantData.data?.factory_opening_time ?? null,
        closingTime: tenantData.data?.factory_closing_time ?? null,
        timezone: tenantData.data?.timezone ?? null,
      });
      setWorkModeSettingsLoaded(true);
    } catch (error) {
      logger.error("OperatorView", "Error loading data", error);
      toast.error(t("notifications.failedToLoadData"));
      setWorkModeSettingsLoaded(true);
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

  const handleScannerToken = useCallback(async (rawToken: string) => {
    const matches = findOperationsByScanToken(lookupOperations, rawToken);

    if (matches.length === 0) {
      setScanFeedback({
        kind: "error",
        token: rawToken,
        reason: "no_match",
      });
      return;
    }

    if (matches.length > 1) {
      setScanFeedback({
        kind: "error",
        token: rawToken,
        reason: "duplicate_match",
        matchCount: matches.length,
      });
      return;
    }

    const match = matches[0];

    if (isClosedOperation(match)) {
      setScanFeedback({
        kind: "error",
        token: rawToken,
        reason: "closed",
        operationLabel: buildOperationScanLabel(match),
      });
      return;
    }

    if (match.active_time_entry?.operator_id && match.active_time_entry.operator_id !== operatorId) {
      setScanFeedback({
        kind: "error",
        token: rawToken,
        reason: "active_by_other_operator",
        operationLabel: buildOperationScanLabel(match),
        activeOperatorName: match.active_time_entry.operator.full_name,
      });
      return;
    }

    if (selectedCellId !== "all" && selectedCellId !== match.cell_id) {
      setSelectedCellId(match.cell_id);
      localStorage.setItem("operator_selected_cell", match.cell_id);
    }

    setSelectedJobId(match.id);
    setScanFeedback({
      kind: "success",
      token: rawToken,
      operationId: match.id,
      operationLabel: buildOperationScanLabel(match),
    });
  }, [lookupOperations, operatorId, selectedCellId]);

  /* ── Map operations to terminal jobs ── */
  const workingHoursActive = useMemo(
    () => isWorkingHoursActive(workingHoursSchedule),
    [workingHoursSchedule],
  );

  useEffect(() => {
    if (!workModeSettingsLoaded) {
      return;
    }

    if (!workModeSettings.enabled && selectedTerminalMode !== "not_working") {
      persistTerminalMode("not_working");
      return;
    }

    if (!workModeSettings.setupPrepEnabled && selectedTerminalMode === "setup") {
      persistTerminalMode("production");
    }
  }, [
    persistTerminalMode,
    selectedTerminalMode,
    workModeSettings.enabled,
    workModeSettingsLoaded,
    workModeSettings.setupPrepEnabled,
  ]);

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

      const activeMode = parseOperatorTerminalModeNote(op.active_time_entry?.notes);
      const modeSummary = getTerminalJobModeSummary({
        activeMode,
        settings: workModeSettings,
        selectedMode: selectedTerminalMode,
        hasSetupHistory: op.operator_mode_summary?.has_setup_history ?? false,
        workingHoursActive,
      });

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
        operatorMode: activeMode,
        modeSummary,
        notes: typeof op.notes === "string" ? op.notes : null,
        operationType: typeof op.operation_type === "string" ? op.operation_type : null,
        cellName: String(op.cell.name ?? ""),
        cellColor: typeof op.cell.color === "string" ? op.cell.color : "#3b82f6",
        cellId: op.cell_id,
        currentSequence: op.sequence,
        drawingNo: typeof op.part.drawing_no === "string" ? op.part.drawing_no : null,
        cncProgramName: typeof op.part.cnc_program_name === "string" ? op.part.cnc_program_name : null,
        isBulletCard: Boolean(op.part.is_bullet_card),
        plannedStart: typeof op.planned_start === "string" ? op.planned_start : null,
        batchContext: op.batch_context
          ? {
              batchId: op.batch_context.batch_id,
              batchNumber: op.batch_context.batch_number,
              batchType: op.batch_context.batch_type,
              status: op.batch_context.status,
              parentBatchNumber: op.batch_context.parent_batch?.batch_number ?? null,
              operationsCount: op.batch_context.operations_count,
            }
          : null,
      };
    },
    [operatorId, selectedTerminalMode, workModeSettings, workingHoursActive],
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

  const selectedOperation = useMemo(
    () => operations.find((operation) => operation.id === selectedJobId) ?? null,
    [operations, selectedJobId],
  );

  const currentTerminalMode = selectedJob?.operatorMode ?? selectedTerminalMode;

  const terminalModeCounts = useMemo(() => {
    return filteredJobs.reduce<TerminalModeCounts>(
      (counts, job) => {
        switch (job.modeSummary?.readiness) {
          case "blocked_setup":
            counts.blockedSetup += 1;
            break;
          case "blocked_working_hours":
            counts.blockedWorkingHours += 1;
            break;
          case "ready_for_setup":
            counts.readyForSetup += 1;
            break;
          case "ready_for_production":
            counts.readyForProduction += 1;
            break;
          case "in_setup":
            counts.inSetup += 1;
            break;
          case "in_production":
            counts.inProduction += 1;
            break;
        }
        return counts;
      },
      {
        blockedSetup: 0,
        blockedWorkingHours: 0,
        readyForSetup: 0,
        readyForProduction: 0,
        inSetup: 0,
        inProduction: 0,
      },
    );
  }, [filteredJobs]);

  const selectedBatchPrompt = useMemo(
    () =>
      buildBatchPrompt(
        selectedOperation?.batch_context,
        selectedOperation?.id ?? null,
        operatorId,
        selectedOperation ? batchModesByOperation[selectedOperation.id] ?? null : null,
      ),
    [batchModesByOperation, operatorId, selectedOperation],
  );

  const selectBatchMode = useCallback((mode: BatchScanMode) => {
    if (!selectedOperation) return;
    setBatchModesByOperation((current) => ({
      ...current,
      [selectedOperation.id]: mode,
    }));
  }, [selectedOperation]);

  const clearBatchMode = useCallback(() => {
    if (!selectedOperation) return;
    setBatchModesByOperation((current) => {
      const next = { ...current };
      delete next[selectedOperation.id];
      return next;
    });
  }, [selectedOperation]);

  const startActionLabel = selectedBatchPrompt?.mode === "batch"
    ? t("terminal.batchFlow.startBatch")
    : currentTerminalMode === "setup"
      ? t("terminal.workModes.actions.startSetup")
      : t("terminal.workModes.actions.startProduction");
  const pauseActionLabel = selectedBatchPrompt?.isBatchTimerActive
    ? t("terminal.batchFlow.stopBatch")
    : t("operations.pause", "Pause");
  const showCompleteAction = selectedBatchPrompt?.isBatchTimerActive
    ? false
    : undefined;

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
      if (selectedBatchPrompt && !selectedBatchPrompt.mode) {
        toast.error(t("terminal.batchFlow.chooseMode"));
        return;
      }

      if (selectedBatchPrompt?.mode === "batch") {
        if (!selectedBatchPrompt.isBatchActionAvailable) {
          toast.error(
            t(
              `terminal.batchFlow.unavailable.${selectedBatchPrompt.unavailableReason ?? "partial"}`,
            ),
          );
          return;
        }

        await startBatchTimeTracking(
          selectedBatchPrompt.batchId,
          operatorId,
          profile.tenant_id,
        );
        toast.success(
          t("terminal.batchFlow.batchStarted", {
            count: selectedBatchPrompt.totalMembers,
          }),
        );
        return;
      }

      if (workModeSettings.enabled && workModeSettings.enforceWorkingHours && !workingHoursActive) {
        toast.error(t("terminal.workModes.errors.outsideWorkingHours"));
        return;
      }

      if (workModeSettings.enabled && currentTerminalMode === "not_working") {
        toast.error(t("terminal.workModes.errors.selectMode"));
        return;
      }

      if (selectedJob.modeSummary?.readiness === "blocked_setup") {
        toast.error(t("terminal.workModes.errors.setupRequired"));
        return;
      }

      if (selectedBatchPrompt?.mode === "single" && currentTerminalMode === "setup" && !workModeSettings.setupPrepEnabled) {
        toast.error(t("terminal.workModes.errors.setupDisabled"));
        return;
      }

      await startTimeTracking(
        selectedJob.operationId,
        operatorId,
        profile.tenant_id,
        currentTerminalMode === "setup" || currentTerminalMode === "production"
          ? buildOperatorTerminalModeNote(currentTerminalMode)
          : undefined,
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
      if (selectedBatchPrompt?.isBatchTimerActive && profile?.tenant_id) {
        await stopBatchTimeTracking(
          selectedBatchPrompt.batchId,
          operatorId,
          profile.tenant_id,
        );
        toast.success(
          t("terminal.batchFlow.batchStopped", {
            count: selectedBatchPrompt.totalMembers,
          }),
        );
        setSelectedJobId(null);
        clearBatchMode();
        return;
      }

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
      // Completing implies finishing — if the operator is still clocked on,
      // stop their timer first instead of forcing a separate Pause step.
      // (completeOperation rejects while any entry is open.)
      if (selectedJob.isCurrentUserClocked) {
        await stopTimeTracking(selectedJob.operationId, operatorId);
      }
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
    workModeSettings,
    currentTerminalMode,
    selectedTerminalMode,
    setSelectedTerminalMode: persistTerminalMode,
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
    clearBatchMode,
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
  };
}
