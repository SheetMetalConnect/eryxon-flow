import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isWorkingHoursActive,
  type OperatorTerminalMode,
  type OperatorTerminalSchedule,
  type OperatorTerminalWorkModeSettings,
} from "@/features/operator-terminal/workModes";

interface TerminalModeOptions {
  operatorId: string | null | undefined;
  schedule: OperatorTerminalSchedule;
  settings: OperatorTerminalWorkModeSettings;
  settingsLoaded: boolean;
  tenantId: string | undefined;
}

export function useTerminalMode({
  operatorId,
  schedule,
  settings,
  settingsLoaded,
  tenantId,
}: TerminalModeOptions) {
  const [selectedTerminalMode, setSelectedTerminalMode] =
    useState<OperatorTerminalMode>("not_working");
  const storageKey = tenantId && operatorId
    ? `operator_terminal_mode:${tenantId}:${operatorId}`
    : null;

  const persistTerminalMode = useCallback((mode: OperatorTerminalMode) => {
    setSelectedTerminalMode(mode);
    if (storageKey) localStorage.setItem(storageKey, mode);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      setSelectedTerminalMode("not_working");
      return;
    }
    const stored = localStorage.getItem(storageKey);
    if (stored === "not_working" || stored === "setup" || stored === "production") {
      setSelectedTerminalMode(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (!settings.enabled && selectedTerminalMode !== "not_working") {
      persistTerminalMode("not_working");
    } else if (!settings.setupPrepEnabled && selectedTerminalMode === "setup") {
      persistTerminalMode("production");
    }
  }, [persistTerminalMode, selectedTerminalMode, settings, settingsLoaded]);

  const workingHoursActive = useMemo(
    () => isWorkingHoursActive(schedule),
    [schedule],
  );

  return {
    selectedTerminalMode,
    setSelectedTerminalMode: persistTerminalMode,
    workingHoursActive,
  };
}
