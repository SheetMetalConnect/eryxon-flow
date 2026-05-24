/**
 * ERY-93: verification for the scheduled-execution path of the ERY-43 alert
 * evaluator.
 *
 * Imports the timer-driven core directly (no Deno-only imports, so it runs under
 * vitest). Proves the path a cron tick exercises:
 *   1. persisted `activity_log` rows map to engine signals;
 *   2. the derived context produces a fired alert for a representative window;
 *   3. dispatch reaches the least-privilege transport and writes an
 *      `alert.fired` activity_log row — the captured-evidence requirement, with
 *      exact timestamps.
 */
import { describe, it, expect } from 'vitest';
import {
  createLoggingAlertTransport,
  type AlertNotification,
  type AlertTransport,
} from '../../../supabase/functions/_shared/alerting';
import {
  mapActivityRowToSignal,
  buildEvaluationContext,
  runScheduledEvaluation,
  DEFAULT_LOOKBACK_MS,
  type ActivityLogRow,
} from '../../../supabase/functions/_shared/pilot-alert-schedule';

// Fixed "now" so the captured artifact has deterministic, exact timestamps.
const NOW = Date.parse('2026-05-24T20:05:00.000Z');
const MINUTE = 60_000;

/** Build an activity_log row in the ERY-46 metadata shape. */
function row(overrides: Partial<ActivityLogRow> & { offsetMs?: number } = {}): ActivityLogRow {
  const { offsetMs = MINUTE, metadata, ...rest } = overrides;
  return {
    tenant_id: 'tenant-a',
    action: 'edge.error',
    created_at: new Date(NOW - offsetMs).toISOString(),
    metadata: {
      service: 'api-operations',
      route: '/operations',
      method: 'POST',
      severity: 'error',
      status_code: 500,
      event_type: 'edge.error',
      ...metadata,
    },
    ...rest,
  };
}

describe('ERY-93 scheduled alert evaluation core', () => {
  it('maps a persisted activity_log row into an engine signal', () => {
    const signal = mapActivityRowToSignal(row({ offsetMs: 2 * MINUTE }));
    expect(signal).toMatchObject({
      timestamp: NOW - 2 * MINUTE,
      service: 'api-operations',
      route: '/operations',
      statusCode: 500,
      level: 'error',
      eventType: 'edge.error',
      tenantId: 'tenant-a',
    });
  });

  it('derives live tenants and job backlog from the window', () => {
    const events = [
      row({ tenant_id: 'tenant-a' }),
      row({ tenant_id: 'tenant-b' }),
      row({
        tenant_id: 'tenant-a',
        offsetMs: 10 * MINUTE,
        metadata: { job_name: 'erp-sync', severity: 'error', status_code: 500 },
      }),
    ].map(mapActivityRowToSignal);

    const ctx = buildEvaluationContext(events, { now: NOW });
    expect(new Set(ctx.liveTenantIds)).toEqual(new Set(['tenant-a', 'tenant-b']));
    // Oldest failing erp-sync event was 10 min ago.
    expect(ctx.jobBacklogAgeMs?.['erp-sync']).toBe(10 * MINUTE);
  });

  it('fires and dispatches an API error-rate alert on a representative window', async () => {
    // 6 server errors on a pilot-critical route within the 10-min rule window
    // trips api_error_rate (DEFAULT_THRESHOLDS.minServerErrors = 5).
    const rows: ActivityLogRow[] = Array.from({ length: 6 }, (_, i) =>
      row({ offsetMs: (i + 1) * MINUTE }),
    );

    const captured: AlertNotification[] = [];
    const transport: AlertTransport = {
      async deliver(n) {
        captured.push(n);
      },
    };

    const result = await runScheduledEvaluation({
      rows,
      transport,
      context: { now: NOW, liveTenantIds: ['tenant-a'] },
      lookbackMs: DEFAULT_LOOKBACK_MS,
    });

    expect(result.eventCount).toBe(6);
    expect(result.windowStart).toBe('2026-05-24T19:50:00.000Z');
    expect(result.windowEnd).toBe('2026-05-24T20:05:00.000Z');
    expect(result.notifications.length).toBeGreaterThanOrEqual(1);

    const apiAlert = result.notifications.find((n) => n.classId === 'flow.pilot.api_error_rate');
    expect(apiAlert).toBeDefined();
    expect(apiAlert!.firedAt).toBe(new Date(NOW).toISOString());
    expect(captured).toHaveLength(result.notifications.length);
  });

  it('persists an alert.fired row through the least-privilege logging transport', async () => {
    const inserted: Array<{ table: string; row: Record<string, unknown> }> = [];
    const supabase = {
      from(table: string) {
        return {
          async insert(r: Record<string, unknown>) {
            inserted.push({ table, row: r });
            return { error: null };
          },
        };
      },
    };

    const rows: ActivityLogRow[] = Array.from({ length: 6 }, (_, i) =>
      row({ offsetMs: (i + 1) * MINUTE }),
    );

    const result = await runScheduledEvaluation({
      rows,
      transport: createLoggingAlertTransport({ supabase, service: 'pilot-alert-evaluator' }),
      context: { now: NOW, liveTenantIds: ['tenant-a'] },
    });

    expect(result.notifications.length).toBeGreaterThanOrEqual(1);
    const fired = inserted.filter((i) => i.table === 'activity_log');
    expect(fired.length).toBeGreaterThanOrEqual(1);
    expect(fired[0].row).toMatchObject({
      tenant_id: 'tenant-a',
      action: 'alert.fired',
    });
    const meta = fired[0].row.metadata as Record<string, unknown>;
    expect(meta.alert_class).toBe('flow.pilot.api_error_rate');
    expect(meta.event_type).toBe('alert.fired');
  });

  it('emits no alerts on a healthy quiet window', async () => {
    const captured: AlertNotification[] = [];
    const transport: AlertTransport = {
      async deliver(n) {
        captured.push(n);
      },
    };
    // A fresh backup time keeps backup_gap silent; with no error signals the
    // window is genuinely healthy. (An unknown backup time is itself a gap.)
    const result = await runScheduledEvaluation({
      rows: [],
      transport,
      context: { now: NOW, lastBackupAt: NOW - MINUTE },
    });
    expect(result.eventCount).toBe(0);
    expect(result.notifications).toHaveLength(0);
    expect(captured).toHaveLength(0);
  });
});
