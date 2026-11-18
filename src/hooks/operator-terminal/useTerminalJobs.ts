import { useCallback, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import type { OperationWithDetails } from "@/lib/db";
import {
  buildBatchPrompt,
  countTerminalModes,
  mapOperationToTerminalJob,
  type BatchScanMode,
} from "@/features/operator-terminal/model";
import type {
  OperatorTerminalMode,
  OperatorTerminalWorkModeSettings,
} from "@/features/operator-terminal/workModes";

interface TerminalJobsOptions {
  locationByPart: Map<string, string>;
  lookupOperations: OperationWithDetails[];
  operations: OperationWithDetails[];
  operatorId: string | null | undefined;
  producedByOperation: Map<string, number>;
  selectedMode: OperatorTerminalMode;
  sequentialRelease: boolean;
  settings: OperatorTerminalWorkModeSettings;
  t: TFunction;
  workingHoursActive: boolean;
}

export function useTerminalJobs({
  locationByPart,
  lookupOperations,
  operations,
  operatorId,
  producedByOperation,
  selectedMode,
  sequentialRelease,
  settings,
  t,
  workingHoursActive,
}: TerminalJobsOptions) {
  const [selectedCellId, setSelectedCellId] = useState(
    () => localStorage.getItem("operator_selected_cell") || "all",
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [batchModes, setBatchModes] = useState<Record<string, BatchScanMode>>({});

  const allJobs = useMemo(
    () => operations.map((operation) => mapOperationToTerminalJob(operation, {
      allOperations: lookupOperations,
      locationByPart,
      operatorId,
      producedByOperation,
      selectedMode,
      sequentialRelease,
      settings,
      workingHoursActive,
    })),
    [locationByPart, lookupOperations, operations, operatorId, producedByOperation, selectedMode, sequentialRelease, settings, workingHoursActive],
  );
  const filteredJobs = useMemo(
    () => selectedCellId === "all" ? allJobs : allJobs.filter((job) => job.cellId === selectedCellId),
    [allJobs, selectedCellId],
  );
  const priorityFirst = (a: (typeof allJobs)[number], b: (typeof allJobs)[number]) =>
    Number(Boolean(b.isBulletCard)) - Number(Boolean(a.isBulletCard));
  const inProcessJobs = filteredJobs
    .filter((job) => job.status === "in_progress" || job.status === "on_hold")
    .sort(priorityFirst);
  const inBufferJobs = filteredJobs.filter((job) => job.status === "in_buffer").sort(priorityFirst);
  const expectedJobs = filteredJobs.filter((job) => job.status === "expected").sort(priorityFirst);
  const selectedJob = allJobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedOperation = operations.find((operation) => operation.id === selectedJobId) ?? null;
  const selectedPartOperations = useMemo(
    () => selectedJob
      ? operations.filter((operation) => operation.part.id === selectedJob.partId).sort((a, b) => a.sequence - b.sequence)
      : [],
    [operations, selectedJob],
  );
  const selectedBatchPrompt = useMemo(
    () => buildBatchPrompt(
      selectedOperation?.batch_context,
      selectedOperation?.id ?? null,
      operatorId,
      selectedOperation ? batchModes[selectedOperation.id] ?? null : null,
    ),
    [batchModes, operatorId, selectedOperation],
  );

  const handleCellChange = useCallback((cellId: string) => {
    setSelectedCellId(cellId);
    localStorage.setItem("operator_selected_cell", cellId);
    setSelectedJobId(null);
  }, []);
  const selectBatchMode = useCallback((mode: BatchScanMode) => {
    if (!selectedOperation) return;
    setBatchModes((current) => ({ ...current, [selectedOperation.id]: mode }));
  }, [selectedOperation]);
  const clearBatchMode = useCallback(() => {
    if (!selectedOperation) return;
    setBatchModes((current) => {
      const next = { ...current };
      delete next[selectedOperation.id];
      return next;
    });
  }, [selectedOperation]);

  const currentTerminalMode = selectedJob?.operatorMode ?? selectedMode;
  return {
    allJobs, clearBatchMode, currentTerminalMode, expectedJobs, filteredJobs, handleCellChange,
    inBufferJobs, inProcessJobs, pauseActionLabel: selectedBatchPrompt?.isBatchTimerActive
      ? t("terminal.batchFlow.stopBatch")
      : t("operations.pause", "Pause"),
    selectBatchMode, selectedBatchPrompt, selectedCellId, selectedJob, selectedJobId,
    selectedPartOperations, setSelectedCellId, setSelectedJobId,
    showCompleteAction: !selectedBatchPrompt?.isBatchTimerActive,
    startActionLabel: selectedBatchPrompt?.mode === "batch"
      ? t("terminal.batchFlow.startBatch")
      : currentTerminalMode === "setup"
        ? t("terminal.workModes.actions.startSetup")
        : t("terminal.workModes.actions.startProduction"),
    terminalModeCounts: countTerminalModes(filteredJobs),
  };
}
