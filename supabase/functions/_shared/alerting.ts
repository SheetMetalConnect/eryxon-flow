/**
 * Pilot Alerting + Routing Baseline (ERY-43 / ERY-40)
 *
 * Implements the first live alert delivery path defined in the ERY-20-02
 * alerting + on-call runbook on top of the ERY-39/ERY-46 observability
 * baseline. The event source is the request-correlated signal stream that
 * `observability.ts` writes to edge logs and `activity_log.metadata`
 * (`request_id`, `service`, `route`, `severity`, `status_code`, `event_type`,
 * `error_code`, `duration_ms`).
 *
 * Design constraints (kept identical to observability.ts so this stays
 * reversible and stack-agnostic):
 * - No `Deno`-only or `https://` imports. The evaluators and routing are pure
 *   functions, unit-testable under vitest without a Deno runtime.
 * - Event *semantics* (alert classes, severity policy, routing) are separated
 *   from *transport*. Thresholds live in a config object and the delivery
 *   channel is an injected {@link AlertTransport}, so the team can change
 *   vendors or tune numbers without rewriting what an alert *means*.
 * - Default transport is least-privilege: it only writes structured logs and
 *   (optionally) an `alert.fired` row into `activity_log`. No secrets, no
 *   external network calls. A real pager/webhook transport implements the same
 *   interface and drops in without touching evaluation logic.
 */

import {
  edgeLog,
  persistPilotEvent,
  type ActivityLogWriter,
  type PilotLogLevel,
  type RequestLogContext,
} from "./observability.ts";

// ---------------------------------------------------------------------------
// Severity, routing, and alert class taxonomy (from the ERY-20-02 runbook)
// ---------------------------------------------------------------------------

export type AlertSeverity = "P0" | "P1" | "P2" | "P3";

/** Where an alert is delivered. P0/P1 page; P2 notifies async; P3 is a ticket. */
export type RouteChannel = "page" | "async_notify" | "ticket";

/** Responder identities from the runbook ownership model. */
export type Responder = "engineer" | "cto" | "ceo";

export type AlertClassId =
  | "flow.pilot.api_error_rate"
  | "flow.pilot.job_failure"
  | "flow.pilot.auth_lockout"
  | "flow.pilot.latency_core_ops"
  | "flow.pilot.backup_gap";

export interface AlertClassDefinition {
  id: AlertClassId;
  /** Human description of what the alert detects. */
  description: string;
  /** Default severity before any promotion rule is applied. */
  defaultSeverity: AlertSeverity;
  /** Whether this class can promote above its default (e.g. P1 -> P0). */
  canPromote: boolean;
  /** First-responder verification step from the runbook. */
  firstVerification: string;
}

/**
 * The five initial pilot alert classes, mirroring the runbook table. This is
 * the single source of truth for alert metadata; thresholds are kept separate
 * in {@link AlertThresholds} so they can be tuned independently.
 */
export const ALERT_CLASSES: Record<AlertClassId, AlertClassDefinition> = {
  "flow.pilot.api_error_rate": {
    id: "flow.pilot.api_error_rate",
    description:
      "Server-side failure spike on pilot-critical endpoints in a short window.",
    defaultSeverity: "P1",
    canPromote: true,
    firstVerification:
      "Confirm affected tenant IDs, endpoint names, and last successful request window.",
  },
  "flow.pilot.job_failure": {
    id: "flow.pilot.job_failure",
    description:
      "Repeated failures or stalled backlog on critical background jobs.",
    defaultSeverity: "P1",
    canPromote: false,
    firstVerification:
      "Confirm failing job names, retry status, and whether dispatch/completion is blocked.",
  },
  "flow.pilot.auth_lockout": {
    id: "flow.pilot.auth_lockout",
    description:
      "Repeated auth failures across a live tenant or a global auth/login outage.",
    defaultSeverity: "P1",
    canPromote: true,
    firstVerification:
      "Confirm blast radius, provider health, and recent auth/config changes.",
  },
  "flow.pilot.latency_core_ops": {
    id: "flow.pilot.latency_core_ops",
    description: "Sustained P95 latency above target on pilot-critical operations.",
    defaultSeverity: "P2",
    canPromote: false,
    firstVerification:
      "Confirm whether latency is tenant-specific, release-related, or dependency-driven.",
  },
  "flow.pilot.backup_gap": {
    id: "flow.pilot.backup_gap",
    description: "Scheduled backup or export missed the documented RPO window.",
    defaultSeverity: "P2",
    canPromote: false,
    firstVerification:
      "Confirm last successful backup/export and whether the recovery point is still acceptable.",
  },
};

/**
 * Severity -> routing decision. This is the paging boundary from the runbook:
 * P0/P1 page, P2 is async-urgent, P3 is a ticket/comment only.
 */
export function routeForSeverity(severity: AlertSeverity): {
  channel: RouteChannel;
  responders: Responder[];
  pages: boolean;
} {
  switch (severity) {
    case "P0":
      return { channel: "page", responders: ["engineer", "cto", "ceo"], pages: true };
    case "P1":
      return { channel: "page", responders: ["engineer", "cto"], pages: true };
    case "P2":
      return { channel: "async_notify", responders: ["engineer", "cto"], pages: false };
    case "P3":
    default:
      return { channel: "ticket", responders: ["engineer"], pages: false };
  }
}

// ---------------------------------------------------------------------------
// Normalized signal event + evaluation context
// ---------------------------------------------------------------------------

/**
 * A single observability signal, normalized from an `activity_log` row's
 * metadata (or a parsed edge log line) into the fields the evaluators need.
 */
export interface PilotSignalEvent {
  /** Epoch millis when the event occurred. */
  timestamp: number;
  service?: string;
  route?: string;
  statusCode?: number;
  /** Edge log level / persisted severity (info|warn|error). */
  level?: PilotLogLevel;
  eventType?: string;
  errorCode?: string;
  tenantId?: string;
  durationMs?: number;
  /** Optional grouping key for job/operation lifecycle events. */
  jobName?: string;
}

/**
 * Supplemental signals that are not part of the per-request event stream:
 * the set of live pilot tenants (used for P0 promotion), background-job
 * backlog ages, and the last successful backup/export time.
 */
export interface EvaluationContext {
  /** Now, in epoch millis. Injected for deterministic testing. */
  now: number;
  /** Tenant IDs that are live in the pilot right now. */
  liveTenantIds: string[];
  /**
   * Oldest pending item age per critical job, in millis. Used by the
   * job_failure backlog rule (the event stream only carries failures).
   */
  jobBacklogAgeMs?: Record<string, number>;
  /** Epoch millis of the last successful backup/export, if known. */
  lastBackupAt?: number;
  /** Explicit signal that a global auth/login outage is in effect. */
  globalAuthOutage?: boolean;
}

export interface AlertThresholds {
  apiErrorRate: {
    windowMs: number;
    /** Absolute server-error count that trips the alert. */
    minServerErrors: number;
    /** 5xx rate (0-1) that trips the alert when traffic volume is sufficient. */
    maxErrorRate: number;
    /** Minimum requests in window before the rate rule applies. */
    minRequestsForRate: number;
  };
  jobFailure: {
    consecutiveFailures: number;
    backlogAgeMs: number;
  };
  authLockout: {
    windowMs: number;
    failuresPerTenant: number;
  };
  latencyCoreOps: {
    windowMs: number;
    p95Ms: number;
    /** Minimum samples before P95 is meaningful. */
    minSamples: number;
  };
  backupGap: {
    /** Documented RPO window in millis. */
    rpoWindowMs: number;
  };
}

const MINUTE = 60_000;

/** Default thresholds, taken directly from the ERY-20-02 runbook table. */
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  apiErrorRate: {
    windowMs: 10 * MINUTE,
    minServerErrors: 5,
    maxErrorRate: 0.05,
    minRequestsForRate: 20,
  },
  jobFailure: { consecutiveFailures: 3, backlogAgeMs: 15 * MINUTE },
  authLockout: { windowMs: 10 * MINUTE, failuresPerTenant: 5 },
  latencyCoreOps: { windowMs: 15 * MINUTE, p95Ms: 4_000, minSamples: 20 },
  backupGap: { rpoWindowMs: 24 * 60 * MINUTE },
};

// ---------------------------------------------------------------------------
// Pilot-critical workflow classification
// ---------------------------------------------------------------------------

/**
 * Predicate that decides whether a signal touches a pilot-critical workflow:
 * admin login, job/work-order scheduling+dispatch, operation completion, or
 * data import/export. Kept as a config-driven matcher so the surface can be
 * tuned without changing alert semantics.
 */
export const PILOT_CRITICAL_MATCHERS: RegExp[] = [
  /auth/i,
  /login/i,
  /jobs?/i,
  /work[-_]?order/i,
  /schedul/i,
  /dispatch/i,
  /operation/i,
  /import/i,
  /export/i,
];

export function isPilotCritical(
  event: Pick<PilotSignalEvent, "service" | "route" | "eventType">,
  matchers: RegExp[] = PILOT_CRITICAL_MATCHERS,
): boolean {
  const haystack = `${event.service ?? ""} ${event.route ?? ""} ${event.eventType ?? ""}`;
  return matchers.some((m) => m.test(haystack));
}

// ---------------------------------------------------------------------------
// Evaluation results
// ---------------------------------------------------------------------------

export interface AlertEvaluation {
  classId: AlertClassId;
  severity: AlertSeverity;
  /** One-line human explanation of why the alert fired. */
  reason: string;
  /** Distinct tenant IDs implicated, for blast-radius triage. */
  affectedTenants: string[];
  /** Structured counts/values that justified the decision. */
  observations: Record<string, unknown>;
}

function isServerError(e: PilotSignalEvent): boolean {
  return e.level === "error" || (typeof e.statusCode === "number" && e.statusCode >= 500);
}

function within(e: PilotSignalEvent, now: number, windowMs: number): boolean {
  return now - e.timestamp <= windowMs;
}

function uniqueTenants(events: PilotSignalEvent[]): string[] {
  return [...new Set(events.map((e) => e.tenantId).filter((t): t is string => !!t))];
}

/** True when every live pilot tenant is implicated (full-blast P0 promotion). */
function blocksAllLiveTenants(affected: string[], liveTenantIds: string[]): boolean {
  if (liveTenantIds.length === 0) return false;
  return liveTenantIds.every((t) => affected.includes(t));
}

// ---------------------------------------------------------------------------
// Evaluators — one pure function per alert class
// ---------------------------------------------------------------------------

export function evaluateApiErrorRate(
  events: PilotSignalEvent[],
  ctx: EvaluationContext,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertEvaluation | null {
  const cfg = t.apiErrorRate;
  const critical = events.filter(
    (e) => within(e, ctx.now, cfg.windowMs) && isPilotCritical(e),
  );
  const errors = critical.filter(isServerError);
  const total = critical.length;
  const rate = total > 0 ? errors.length / total : 0;

  const tripsCount = errors.length > cfg.minServerErrors;
  const tripsRate = total >= cfg.minRequestsForRate && rate > cfg.maxErrorRate;
  if (!tripsCount && !tripsRate) return null;

  const affected = uniqueTenants(errors);
  const def = ALERT_CLASSES["flow.pilot.api_error_rate"];
  const promote = def.canPromote && blocksAllLiveTenants(affected, ctx.liveTenantIds);
  const severity: AlertSeverity = promote ? "P0" : def.defaultSeverity;

  return {
    classId: def.id,
    severity,
    reason: promote
      ? `All ${ctx.liveTenantIds.length} live tenant(s) blocked by ${errors.length} server errors on pilot-critical endpoints.`
      : `${errors.length} server errors (${(rate * 100).toFixed(1)}% of ${total}) on pilot-critical endpoints in the last ${cfg.windowMs / MINUTE}m.`,
    affectedTenants: affected,
    observations: { serverErrors: errors.length, totalRequests: total, errorRate: rate, promotedToP0: promote },
  };
}

export function evaluateJobFailure(
  events: PilotSignalEvent[],
  ctx: EvaluationContext,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertEvaluation | null {
  const cfg = t.jobFailure;
  const jobEvents = events
    .filter((e) => e.eventType === "job.lifecycle" || e.eventType === "operation.lifecycle")
    .sort((a, b) => a.timestamp - b.timestamp);

  // Consecutive trailing failures per job name.
  const byJob = new Map<string, PilotSignalEvent[]>();
  for (const e of jobEvents) {
    const key = e.jobName ?? "unnamed";
    if (!byJob.has(key)) byJob.set(key, []);
    byJob.get(key)!.push(e);
  }

  const failingJobs: string[] = [];
  let maxConsecutive = 0;
  for (const [name, list] of byJob) {
    let trailing = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (isServerError(list[i])) trailing++;
      else break;
    }
    maxConsecutive = Math.max(maxConsecutive, trailing);
    if (trailing >= cfg.consecutiveFailures) failingJobs.push(name);
  }

  // Stalled backlog from supplemental context.
  const stalledJobs = Object.entries(ctx.jobBacklogAgeMs ?? {})
    .filter(([, ageMs]) => ageMs > cfg.backlogAgeMs)
    .map(([name]) => name);

  if (failingJobs.length === 0 && stalledJobs.length === 0) return null;

  const failingEvents = jobEvents.filter(
    (e) => failingJobs.includes(e.jobName ?? "unnamed") && isServerError(e),
  );
  const def = ALERT_CLASSES["flow.pilot.job_failure"];

  return {
    classId: def.id,
    severity: def.defaultSeverity,
    reason: [
      failingJobs.length
        ? `${failingJobs.length} job(s) with ${maxConsecutive}+ consecutive failures (${failingJobs.join(", ")}).`
        : "",
      stalledJobs.length
        ? `${stalledJobs.length} job(s) with backlog older than ${cfg.backlogAgeMs / MINUTE}m (${stalledJobs.join(", ")}).`
        : "",
    ].filter(Boolean).join(" "),
    affectedTenants: uniqueTenants(failingEvents),
    observations: { failingJobs, stalledJobs, maxConsecutiveFailures: maxConsecutive },
  };
}

export function evaluateAuthLockout(
  events: PilotSignalEvent[],
  ctx: EvaluationContext,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertEvaluation | null {
  const cfg = t.authLockout;
  const authFailures = events.filter(
    (e) =>
      within(e, ctx.now, cfg.windowMs) &&
      (e.statusCode === 401 ||
        e.statusCode === 403 ||
        (e.errorCode?.startsWith("AUTH") ?? false) ||
        (e.eventType?.startsWith("auth.") ?? false)) &&
      isServerErrorOrAuthDenial(e),
  );

  // Count failures per tenant.
  const perTenant = new Map<string, number>();
  for (const e of authFailures) {
    const key = e.tenantId ?? "unknown";
    perTenant.set(key, (perTenant.get(key) ?? 0) + 1);
  }
  const lockedTenants = [...perTenant.entries()]
    .filter(([, count]) => count >= cfg.failuresPerTenant)
    .map(([tenant]) => tenant);

  const global = ctx.globalAuthOutage === true;
  if (!global && lockedTenants.length === 0) return null;

  const def = ALERT_CLASSES["flow.pilot.auth_lockout"];
  const promote =
    def.canPromote &&
    (global || blocksAllLiveTenants(lockedTenants, ctx.liveTenantIds));
  const severity: AlertSeverity = promote ? "P0" : def.defaultSeverity;

  return {
    classId: def.id,
    severity,
    reason: global
      ? "Global auth/login outage signalled."
      : `${lockedTenants.length} tenant(s) over the auth-failure threshold in ${cfg.windowMs / MINUTE}m.`,
    affectedTenants: global ? ctx.liveTenantIds : lockedTenants.filter((t) => t !== "unknown"),
    observations: { lockedTenants, globalAuthOutage: global, totalAuthFailures: authFailures.length },
  };
}

// Auth denials are 401/403 even though the request "succeeded" at the edge;
// treat any auth-tagged failure event as a lockout signal.
function isServerErrorOrAuthDenial(e: PilotSignalEvent): boolean {
  if (isServerError(e)) return true;
  if (e.statusCode === 401 || e.statusCode === 403) return true;
  return (e.errorCode?.startsWith("AUTH") ?? false) || (e.eventType?.startsWith("auth.") ?? false);
}

export function evaluateLatencyCoreOps(
  events: PilotSignalEvent[],
  ctx: EvaluationContext,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertEvaluation | null {
  const cfg = t.latencyCoreOps;
  const samples = events
    .filter((e) => within(e, ctx.now, cfg.windowMs) && isPilotCritical(e) && typeof e.durationMs === "number")
    .map((e) => e.durationMs as number)
    .sort((a, b) => a - b);

  if (samples.length < cfg.minSamples) return null;

  const p95 = percentile(samples, 0.95);
  if (p95 <= cfg.p95Ms) return null;

  const def = ALERT_CLASSES["flow.pilot.latency_core_ops"];
  const slow = events.filter(
    (e) => within(e, ctx.now, cfg.windowMs) && isPilotCritical(e) && (e.durationMs ?? 0) > cfg.p95Ms,
  );
  return {
    classId: def.id,
    severity: def.defaultSeverity,
    reason: `P95 latency ${Math.round(p95)}ms (>${cfg.p95Ms}ms) over ${cfg.windowMs / MINUTE}m on pilot-critical ops.`,
    affectedTenants: uniqueTenants(slow),
    observations: { p95Ms: Math.round(p95), sampleCount: samples.length },
  };
}

export function evaluateBackupGap(
  _events: PilotSignalEvent[],
  ctx: EvaluationContext,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertEvaluation | null {
  const cfg = t.backupGap;
  // No known backup time is itself a gap (we cannot prove RPO is met).
  const lastBackupAt = ctx.lastBackupAt;
  const ageMs = lastBackupAt === undefined ? Infinity : ctx.now - lastBackupAt;
  if (ageMs <= cfg.rpoWindowMs) return null;

  const def = ALERT_CLASSES["flow.pilot.backup_gap"];
  return {
    classId: def.id,
    severity: def.defaultSeverity,
    reason:
      lastBackupAt === undefined
        ? "No successful backup/export recorded; RPO cannot be confirmed."
        : `Last backup ${Math.round(ageMs / MINUTE)}m ago exceeds the ${cfg.rpoWindowMs / MINUTE}m RPO window.`,
    affectedTenants: [],
    observations: { lastBackupAt: lastBackupAt ?? null, ageMs: ageMs === Infinity ? null : ageMs },
  };
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil(p * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

/** Run every evaluator and return the alerts that fired. */
export function evaluateAll(
  events: PilotSignalEvent[],
  ctx: EvaluationContext,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertEvaluation[] {
  const evaluators = [
    evaluateApiErrorRate,
    evaluateJobFailure,
    evaluateAuthLockout,
    evaluateLatencyCoreOps,
    evaluateBackupGap,
  ];
  return evaluators
    .map((fn) => fn(events, ctx, t))
    .filter((r): r is AlertEvaluation => r !== null);
}

// ---------------------------------------------------------------------------
// Transport abstraction (reversible / stack-agnostic delivery)
// ---------------------------------------------------------------------------

export interface AlertNotification {
  classId: AlertClassId;
  severity: AlertSeverity;
  channel: RouteChannel;
  responders: Responder[];
  pages: boolean;
  reason: string;
  affectedTenants: string[];
  observations: Record<string, unknown>;
  firstVerification: string;
  firedAt: string;
}

/**
 * Pluggable delivery surface. Implement this to add a real pager/webhook/email
 * vendor later — the evaluation and routing layers never change.
 */
export interface AlertTransport {
  deliver(notification: AlertNotification): Promise<void>;
}

export function buildNotification(
  evaluation: AlertEvaluation,
  now: number = Date.now(),
): AlertNotification {
  const route = routeForSeverity(evaluation.severity);
  return {
    classId: evaluation.classId,
    severity: evaluation.severity,
    channel: route.channel,
    responders: route.responders,
    pages: route.pages,
    reason: evaluation.reason,
    affectedTenants: evaluation.affectedTenants,
    observations: evaluation.observations,
    firstVerification: ALERT_CLASSES[evaluation.classId].firstVerification,
    firedAt: new Date(now).toISOString(),
  };
}

/**
 * Default least-privilege transport: emit a structured edge log and, when a
 * tenant can be attributed and a writer is supplied, persist an `alert.fired`
 * row into `activity_log`. No secrets, no outbound network calls. Paging vs
 * async is reflected only in log level + the `pages` flag.
 */
export function createLoggingAlertTransport(opts: {
  supabase?: ActivityLogWriter;
  service?: string;
} = {}): AlertTransport {
  const service = opts.service ?? "pilot-alerting";
  return {
    async deliver(n: AlertNotification): Promise<void> {
      const log: RequestLogContext = {
        requestId: `alert-${n.classId}-${n.firedAt}`,
        service,
        route: `/alerts/${n.classId}`,
        method: "ALERT",
        eventType: "alert.fired",
        errorCode: n.classId,
      };
      // Page-class alerts log at error so they surface in error dashboards;
      // async-notify alerts log at warn.
      edgeLog(n.pages ? "error" : "warn", `ALERT ${n.severity} ${n.classId}: ${n.reason}`, log);

      if (!opts.supabase) return;
      // Attribute to the first affected tenant when present; skip persistence
      // otherwise (activity_log.tenant_id is NOT NULL).
      const tenantId = n.affectedTenants[0];
      if (!tenantId) return;
      await persistPilotEvent(opts.supabase, {
        ctx: { ...log, tenantId, severity: undefined },
        level: n.pages ? "error" : "warn",
        action: "alert.fired",
        description: n.reason,
        extra: {
          alert_class: n.classId,
          alert_severity: n.severity,
          route_channel: n.channel,
          responders: n.responders,
          pages: n.pages,
          affected_tenants: n.affectedTenants,
          observations: n.observations,
        },
      });
    },
  };
}

/** Dispatch a single fired evaluation through a transport. */
export async function dispatchAlert(
  evaluation: AlertEvaluation,
  transport: AlertTransport,
  now: number = Date.now(),
): Promise<AlertNotification> {
  const notification = buildNotification(evaluation, now);
  await transport.deliver(notification);
  return notification;
}

/**
 * Evaluate the window and dispatch every fired alert. Returns the notifications
 * sent, ordered by severity (most urgent first) for incident-log readability.
 */
export async function evaluateAndDispatch(
  events: PilotSignalEvent[],
  ctx: EvaluationContext,
  transport: AlertTransport,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): Promise<AlertNotification[]> {
  const severityRank: Record<AlertSeverity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const fired = evaluateAll(events, ctx, t).sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
  const sent: AlertNotification[] = [];
  for (const evaluation of fired) {
    sent.push(await dispatchAlert(evaluation, transport, ctx.now));
  }
  return sent;
}
