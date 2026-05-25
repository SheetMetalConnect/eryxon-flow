/**
 * ERY-93: scheduled-execution core for the ERY-43 pilot alert evaluator.
 *
 * This module is the timer-driven entrypoint logic, kept free of Deno-only
 * imports so it runs under vitest. It does three things and nothing else:
 *
 *   1. map persisted `activity_log` rows (the ERY-46 observability event source)
 *      into the engine's `PilotSignalEvent` shape;
 *   2. derive the supplemental `EvaluationContext` (live tenants, backlog ages,
 *      last backup time) from the same window of rows;
 *   3. run the existing `evaluateAndDispatch` engine over that window.
 *
 * No new alert semantics live here — thresholds, classes, routing, and the
 * transport all come from `alerting.ts`. The HTTP/auth/cron wrapper lives in
 * `../pilot-alert-evaluator/index.ts`; this is the part we can prove with a
 * deterministic timer-driven test.
 */
import {
  DEFAULT_THRESHOLDS,
  evaluateAndDispatch,
  type AlertNotification,
  type AlertThresholds,
  type AlertTransport,
  type EvaluationContext,
  type PilotLogLevel,
  type PilotSignalEvent,
} from "./alerting.ts";

/** Default lookback window for one scheduled evaluation pass. */
export const DEFAULT_LOOKBACK_MS = 15 * 60_000;

/**
 * Subset of `activity_log` columns the evaluator reads. `metadata` carries the
 * ERY-46 request-correlation contract (service/route/status_code/event_type/
 * error_code/duration_ms/severity).
 */
export interface ActivityLogRow {
  tenant_id: string | null;
  action: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function levelOrUndefined(value: unknown): PilotLogLevel | undefined {
  return value === "debug" || value === "info" || value === "warn" || value === "error"
    ? value
    : undefined;
}

/**
 * Map one persisted activity_log row into a `PilotSignalEvent`. Reads timestamp
 * from `created_at` and the correlation fields from `metadata`. The row's
 * `action` is used as a fallback event type when metadata omits it.
 */
export function mapActivityRowToSignal(row: ActivityLogRow): PilotSignalEvent {
  const m = row.metadata ?? {};
  return {
    timestamp: Date.parse(row.created_at),
    service: stringOrUndefined(m.service),
    route: stringOrUndefined(m.route),
    statusCode: numberOrUndefined(m.status_code),
    level: levelOrUndefined(m.severity),
    eventType: stringOrUndefined(m.event_type) ?? stringOrUndefined(row.action),
    errorCode: stringOrUndefined(m.error_code),
    tenantId: stringOrUndefined(row.tenant_id),
    durationMs: numberOrUndefined(m.duration_ms),
    jobName: stringOrUndefined(m.job_name),
  };
}

export interface ScheduleContextOptions {
  /** Evaluation "now", epoch millis. Injected for deterministic runs. */
  now: number;
  /**
   * Epoch millis of the last successful backup/export, if known out-of-band.
   * The activity_log window does not carry backup completion on its own.
   */
  lastBackupAt?: number;
  /** Explicit global auth-outage signal, if asserted by the caller. */
  globalAuthOutage?: boolean;
  /**
   * Override the live-tenant set used for P0 promotion. Defaults to the
   * distinct tenants observed in the window.
   */
  liveTenantIds?: string[];
}

/**
 * Derive the supplemental `EvaluationContext` from a window of signals.
 *
 * - `liveTenantIds`: distinct tenant ids seen in the window (caller can override
 *   with the authoritative pilot tenant set).
 * - `jobBacklogAgeMs`: per `job_name`, the age of the oldest failing job event
 *   in the window — a conservative proxy the event stream can supply on its own.
 */
export function buildEvaluationContext(
  events: PilotSignalEvent[],
  opts: ScheduleContextOptions,
): EvaluationContext {
  const observedTenants = new Set<string>();
  const oldestFailureByJob: Record<string, number> = {};

  for (const ev of events) {
    if (ev.tenantId) observedTenants.add(ev.tenantId);

    const failed = ev.level === "error" || (ev.statusCode ?? 0) >= 500;
    if (failed && ev.jobName) {
      const existing = oldestFailureByJob[ev.jobName];
      if (existing === undefined || ev.timestamp < existing) {
        oldestFailureByJob[ev.jobName] = ev.timestamp;
      }
    }
  }

  const jobBacklogAgeMs: Record<string, number> = {};
  for (const [job, firstSeen] of Object.entries(oldestFailureByJob)) {
    jobBacklogAgeMs[job] = Math.max(0, opts.now - firstSeen);
  }

  return {
    now: opts.now,
    liveTenantIds: opts.liveTenantIds ?? [...observedTenants],
    jobBacklogAgeMs: Object.keys(jobBacklogAgeMs).length ? jobBacklogAgeMs : undefined,
    lastBackupAt: opts.lastBackupAt,
    globalAuthOutage: opts.globalAuthOutage,
  };
}

export interface ScheduledEvaluationResult {
  evaluatedAt: string;
  windowStart: string;
  windowEnd: string;
  eventCount: number;
  liveTenantCount: number;
  notifications: AlertNotification[];
}

export interface RunScheduledEvaluationInput {
  rows: ActivityLogRow[];
  transport: AlertTransport;
  context: ScheduleContextOptions;
  thresholds?: AlertThresholds;
  /** Window length in millis, only used to report `windowStart` in the result. */
  lookbackMs?: number;
}

/**
 * Timer-driven evaluation pass: map rows → derive context → evaluate + dispatch.
 * Returns a structured summary suitable for both the HTTP response and a
 * captured verification artifact.
 */
export async function runScheduledEvaluation(
  input: RunScheduledEvaluationInput,
): Promise<ScheduledEvaluationResult> {
  const { rows, transport, context } = input;
  const lookbackMs = input.lookbackMs ?? DEFAULT_LOOKBACK_MS;
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;

  const events = rows.map(mapActivityRowToSignal);
  const ctx = buildEvaluationContext(events, context);
  const notifications = await evaluateAndDispatch(events, ctx, transport, thresholds);

  return {
    evaluatedAt: new Date(context.now).toISOString(),
    windowStart: new Date(context.now - lookbackMs).toISOString(),
    windowEnd: new Date(context.now).toISOString(),
    eventCount: events.length,
    liveTenantCount: ctx.liveTenantIds.length,
    notifications,
  };
}
