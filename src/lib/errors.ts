import type { TFunction } from "i18next";

// Messages raised by transition_operation / time_entry_action (see the
// production lifecycle migrations). Anything unmapped falls through as-is.
const PRODUCTION_ERROR_KEYS: Record<string, string> = {
  "Stop active work before starting another operation": "production.errors.activeElsewhere",
  "Completed operation cannot start": "production.errors.alreadyCompleted",
  "Only a paused operation can resume": "production.errors.notPaused",
  "Only an operation in progress can pause": "production.errors.notInProgress",
  "Resolve the active standstill before restarting": "production.errors.standstill",
  "Operator is required": "production.errors.operatorRequired",
  "Start the operation before completing it": "production.errors.notStarted",
  "Stop active time entries before completing": "production.errors.timersOpen",
  "Operation not found": "production.errors.notFound",
  "Previous operation must be completed first": "production.errors.notReleased",
};

export function productionErrorMessage(error: unknown, t: TFunction, fallbackKey = "notifications.failed") {
  const message = error instanceof Error ? error.message : "";
  const key = PRODUCTION_ERROR_KEYS[message];
  if (key) return t(key);
  return message || t(fallbackKey);
}
