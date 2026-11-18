export const OPERATOR_RESUME_STORAGE_KEY = "active_operator";
export const OPERATOR_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const OPERATOR_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const OPERATOR_SESSION_CHECK_INTERVAL_MS = 15 * 1000;

export type OperatorSessionLockReason = "idle_timeout" | "session_expired" | null;
