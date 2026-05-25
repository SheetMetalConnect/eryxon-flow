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
  if (value === ROUTES.AUTH || value === ROUTES.MOBILE.LOGIN) return null;
  return value;
}

export function readReturnTo(state: unknown): string | null {
  if (!state || typeof state !== "object" || !("from" in state)) return null;
  const from = (state as { from?: unknown }).from;
  return typeof from === "string" ? sanitizeReturnTo(from) : null;
}

export function resolveOperatorHomeTarget(preferMobileShell: boolean): string {
  return preferMobileShell ? ROUTES.MOBILE.QUEUE : ROUTES.OPERATOR.WORK_QUEUE;
}

export function resolvePostAuthTarget({
  role,
  preferMobileShell,
  state,
}: {
  role?: string | null;
  preferMobileShell: boolean;
  state: unknown;
}): string {
  const returnTo = readReturnTo(state);
  if (returnTo) return returnTo;
  if (role === "admin") return ROUTES.ADMIN.DASHBOARD;
  return resolveOperatorHomeTarget(preferMobileShell);
}

export function resolvePostMobileLoginTarget(state: unknown): string {
  return readReturnTo(state) ?? ROUTES.MOBILE.QUEUE;
}
