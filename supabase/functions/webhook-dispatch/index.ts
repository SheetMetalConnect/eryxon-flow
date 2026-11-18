import { createClient } from "@supabase/supabase-js";
import { authorizeEventRequest } from "../_shared/event-auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getRuntimeEnv } from "../_shared/runtime-env.ts";
import { sanitizeError } from "../_shared/security.ts";
import { REQUEST_ID_HEADER, edgeLog, persistPilotEvent, resolveRequestId, type RequestLogContext } from "../_shared/observability.ts";
import { deliverWithRetry, isRetryableStatus } from "./retry.ts";
import { isAllowedTarget, signWebhook } from "./sign.ts";

const DISABLE_AFTER_FAILURES = 25;
const RESPONSE_EXCERPT = 500;

interface Endpoint { id: string; url: string; secret_key: string; consecutive_failures: number }
interface Envelope { id: string; event: string; occurred_at: string; tenant_id: string; data: unknown }

const json = (body: unknown, status: number, requestId: string) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: requestId } });

// deno-lint-ignore no-explicit-any
async function deliver(supabase: any, endpoint: Endpoint, envelope: Envelope, log: RequestLogContext) {
  const body = JSON.stringify(envelope);
  const deliveryId = crypto.randomUUID();
  const started = Date.now();
  const allowPrivate = getRuntimeEnv("WEBHOOK_ALLOW_PRIVATE_TARGETS") === "true";
  const result = isAllowedTarget(endpoint.url, allowPrivate)
    ? await deliverWithRetry(async () => {
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Eryxon-Webhooks/2",
            "X-Eryxon-Signature": await signWebhook(endpoint.secret_key, body),
            "X-Eryxon-Event": envelope.event,
            "X-Eryxon-Event-Id": envelope.id,
            "X-Eryxon-Delivery-Id": deliveryId,
          },
          body,
          redirect: "manual",
          signal: AbortSignal.timeout(10_000),
        });
        const responseText = (await response.text()).slice(0, RESPONSE_EXCERPT);
        return { success: response.ok, retryable: isRetryableStatus(response.status), statusCode: response.status, responseText };
      } catch (error) {
        return { success: false, retryable: true, statusCode: null, error: error instanceof Error ? error.message : String(error) };
      }
    })
    : { success: false, retryable: false, statusCode: null, attempts: 0, error: "Target must be a public https:// URL" };

  const failures = result.success ? 0 : endpoint.consecutive_failures + 1;
  const disable = failures >= DISABLE_AFTER_FAILURES;
  await Promise.all([
    supabase.from("webhook_deliveries").insert({
      id: deliveryId, tenant_id: envelope.tenant_id, webhook_id: endpoint.id, event_id: envelope.id, event: envelope.event,
      payload: envelope, status: result.success ? "delivered" : "failed", status_code: result.statusCode,
      attempts: result.attempts, latency_ms: Date.now() - started,
      error: result.success ? null : result.error ?? `HTTP ${result.statusCode}: ${result.responseText ?? ""}`.trim(),
    }),
    supabase.from("webhooks").update({
      last_delivery_at: new Date().toISOString(), last_status_code: result.statusCode, consecutive_failures: failures,
      ...(disable ? { active: false, disabled_reason: `Disabled after ${failures} consecutive failed deliveries` } : {}),
    }).eq("id", endpoint.id),
  ]);

  if (!result.success) {
    const failureLog: RequestLogContext = { ...log, statusCode: result.statusCode ?? undefined, eventType: "webhook.dispatch_failed", errorCode: "WEBHOOK_DELIVERY_FAILED" };
    edgeLog("warn", "webhook.dispatch_failed", failureLog);
    await persistPilotEvent(supabase, {
      ctx: failureLog, level: disable ? "error" : "warn", action: "webhook.dispatch_failed",
      description: `Webhook ${endpoint.id} failed for ${envelope.event}${disable ? " and was disabled" : ""}`,
      entityType: "webhook", entityId: endpoint.id, extra: { event: envelope.event, http_status: result.statusCode, error: result.error },
    });
  }
  return { webhook_id: endpoint.id, delivery_id: deliveryId, success: result.success, status_code: result.statusCode, attempts: result.attempts };
}

Deno.serve(async (req) => {
  const requestId = resolveRequestId(req.headers);
  const log: RequestLogContext = { requestId, service: "webhook-dispatch", route: new URL(req.url).pathname, method: req.method };
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...corsHeaders, [REQUEST_ID_HEADER]: requestId } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? "");
  try {
    const { tenant_id, event, data, event_id, occurred_at, webhook_id } = await req.json();
    if (!await authorizeEventRequest(req, tenant_id, supabase)) return json({ success: false, error: "Unauthorized" }, 401, requestId);
    if (!tenant_id || !event || data === undefined) return json({ success: false, error: "tenant_id, event and data are required" }, 400, requestId);
    log.tenantId = tenant_id;
    log.eventType = event;

    let query = supabase.from("webhooks").select("id, url, secret_key, consecutive_failures").eq("tenant_id", tenant_id);
    query = webhook_id ? query.eq("id", webhook_id) : query.eq("active", true).contains("events", [event]);
    const { data: endpoints, error } = await query;
    if (error) throw error;

    const envelope: Envelope = { id: event_id ?? crypto.randomUUID(), event, occurred_at: occurred_at ?? new Date().toISOString(), tenant_id, data };
    const results = await Promise.all((endpoints ?? []).map((endpoint: Endpoint) => deliver(supabase, endpoint, envelope, log)));
    return json({ success: true, dispatched: results.length, failed: results.filter((r) => !r.success).length, results }, 200, requestId);
  } catch (error) {
    const errorLog: RequestLogContext = { ...log, statusCode: 500, errorCode: "WEBHOOK_DISPATCH_ERROR" };
    edgeLog("error", "request.failed", errorLog);
    await persistPilotEvent(supabase, { ctx: { ...errorLog, eventType: "webhook.dispatch_failed" }, level: "error", action: "webhook.dispatch_failed", description: sanitizeError(error).message });
    return json({ success: false, error: sanitizeError(error).message }, 500, requestId);
  }
});
