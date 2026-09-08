import type { SupabaseClient } from "@supabase/supabase-js";
import { constantTimeCompare } from "./security.ts";
import { getRuntimeEnv } from "./runtime-env.ts";

function serviceRoleKey(): string {
  return getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY") ?? getRuntimeEnv("SUPABASE_SERVICE_KEY") ?? "";
}

// Deployments without INTERNAL_SERVICE_SECRET fall back to the service-role key.
export function internalEventHeaders(requestId?: string): Record<string, string> {
  const secret = getRuntimeEnv("INTERNAL_SERVICE_SECRET") || serviceRoleKey();
  if (!secret) throw new Error("INTERNAL_SERVICE_SECRET or the service-role key is required for internal event dispatch");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
    ...(requestId ? { "x-request-id": requestId } : {}),
  };
}

export async function authorizeEventRequest(
  req: Request,
  tenantId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !tenantId) return false;
  const internalSecret = getRuntimeEnv("INTERNAL_SERVICE_SECRET");
  if (internalSecret && constantTimeCompare(token, internalSecret)) return true;
  const serviceKey = serviceRoleKey();
  if (serviceKey && constantTimeCompare(token, serviceKey)) return true;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("tenant_id, active_tenant_id, is_root_admin, role, active")
    .eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.active === false) return false;
  const effectiveTenant = profile.is_root_admin
    ? profile.active_tenant_id ?? profile.tenant_id
    : profile.tenant_id;
  return effectiveTenant === tenantId && ["admin", "operator"].includes(profile.role);
}
