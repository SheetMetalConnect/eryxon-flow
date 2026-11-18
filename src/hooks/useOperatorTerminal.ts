import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOperator } from "@/contexts/OperatorContext";
import { useCADProcessing } from "@/hooks/useCADProcessing";
import { useProfile } from "@/hooks/useProfile";
import { useTerminalActions } from "@/hooks/operator-terminal/useTerminalActions";
import { useTerminalData } from "@/hooks/operator-terminal/useTerminalData";
import { useTerminalFiles } from "@/hooks/operator-terminal/useTerminalFiles";
import { useTerminalJobs } from "@/hooks/operator-terminal/useTerminalJobs";
import { useTerminalMode } from "@/hooks/operator-terminal/useTerminalMode";
import { useTerminalScanner } from "@/hooks/operator-terminal/useTerminalScanner";

export type { BatchPromptState } from "@/features/operator-terminal/model";

export function useOperatorTerminal() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const data = useTerminalData(profile?.tenant_id, t);
  const mode = useTerminalMode({
    operatorId,
    schedule: data.workingHoursSchedule,
    settings: data.workModeSettings,
    settingsLoaded: data.workModeSettingsLoaded,
    tenantId: profile?.tenant_id,
  });
  const jobs = useTerminalJobs({
    locationByPart: data.locationByPart,
    lookupOperations: data.lookupOperations,
    operations: data.operations,
    operatorId,
    producedByOperation: data.producedByOperation,
    selectedMode: mode.selectedTerminalMode,
    sequentialRelease: data.sequentialRelease,
    settings: data.workModeSettings,
    t,
    workingHoursActive: mode.workingHoursActive,
  });
  const actions = useTerminalActions({
    allJobs: jobs.allJobs,
    batchPrompt: jobs.selectedBatchPrompt,
    clearBatchMode: jobs.clearBatchMode,
    currentMode: jobs.currentTerminalMode,
    operatorId,
    selectedJob: jobs.selectedJob,
    setSelectedJobId: jobs.setSelectedJobId,
    settings: data.workModeSettings,
    t,
    tenantId: profile?.tenant_id,
    workingHoursActive: mode.workingHoursActive,
  });
  const onScanSelect = useCallback((operationId: string) => {
    jobs.setSelectedJobId(operationId);
    const target = jobs.allJobs.find((job) => job.operationId === operationId);
    if (target) actions.promptSwitch(target);
  }, [actions.promptSwitch, jobs.allJobs, jobs.setSelectedJobId]);
  const scanner = useTerminalScanner({
    lookupOperations: data.lookupOperations,
    onSelect: onScanSelect,
    operatorId,
    selectedCellId: jobs.selectedCellId,
    setSelectedCellId: jobs.setSelectedCellId,
  });
  const { processCAD } = useCADProcessing();
  const files = useTerminalFiles({ processCAD, selectedJob: jobs.selectedJob, t });

  return {
    loading: data.loading,
    cells: data.cells,
    workModeSettings: data.workModeSettings,
    currentTerminalMode: jobs.currentTerminalMode,
    selectedTerminalMode: mode.selectedTerminalMode,
    setSelectedTerminalMode: mode.setSelectedTerminalMode,
    workingHoursActive: mode.workingHoursActive,
    terminalModeCounts: jobs.terminalModeCounts,
    selectedCellId: jobs.selectedCellId,
    handleCellChange: jobs.handleCellChange,
    filteredJobs: jobs.filteredJobs,
    inProcessJobs: jobs.inProcessJobs,
    inBufferJobs: jobs.inBufferJobs,
    expectedJobs: jobs.expectedJobs,
    selectedJobId: jobs.selectedJobId,
    setSelectedJobId: jobs.setSelectedJobId,
    selectedJob: jobs.selectedJob,
    selectedPartOperations: jobs.selectedPartOperations,
    selectedBatchPrompt: jobs.selectedBatchPrompt,
    selectBatchMode: jobs.selectBatchMode,
    clearBatchMode: jobs.clearBatchMode,
    startActionLabel: jobs.startActionLabel,
    pauseActionLabel: jobs.pauseActionLabel,
    showCompleteAction: jobs.showCompleteAction,
    ...files,
    ...scanner,
    ...actions,
    loadData: data.loadData,
  };
}
