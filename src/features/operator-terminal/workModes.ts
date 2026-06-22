export type OperatorTerminalMode = "not_working" | "setup" | "production";

export interface OperatorTerminalWorkModeSettings {
  enabled: boolean;
  enforceWorkingHours: boolean;
  setupPrepEnabled: boolean;
  setupRequired: boolean;
}

export interface OperatorTerminalSchedule {
  openingTime: string | null;
  closingTime: string | null;
  timezone: string | null;
}

export interface TerminalJobModeSummary {
  activeMode: Exclude<OperatorTerminalMode, "not_working"> | null;
  hasSetupHistory: boolean;
  requiresSetup: boolean;
  readiness:
    | "not_working"
    | "blocked_working_hours"
    | "blocked_setup"
    | "ready_for_setup"
    | "ready_for_production"
    | "in_setup"
    | "in_production";
}

export const DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS: OperatorTerminalWorkModeSettings = {
  enabled: false,
  enforceWorkingHours: true,
  setupPrepEnabled: true,
  setupRequired: true,
};

export const OPERATOR_TERMINAL_MODE_FEATURE_FLAG_KEY = "operatorTerminalWorkModes";
export const OPERATOR_TERMINAL_MODE_NOTE_PREFIX = "operator-mode:";

export function getOperatorTerminalWorkModeSettings(
  featureFlags: unknown,
): OperatorTerminalWorkModeSettings {
  const raw =
    featureFlags &&
    typeof featureFlags === "object" &&
    OPERATOR_TERMINAL_MODE_FEATURE_FLAG_KEY in featureFlags
      ? (featureFlags as Record<string, unknown>)[OPERATOR_TERMINAL_MODE_FEATURE_FLAG_KEY]
      : null;

  if (!raw || typeof raw !== "object") {
    return DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS;
  }

  const parsed = raw as Record<string, unknown>;

  return {
    enabled:
      typeof parsed.enabled === "boolean"
        ? parsed.enabled
        : DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS.enabled,
    enforceWorkingHours:
      typeof parsed.enforceWorkingHours === "boolean"
        ? parsed.enforceWorkingHours
        : DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS.enforceWorkingHours,
    setupPrepEnabled:
      typeof parsed.setupPrepEnabled === "boolean"
        ? parsed.setupPrepEnabled
        : DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS.setupPrepEnabled,
    setupRequired:
      typeof parsed.setupRequired === "boolean"
        ? parsed.setupRequired
        : DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS.setupRequired,
  };
}

export function mergeOperatorTerminalWorkModeSettings(
  featureFlags: unknown,
  settings: OperatorTerminalWorkModeSettings,
) {
  const base =
    featureFlags && typeof featureFlags === "object" && !Array.isArray(featureFlags)
      ? { ...(featureFlags as Record<string, unknown>) }
      : {};

  base[OPERATOR_TERMINAL_MODE_FEATURE_FLAG_KEY] = settings;
  return base;
}

export function buildOperatorTerminalModeNote(
  mode: Exclude<OperatorTerminalMode, "not_working">,
) {
  return `${OPERATOR_TERMINAL_MODE_NOTE_PREFIX}${mode}`;
}

export function parseOperatorTerminalModeNote(
  note: string | null | undefined,
): Exclude<OperatorTerminalMode, "not_working"> | null {
  if (!note?.startsWith(OPERATOR_TERMINAL_MODE_NOTE_PREFIX)) {
    return null;
  }

  const mode = note.slice(OPERATOR_TERMINAL_MODE_NOTE_PREFIX.length);
  return mode === "setup" || mode === "production" ? mode : null;
}

export function parseTimeStringToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getLocalMinutes(now: Date, timeZone: string | null) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number.parseInt(
    parts.find((part) => part.type === "hour")?.value ?? "",
    10,
  );
  const minute = Number.parseInt(
    parts.find((part) => part.type === "minute")?.value ?? "",
    10,
  );

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

export function isWorkingHoursActive(
  schedule: OperatorTerminalSchedule,
  now = new Date(),
) {
  const openingMinutes = parseTimeStringToMinutes(schedule.openingTime);
  const closingMinutes = parseTimeStringToMinutes(schedule.closingTime);
  const localMinutes = getLocalMinutes(now, schedule.timezone);

  if (
    openingMinutes === null ||
    closingMinutes === null ||
    localMinutes === null
  ) {
    return true;
  }

  if (openingMinutes === closingMinutes) {
    return true;
  }

  if (openingMinutes < closingMinutes) {
    return localMinutes >= openingMinutes && localMinutes < closingMinutes;
  }

  return localMinutes >= openingMinutes || localMinutes < closingMinutes;
}

export function getTerminalJobModeSummary(args: {
  activeMode: Exclude<OperatorTerminalMode, "not_working"> | null;
  settings: OperatorTerminalWorkModeSettings;
  selectedMode: OperatorTerminalMode;
  hasSetupHistory: boolean;
  workingHoursActive: boolean;
}) {
  const { activeMode, settings, selectedMode, hasSetupHistory, workingHoursActive } = args;
  const requiresSetup = settings.enabled && settings.setupPrepEnabled && settings.setupRequired;

  let readiness: TerminalJobModeSummary["readiness"] = "ready_for_production";

  if (activeMode === "setup") {
    readiness = "in_setup";
  } else if (activeMode === "production") {
    readiness = "in_production";
  } else if (settings.enabled && settings.enforceWorkingHours && !workingHoursActive) {
    readiness = "blocked_working_hours";
  } else if (settings.enabled && selectedMode === "not_working") {
    readiness = "not_working";
  } else if (requiresSetup && !hasSetupHistory) {
    readiness = selectedMode === "setup" ? "ready_for_setup" : "blocked_setup";
  } else if (settings.enabled && selectedMode === "setup") {
    readiness = "ready_for_setup";
  }

  return {
    activeMode,
    hasSetupHistory,
    requiresSetup,
    readiness,
  } satisfies TerminalJobModeSummary;
}
