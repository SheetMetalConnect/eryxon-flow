/**
 * ERY-43: focused coverage for the pilot alerting + routing baseline.
 *
 * Imports the edge-shared alerting engine directly (no Deno-only imports, so it
 * runs under vitest). Verifies:
 *  1. each of the five runbook alert classes has concrete trigger logic
 *  2. severity routing (P0/P1 page, P2 async-notify) matches the runbook
 *  3. one representative P1 path fires, promotes to P0 under full blast radius,
 *     and dispatches through a transport — the captured-evidence requirement.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  ALERT_CLASSES,
  DEFAULT_THRESHOLDS,
  routeForSeverity,
  isPilotCritical,
  evaluateApiErrorRate,
  evaluateJobFailure,
  evaluateAuthLockout,
  evaluateLatencyCoreOps,
  evaluateBackupGap,
  evaluateAndDispatch,
  buildNotification,
  dispatchAlert,
  createLoggingAlertTransport,
  type PilotSignalEvent,
  type EvaluationContext,
  type AlertTransport,
} from '../../../supabase/functions/_shared/alerting';

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;

const ctx = (overrides: Partial<EvaluationContext> = {}): EvaluationContext => ({
  now: NOW,
  liveTenantIds: ['tenant-a', 'tenant-b'],
  ...overrides,
});

const errorEvent = (overrides: Partial<PilotSignalEvent> = {}): PilotSignalEvent => ({
  timestamp: NOW - MINUTE,
  service: 'api-jobs',
  route: '/api-jobs/dispatch',
  statusCode: 500,
  level: 'error',
  tenantId: 'tenant-a',
  ...overrides,
});

describe('routing policy (runbook paging boundary)', () => {
  it('pages for P0 and P1, async-notifies for P2, tickets for P3', () => {
    expect(routeForSeverity('P0')).toMatchObject({ channel: 'page', pages: true });
    expect(routeForSeverity('P1')).toMatchObject({ channel: 'page', pages: true });
    expect(routeForSeverity('P2')).toMatchObject({ channel: 'async_notify', pages: false });
    expect(routeForSeverity('P3')).toMatchObject({ channel: 'ticket', pages: false });
  });

  it('escalates P0 to the CEO, P1 stops at the CTO', () => {
    expect(routeForSeverity('P0').responders).toEqual(['engineer', 'cto', 'ceo']);
    expect(routeForSeverity('P1').responders).toEqual(['engineer', 'cto']);
  });
});

describe('pilot-critical classification', () => {
  it('flags auth, jobs, operations, and import/export surfaces', () => {
    expect(isPilotCritical({ route: '/api-auth/login' })).toBe(true);
    expect(isPilotCritical({ service: 'api-jobs' })).toBe(true);
    expect(isPilotCritical({ eventType: 'operation.lifecycle' })).toBe(true);
    expect(isPilotCritical({ route: '/api-export/csv' })).toBe(true);
    expect(isPilotCritical({ route: '/api-settings/theme' })).toBe(false);
  });
});

describe('flow.pilot.api_error_rate', () => {
  it('fires P1 on a server-error spike on pilot-critical endpoints', () => {
    const events = Array.from({ length: 6 }, () => errorEvent());
    const result = evaluateApiErrorRate(events, ctx());
    expect(result?.severity).toBe('P1');
    expect(result?.observations.serverErrors).toBe(6);
  });

  it('promotes to P0 when all live tenants are blocked', () => {
    const events = [
      ...Array.from({ length: 4 }, () => errorEvent({ tenantId: 'tenant-a' })),
      ...Array.from({ length: 4 }, () => errorEvent({ tenantId: 'tenant-b' })),
    ];
    const result = evaluateApiErrorRate(events, ctx());
    expect(result?.severity).toBe('P0');
    expect(result?.observations.promotedToP0).toBe(true);
  });

  it('does not fire below threshold', () => {
    const events = Array.from({ length: 3 }, () => errorEvent());
    expect(evaluateApiErrorRate(events, ctx())).toBeNull();
  });

  it('ignores errors outside the time window', () => {
    const stale = Array.from({ length: 6 }, () => errorEvent({ timestamp: NOW - 30 * MINUTE }));
    expect(evaluateApiErrorRate(stale, ctx())).toBeNull();
  });
});

describe('flow.pilot.job_failure', () => {
  it('fires on three consecutive failures of one job', () => {
    const events: PilotSignalEvent[] = [0, 1, 2].map((i) => ({
      timestamp: NOW - (3 - i) * MINUTE,
      eventType: 'job.lifecycle',
      jobName: 'erp-sync',
      level: 'error',
      tenantId: 'tenant-a',
    }));
    const result = evaluateJobFailure(events, ctx());
    expect(result?.severity).toBe('P1');
    expect(result?.observations.failingJobs).toContain('erp-sync');
  });

  it('fires on a stalled backlog past the age threshold', () => {
    const result = evaluateJobFailure([], ctx({ jobBacklogAgeMs: { 'mqtt-dispatch': 20 * MINUTE } }));
    expect(result?.observations.stalledJobs).toContain('mqtt-dispatch');
  });

  it('does not fire when a failure run is broken by a success', () => {
    const events: PilotSignalEvent[] = [
      { timestamp: NOW - 3 * MINUTE, eventType: 'job.lifecycle', jobName: 'erp-sync', level: 'error' },
      { timestamp: NOW - 2 * MINUTE, eventType: 'job.lifecycle', jobName: 'erp-sync', level: 'info' },
      { timestamp: NOW - 1 * MINUTE, eventType: 'job.lifecycle', jobName: 'erp-sync', level: 'error' },
    ];
    expect(evaluateJobFailure(events, ctx())).toBeNull();
  });
});

describe('flow.pilot.auth_lockout', () => {
  it('fires P1 when one tenant exceeds the auth-failure threshold', () => {
    const events = Array.from({ length: 5 }, () => errorEvent({
      service: 'api-auth',
      route: '/api-auth/login',
      statusCode: 401,
      level: 'warn',
      errorCode: 'AUTH_INVALID',
      tenantId: 'tenant-a',
    }));
    const result = evaluateAuthLockout(events, ctx());
    expect(result?.severity).toBe('P1');
    expect(result?.observations.lockedTenants).toContain('tenant-a');
  });

  it('promotes to P0 on a global auth outage', () => {
    const result = evaluateAuthLockout([], ctx({ globalAuthOutage: true }));
    expect(result?.severity).toBe('P0');
  });
});

describe('flow.pilot.latency_core_ops', () => {
  it('fires P2 when P95 exceeds the latency target', () => {
    const events: PilotSignalEvent[] = Array.from({ length: 25 }, (_, i) => ({
      timestamp: NOW - MINUTE,
      service: 'api-operations',
      route: '/api-operations/complete',
      durationMs: i < 2 ? 9_000 : 200, // tail above 4s
    }));
    const result = evaluateLatencyCoreOps(events, ctx());
    expect(result?.severity).toBe('P2');
    expect(routeForSeverity(result!.severity).pages).toBe(false);
  });

  it('does not fire without enough samples', () => {
    const events: PilotSignalEvent[] = Array.from({ length: 5 }, () => ({
      timestamp: NOW - MINUTE,
      service: 'api-operations',
      durationMs: 9_000,
    }));
    expect(evaluateLatencyCoreOps(events, ctx())).toBeNull();
  });
});

describe('flow.pilot.backup_gap', () => {
  it('fires P2 when the last backup is older than the RPO window', () => {
    const result = evaluateBackupGap([], ctx({ lastBackupAt: NOW - 48 * 60 * MINUTE }));
    expect(result?.severity).toBe('P2');
  });

  it('fires when no backup time is known at all', () => {
    const result = evaluateBackupGap([], ctx({ lastBackupAt: undefined }));
    expect(result?.reason).toMatch(/No successful backup/);
  });

  it('stays quiet inside the RPO window', () => {
    expect(evaluateBackupGap([], ctx({ lastBackupAt: NOW - 60 * MINUTE }))).toBeNull();
  });
});

describe('dispatch + transport (verified P1 path)', () => {
  it('routes a fired P1 alert to the paging channel through a transport', async () => {
    const deliver = vi.fn().mockResolvedValue(undefined);
    const transport: AlertTransport = { deliver };

    const events = Array.from({ length: 6 }, () => errorEvent());
    // Recent backup so only the api_error_rate path fires.
    const sent = await evaluateAndDispatch(events, ctx({ lastBackupAt: NOW - 60 * MINUTE }), transport);

    expect(deliver).toHaveBeenCalledTimes(1);
    const notification = sent[0];
    expect(notification.classId).toBe('flow.pilot.api_error_rate');
    expect(notification.severity).toBe('P1');
    expect(notification.channel).toBe('page');
    expect(notification.pages).toBe(true);
    expect(notification.responders).toEqual(['engineer', 'cto']);
    expect(notification.firstVerification).toBe(
      ALERT_CLASSES['flow.pilot.api_error_rate'].firstVerification,
    );
  });

  it('persists an alert.fired row via the least-privilege logging transport', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn(() => ({ insert })) };
    const transport = createLoggingAlertTransport({ supabase });

    const evaluation = evaluateApiErrorRate(Array.from({ length: 6 }, () => errorEvent()), ctx())!;
    const notification = await dispatchAlert(evaluation, transport, NOW);

    expect(supabase.from).toHaveBeenCalledWith('activity_log');
    const row = insert.mock.calls[0][0];
    expect(row.action).toBe('alert.fired');
    expect(row.tenant_id).toBe('tenant-a');
    expect(row.metadata.alert_class).toBe('flow.pilot.api_error_rate');
    expect(row.metadata.alert_severity).toBe('P1');
    expect(row.metadata.pages).toBe(true);
    expect(notification.firedAt).toBe(new Date(NOW).toISOString());
  });

  it('orders multiple fired alerts most-urgent-first', async () => {
    const deliver = vi.fn().mockResolvedValue(undefined);
    const transport: AlertTransport = { deliver };

    // P0 api_error_rate (all tenants) + P2 backup gap fire together.
    const events = [
      ...Array.from({ length: 4 }, () => errorEvent({ tenantId: 'tenant-a' })),
      ...Array.from({ length: 4 }, () => errorEvent({ tenantId: 'tenant-b' })),
    ];
    const sent = await evaluateAndDispatch(events, ctx({ lastBackupAt: NOW - 48 * 60 * MINUTE }), transport);

    expect(sent.map((n) => n.severity)).toEqual(['P0', 'P2']);
    expect(sent[0].classId).toBe('flow.pilot.api_error_rate');
  });

  it('skips persistence when no tenant can be attributed (e.g. backup gap)', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn(() => ({ insert })) };
    const transport = createLoggingAlertTransport({ supabase });

    const evaluation = evaluateBackupGap([], ctx({ lastBackupAt: undefined }))!;
    await dispatchAlert(evaluation, transport, NOW);
    expect(insert).not.toHaveBeenCalled();
  });
});
