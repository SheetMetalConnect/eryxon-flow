import { createClient } from "@supabase/supabase-js";

import { corsHeaders as _baseCorsHeaders } from "@shared/cors.ts";
import { createLoggingAlertTransport } from "@shared/alerting.ts";
import { edgeLog } from "@shared/observability.ts";
import {
  DEFAULT_LOOKBACK_MS,
  runScheduledEvaluation,
  type ActivityLogRow,
} from "@shared/pilot-alert-schedule.ts";

/**
 * ERY-93: scheduled execution path for the ERY-43 pilot alert evaluator.
 *
 * Timer-driven entrypoint that runs ERY-40 alert evaluation without manual
 * invocation. It reads the last `lookback_ms` of `activity_log` rows (the
 * ERY-46 observability event source), runs the ERY-43 engine, and dispatches
 * fired alerts through the least-privilege logging transport (structured edge
 * log + optional `alert.fired` activity_log row; no secrets, no outbound calls).
 *
 * Invocation:
 * - In production this is called by pg_cron via net.http_post on a fixed
 *   schedule (see supabase/migrations/*_pilot_alert_evaluator_cron.sql).
 * - It can also be POSTed manually with the cron secret / service role key for
 *   the documented dry-run.
 *
 * Deploy-gate prerequisites (must exist in the target environment):
 * - CRON_SECRET set on this function (used by the pg_cron caller).
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY available to the function.
 * - pg_cron + pg_net enabled (already enabled in this project) and the cron
 *   job registered by the accompanying migration.
 */

const corsHeaders = {
  ..._baseCorsHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-request-id",
};

const SERVICE = "pilot-alert-evaluator";

/** Authenticate via cron secret or service role key (same model as monthly-reset-cron). */
function authenticateCron(req: Request): boolean {
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");
  if (authHeader && serviceRoleKey) {
    return authHeader.replace("Bearer ", "") === serviceRoleKey;
  }
  return false;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(
      { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is allowed" } },
      405,
    );
  }
  if (!authenticateCron(req)) {
    edgeLog("warn", "Unauthorized pilot-alert-evaluator invocation", {
      requestId: `${SERVICE}-unauth`,
      service: SERVICE,
      route: "/pilot-alert-evaluator",
      method: "POST",
      errorCode: "UNAUTHORIZED",
    });
    return json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret or service role key" } },
      401,
    );
  }

  // Optional overrides from the cron body (all bounded / least-privilege).
  let lookbackMs = DEFAULT_LOOKBACK_MS;
  let lastBackupAt: number | undefined;
  let globalAuthOutage: boolean | undefined;
  let liveTenantIds: string[] | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.lookback_ms === "number" && body.lookback_ms > 0) {
      lookbackMs = Math.min(body.lookback_ms, 6 * 60 * 60_000); // cap at 6h
    }
    if (typeof body.last_backup_at === "number") lastBackupAt = body.last_backup_at;
    if (typeof body.global_auth_outage === "boolean") globalAuthOutage = body.global_auth_outage;
    if (Array.isArray(body.live_tenant_ids)) {
      liveTenantIds = body.live_tenant_ids.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Body is optional; defaults are fine.
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const now = Date.now();
  const windowStartIso = new Date(now - lookbackMs).toISOString();

  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("tenant_id, action, created_at, metadata")
      .gte("created_at", windowStartIso)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) {
      throw new Error(`activity_log read failed: ${error.message}`);
    }

    const rows = (data ?? []) as ActivityLogRow[];
    const transport = createLoggingAlertTransport({ supabase, service: SERVICE });

    const result = await runScheduledEvaluation({
      rows,
      transport,
      lookbackMs,
      context: { now, lastBackupAt, globalAuthOutage, liveTenantIds },
    });

    edgeLog("info", `Scheduled alert evaluation completed: ${result.notifications.length} fired`, {
      requestId: `${SERVICE}-${result.evaluatedAt}`,
      service: SERVICE,
      route: "/pilot-alert-evaluator",
      method: "POST",
      eventType: "alert.scheduled_run",
    });

    return json({
      success: true,
      data: {
        evaluated_at: result.evaluatedAt,
        window_start: result.windowStart,
        window_end: result.windowEnd,
        event_count: result.eventCount,
        live_tenant_count: result.liveTenantCount,
        fired_count: result.notifications.length,
        fired: result.notifications.map((n) => ({
          class_id: n.classId,
          severity: n.severity,
          channel: n.channel,
          pages: n.pages,
          reason: n.reason,
          affected_tenants: n.affectedTenants,
          fired_at: n.firedAt,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    edgeLog("error", "pilot-alert-evaluator run failed", {
      requestId: `${SERVICE}-error`,
      service: SERVICE,
      route: "/pilot-alert-evaluator",
      method: "POST",
      errorCode: "INTERNAL_ERROR",
    });
    return json(
      { success: false, error: { code: "INTERNAL_ERROR", message, timestamp: new Date().toISOString() } },
      500,
    );
  }
});
