import { logger } from "./logger";

export interface CachedProfile {
  id: string;
  tenant_id: string;
  username: string;
  full_name: string;
  email: string;
  role: "operator" | "admin";
  active: boolean;
  is_machine: boolean;
  is_root_admin: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
}

export interface CachedTenant {
  id: string;
  name: string;
  company_name: string | null;
  plan: "free" | "pro" | "premium" | "enterprise";
  status: "active" | "cancelled" | "suspended" | "trial";
  trial_ends_at: string | null;
  working_days_mask: number | null;
  whitelabel_enabled: boolean;
  whitelabel_logo_url: string | null;
  whitelabel_app_name: string | null;
  whitelabel_primary_color: string | null;
  whitelabel_favicon_url: string | null;
}

export interface CachedActiveOperator {
  id: string;
  employee_id: string;
  full_name: string;
  tenant_id: string;
}

export interface CachedTerminalState {
  profile: CachedProfile | null;
  tenant: CachedTenant | null;
  activeOperator: CachedActiveOperator | null;
  selectedCellId: string | null;
  cachedAt: number;
}

export type ConnectionQuality = "online" | "degraded" | "offline";

const STORAGE_KEY = "eryxon_terminal_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function parseState(raw: string): CachedTerminalState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const state = parsed as Record<string, unknown>;
    if (typeof state.cachedAt !== "number") return null;
    return state as unknown as CachedTerminalState;
  } catch {
    return null;
  }
}

function write(state: CachedTerminalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    logger.warn("terminalCache", "Failed to write cache");
  }
}

export function readTerminalCache(): CachedTerminalState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseState(raw);
  } catch {
    return null;
  }
}

export function isCacheValid(state: CachedTerminalState | null): boolean {
  if (!state) return false;
  if (!state.cachedAt) return false;
  if (Date.now() - state.cachedAt > CACHE_TTL_MS) return false;
  return Boolean(state.profile || state.activeOperator);
}

export function updateTerminalCache(partial: Partial<CachedTerminalState>): void {
  const existing = readTerminalCache() ?? ({} as CachedTerminalState);
  write({
    ...existing,
    ...partial,
    cachedAt: Date.now(),
  });
}

export function clearTerminalCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignored */
  }
}

export function cacheFromProfile(profile: CachedProfile, tenant: CachedTenant | null): void {
  updateTerminalCache({ profile, tenant });
}
