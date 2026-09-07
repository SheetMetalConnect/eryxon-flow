import { ROUTES } from "./constants";

interface LocationLike {
  pathname: string;
  search?: string;
  hash?: string;
}

function isSafeAppPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

export function buildReturnTo(location: LocationLike): string {
  return `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
}

export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !isSafeAppPath(value)) return null;
  if (value === ROUTES.AUTH || (value === ROUTES.OPERATOR.LOGIN || value === "/m/login")) return null;
  return value;
}

export function readReturnTo(state: unknown): string | null {
  if (!state || typeof state !== "object" || !("from" in state)) return null;
  const from = (state as { from?: unknown }).from;
  return typeof from === "string" ? sanitizeReturnTo(from) : null;
}

export function resolvePostAuthTarget({ role, state }: {
  role?: string | null;
  state: unknown;
}): string {
  const returnTo = readReturnTo(state);
  if (returnTo) return returnTo;
  return role === "admin" ? ROUTES.ADMIN.DASHBOARD : ROUTES.OPERATOR.WORK_QUEUE;
}
