/**
 * Request-Correlated Observability Baseline (ERY-46 / ERY-39)
 *
 * Provides a single, edge-safe place to:
 * - resolve or mint a request id at the edge boundary (`x-request-id`)
 * - emit structured, single-line JSON log entries that carry the
 *   request-correlation contract (`requestId`, `service`, `route`, `method`,
 *   `statusCode`, `eventType`) so a pilot incident can be traced end-to-end
 * - persist pilot `warn`/`error` events and pilot-critical lifecycle events
 *   into `activity_log` metadata, with the SAME `request_id` as the edge logs.
 *
 * Design constraints:
 * - No `Deno`-only or `https://` top-level imports. Every symbol used here
 *   (Headers, crypto.randomUUID, console) exists in both Deno and Node, so the
 *   pure helpers can be unit-tested under vitest without a Deno runtime.
 * - The Supabase client is always passed in by the caller; this module never
 *   reads env or constructs a client.
 */

export const REQUEST_ID_HEADER = "x-request-id";

/** Max accepted length for an inbound request id (prevents header abuse). */
const MAX_REQUEST_ID_LENGTH = 200;
/** Allowed characters for an inbound request id (uuid/trace-id friendly). */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

export type PilotLogLevel = "debug" | "info" | "warn" | "error";

/**
 * The request-correlation contract carried by every edge log entry and
 * persisted pilot event.
 */
export interface RequestLogContext {
  requestId: string;
  service: string;
  route: string;
  method: string;
  statusCode?: number;
  eventType?: string;
  tenantId?: string;
  userId?: string;
  errorCode?: string;
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Pilot-critical lifecycle event types. These are persisted into
 * `activity_log` even at `info` level because they are the events CTO needs to
 * reconstruct a pilot incident timeline.
 */
export const PILOT_CRITICAL_EVENT_TYPES = new Set<string>([
  "auth.session_recovery",
  "auth.tenant_switch",
  "operator.login",
  "operator.time_entry",
  "issue.created",
  "job.lifecycle",
  "operation.lifecycle",
  "webhook.dispatch_failed",
  "mqtt.dispatch_failed",
]);

/**
 * Validate an inbound request id so we never echo arbitrary client input back
 * into logs/headers.
 */
export function isValidRequestId(value: string): boolean {
  if (!value) return false;
  if (value.length > MAX_REQUEST_ID_LENGTH) return false;
  return REQUEST_ID_PATTERN.test(value);
}

/**
 * Resolve the request id for this request: trust a valid inbound
 * `x-request-id`, otherwise mint a fresh uuid at the edge boundary.
 */
export function resolveRequestId(headers: Headers): string {
  const inbound = headers.get(REQUEST_ID_HEADER)?.trim();
  if (inbound && isValidRequestId(inbound)) {
    return inbound;
  }
  return crypto.randomUUID();
}

/**
 * Persistence filter: decide whether a logged event should be written to
 * `activity_log`. `warn`/`error` always persist; otherwise only
 * pilot-critical lifecycle event types persist.
 */
export function shouldPersistPilotEvent(opts: {
  level: PilotLogLevel;
  eventType?: string;
}): boolean {
  if (opts.level === "warn" || opts.level === "error") return true;
  if (opts.eventType && PILOT_CRITICAL_EVENT_TYPES.has(opts.eventType)) {
    return true;
  }
  return false;
}

/** Shape of the metadata blob persisted alongside a pilot activity_log row. */
export interface PilotActivityMetadata {
  request_id: string;
  service: string;
  route: string;
  method: string;
  severity: PilotLogLevel;
  status_code?: number;
  event_type?: string;
  error_code?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface PilotActivityRow {
  tenant_id: string;
  action: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  user_id: string | null;
  metadata: PilotActivityMetadata;
}

export interface PilotEventInput {
  ctx: RequestLogContext;
  level: PilotLogLevel;
  /** activity_log.action, e.g. "issue.created" or "edge.error". */
  action: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  /** Extra metadata merged into the persisted row (and not overriding the contract). */
  extra?: Record<string, unknown>;
}

/**
 * Build the `activity_log` insert row for a pilot event, embedding the request
 * correlation contract into `metadata`. Pure + deterministic for testing.
 */
export function buildPilotActivityRow(input: PilotEventInput): PilotActivityRow {
  const { ctx, level } = input;
  const metadata: PilotActivityMetadata = {
    ...input.extra,
    request_id: ctx.requestId,
    service: ctx.service,
    route: ctx.route,
    method: ctx.method,
    severity: level,
    status_code: ctx.statusCode,
    event_type: ctx.eventType,
    error_code: ctx.errorCode,
    duration_ms: ctx.durationMs,
  };

  return {
    tenant_id: ctx.tenantId ?? "",
    action: input.action,
    description: input.description ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    entity_name: input.entityName ?? null,
    user_id: ctx.userId ?? null,
    metadata,
  };
}

/**
 * Emit a structured single-line JSON log entry. Edge log ingestion can grep on
 * `request_id` / `service` / `route` to follow one request across functions.
 */
export function edgeLog(
  level: PilotLogLevel,
  message: string,
  ctx: RequestLogContext,
): void {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    request_id: ctx.requestId,
    service: ctx.service,
    route: ctx.route,
    method: ctx.method,
    status_code: ctx.statusCode,
    event_type: ctx.eventType,
    error_code: ctx.errorCode,
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    duration_ms: ctx.durationMs,
  });

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "info":
      console.info(line);
      break;
    default:
      console.debug(line);
  }
}

/** Minimal Supabase client surface this module depends on. */
export interface ActivityLogWriter {
  from(table: string): {
    insert(row: unknown): Promise<{ error: unknown }>;
  };
}

/**
 * Persist a pilot event into `activity_log` when it passes the persistence
 * filter and we have a tenant to attribute it to. Never throws: a persistence
 * failure is logged but must not break the request path.
 */
export async function persistPilotEvent(
  supabase: ActivityLogWriter,
  input: PilotEventInput,
): Promise<boolean> {
  if (!shouldPersistPilotEvent({ level: input.level, eventType: input.ctx.eventType })) {
    return false;
  }
  // activity_log.tenant_id is NOT NULL; skip events we cannot attribute
  // (e.g. failures before authentication established a tenant).
  if (!input.ctx.tenantId) {
    return false;
  }

  try {
    const row = buildPilotActivityRow(input);
    const { error } = await supabase.from("activity_log").insert(row);
    if (error) {
      edgeLog("error", "Failed to persist pilot activity event", {
        ...input.ctx,
        errorCode: "ACTIVITY_LOG_WRITE_FAILED",
      });
      return false;
    }
    return true;
  } catch (err) {
    edgeLog("error", "Unexpected error persisting pilot activity event", {
      ...input.ctx,
      errorCode: "ACTIVITY_LOG_WRITE_FAILED",
    });
    return false;
  }
}
