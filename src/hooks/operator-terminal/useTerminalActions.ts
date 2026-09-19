import { useCallback, useRef, useState } from "react";
import type { TFunction } from "i18next";
import {
  finishOperation,
  startBatchTimeTracking,
  startTimeTracking,
  stopBatchTimeTracking,
  stopTimeTracking,
  switchOperation,
} from "@/lib/db";
import { productionErrorMessage } from "@/lib/errors";
import type { TerminalJob } from "@/types/terminal";
import { buildOperatorTerminalModeNote, type OperatorTerminalMode, type OperatorTerminalWorkModeSettings } from "@/features/operator-terminal/workModes";
import type { BatchPromptState } from "@/features/operator-terminal/model";
import { toast } from "sonner";

export interface PendingOperationSwitch {
  from: TerminalJob;
  to: TerminalJob;
}

interface TerminalActionOptions {
  allJobs: TerminalJob[];
  batchPrompt: BatchPromptState | null;
  clearBatchMode: () => void;
  currentMode: OperatorTerminalMode;
  operatorId: string | null | undefined;
  selectedJob: TerminalJob | null;
  setSelectedJobId: (id: string | null) => void;
  settings: OperatorTerminalWorkModeSettings;
  t: TFunction;
  tenantId: string | undefined;
  workingHoursActive: boolean;
}

export function useTerminalActions({
  allJobs,
  batchPrompt,
  clearBatchMode,
  currentMode,
  operatorId,
  selectedJob,
  setSelectedJobId,
  settings,
  t,
  tenantId,
  workingHoursActive,
}: TerminalActionOptions) {
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<PendingOperationSwitch | null>(null);
  const locked = useRef(false);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setIsActionPending(true);
    try {
      await action();
    } catch (error) {
      toast.error(productionErrorMessage(error, t));
    } finally {
      locked.current = false;
      setIsActionPending(false);
    }
  }, [t]);

  const validateOperationStart = useCallback((job: TerminalJob | null = selectedJob) => {
    if (settings.enabled && settings.enforceWorkingHours && !workingHoursActive) {
      toast.error(t("terminal.workModes.errors.outsideWorkingHours"));
      return false;
    }
    if (settings.enabled && currentMode === "not_working") {
      toast.error(t("terminal.workModes.errors.selectMode"));
      return false;
    }
    if (job?.startBlocked) {
      toast.error(t("production.errors.notReleased"));
      return false;
    }
    if (job?.modeSummary?.readiness === "blocked_setup") {
      toast.error(t("terminal.workModes.errors.setupRequired"));
      return false;
    }
    if (batchPrompt?.mode === "single" && currentMode === "setup" && !settings.setupPrepEnabled) {
      toast.error(t("terminal.workModes.errors.setupDisabled"));
      return false;
    }
    return true;
  }, [batchPrompt, currentMode, selectedJob, settings, t, workingHoursActive]);

  const startNotes = currentMode === "setup" || currentMode === "production"
    ? buildOperatorTerminalModeNote(currentMode)
    : undefined;

  const promptSwitch = useCallback((target: TerminalJob, allowBatchMember = false) => {
    if (target.batchContext && !allowBatchMember) return false;
    const current = allJobs.find(
      (job) => job.isCurrentUserClocked && job.operationId !== target.operationId,
    );
    if (!current) return false;
    setPendingSwitch({ from: current, to: target });
    return true;
  }, [allJobs]);

  const handleStart = useCallback(async () => {
    if (!selectedJob || !operatorId || !tenantId) return;
    if (batchPrompt && !batchPrompt.mode) {
      toast.error(t("terminal.batchFlow.chooseMode"));
      return;
    }

    if (batchPrompt?.mode === "batch") {
      const activeElsewhere = allJobs.some(
        (job) => job.isCurrentUserClocked && job.batchContext?.batchId !== batchPrompt.batchId,
      );
      if (activeElsewhere) {
        toast.error(t("production.errors.activeElsewhere"));
        return;
      }
      if (!batchPrompt.isBatchActionAvailable) {
        toast.error(t(`terminal.batchFlow.unavailable.${batchPrompt.unavailableReason ?? "partial"}`));
        return;
      }
      await run(async () => {
        await startBatchTimeTracking(batchPrompt.batchId, operatorId, tenantId);
        toast.success(t("terminal.batchFlow.batchStarted", { count: batchPrompt.totalMembers }));
      });
      return;
    }

    if (!validateOperationStart()) return;
    if (promptSwitch(selectedJob, true)) return;
    await run(async () => {
      await startTimeTracking(selectedJob.operationId, operatorId, tenantId, startNotes);
      toast.success(t("notifications.success"));
    });
  }, [allJobs, batchPrompt, operatorId, promptSwitch, run, selectedJob, startNotes, t, tenantId, validateOperationStart]);

  const confirmSwitch = useCallback(async () => {
    if (!pendingSwitch || !operatorId || !tenantId || !validateOperationStart(pendingSwitch.to)) return;
    const switching = pendingSwitch;
    setPendingSwitch(null);
    await run(async () => {
      await switchOperation(
        switching.from.operationId,
        switching.to.operationId,
        operatorId,
        tenantId,
        startNotes,
      );
      toast.success(t("production.switchedFrom", {
        operation: `${switching.from.jobCode} ${switching.from.currentOp}`,
      }));
    });
  }, [operatorId, pendingSwitch, run, startNotes, t, tenantId, validateOperationStart]);

  const handlePause = useCallback(async () => {
    if (!selectedJob || !operatorId) return;
    await run(async () => {
      if (batchPrompt?.isBatchTimerActive && tenantId) {
        await stopBatchTimeTracking(batchPrompt.batchId, operatorId, tenantId);
        toast.success(t("terminal.batchFlow.batchStopped", { count: batchPrompt.totalMembers }));
        setSelectedJobId(null);
        clearBatchMode();
        return;
      }
      await stopTimeTracking(selectedJob.operationId, operatorId);
      toast.success(t("production.operationPaused"));
    });
  }, [batchPrompt, clearBatchMode, operatorId, run, selectedJob, setSelectedJobId, t, tenantId]);

  const handleComplete = useCallback(async () => {
    if (!selectedJob || !operatorId || !tenantId) return false;
    let completed = false;
    await run(async () => {
      await finishOperation(selectedJob.operationId, tenantId, operatorId);
      toast.success(t("production.operationCompleted"));
      setSelectedJobId(null);
      completed = true;
    });
    return completed;
  }, [operatorId, run, selectedJob, setSelectedJobId, t, tenantId]);

  return {
    cancelSwitch: () => setPendingSwitch(null),
    confirmSwitch,
    handleComplete,
    handlePause,
    handleStart,
    isActionPending,
    pendingSwitch,
    promptSwitch,
  };
}
