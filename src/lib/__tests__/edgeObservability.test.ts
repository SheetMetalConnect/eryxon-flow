/**
 * ERY-46: focused coverage for the request-correlated observability baseline.
 *
 * These tests import the edge-shared observability helpers directly. The module
 * is deliberately free of Deno-only / remote imports so it runs under vitest.
 *
 * Coverage targets the two acceptance-critical behaviours:
 *  1. request id propagation (trust valid inbound, mint otherwise)
 *  2. the activity_log persistence filter + request_id embedding
 */
import { describe, it, expect, vi } from 'vitest';
import {
  REQUEST_ID_HEADER,
  isValidRequestId,
  resolveRequestId,
  shouldPersistPilotEvent,
  buildPilotActivityRow,
  persistPilotEvent,
  type ActivityLogWriter,
  type RequestLogContext,
} from '../../../supabase/functions/_shared/observability';

const baseCtx = (overrides: Partial<RequestLogContext> = {}): RequestLogContext => ({
  requestId: 'req-123',
  service: 'api-issues',
  route: '/api-issues',
  method: 'POST',
  tenantId: 'tenant-abc',
  ...overrides,
});

describe('resolveRequestId (propagation)', () => {
  it('trusts a valid inbound x-request-id', () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: 'trace-abc.123:def' });
    expect(resolveRequestId(headers)).toBe('trace-abc.123:def');
  });

  it('mints a fresh id when the header is missing', () => {
    const id = resolveRequestId(new Headers());
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('mints a fresh id when the inbound value is invalid', () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: 'has spaces & symbols!' });
    const id = resolveRequestId(headers);
    expect(id).not.toBe('has spaces & symbols!');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects over-long inbound ids', () => {
    expect(isValidRequestId('a'.repeat(201))).toBe(false);
    expect(isValidRequestId('a'.repeat(64))).toBe(true);
  });
});

describe('shouldPersistPilotEvent (persistence filter)', () => {
  it('persists warn and error regardless of event type', () => {
    expect(shouldPersistPilotEvent({ level: 'warn' })).toBe(true);
    expect(shouldPersistPilotEvent({ level: 'error' })).toBe(true);
  });

  it('persists info only for pilot-critical lifecycle event types', () => {
    expect(shouldPersistPilotEvent({ level: 'info', eventType: 'issue.created' })).toBe(true);
    expect(shouldPersistPilotEvent({ level: 'info', eventType: 'operator.time_entry' })).toBe(true);
  });

  it('drops non-critical info/debug events', () => {
    expect(shouldPersistPilotEvent({ level: 'info', eventType: 'some.read' })).toBe(false);
    expect(shouldPersistPilotEvent({ level: 'info' })).toBe(false);
    expect(shouldPersistPilotEvent({ level: 'debug' })).toBe(false);
  });
});

describe('buildPilotActivityRow (request_id + severity embedding)', () => {
  it('embeds the shared request_id and contract into metadata', () => {
    const row = buildPilotActivityRow({
      ctx: baseCtx({ statusCode: 422, errorCode: 'VALIDATION_ERROR', eventType: 'issue.created' }),
      level: 'error',
      action: 'edge.error',
      description: 'boom',
      entityType: 'issue',
      entityId: 'issue-1',
    });

    expect(row.tenant_id).toBe('tenant-abc');
    expect(row.metadata.request_id).toBe('req-123');
    expect(row.metadata.severity).toBe('error');
    expect(row.metadata.error_code).toBe('VALIDATION_ERROR');
    expect(row.metadata.status_code).toBe(422);
    expect(row.metadata.event_type).toBe('issue.created');
    expect(row.metadata.service).toBe('api-issues');
  });
});

describe('persistPilotEvent', () => {
  const makeWriter = () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const writer: ActivityLogWriter = { from: vi.fn(() => ({ insert })) };
    return { writer, insert };
  };

  it('writes a filtered error event with the request_id in metadata', async () => {
    const { writer, insert } = makeWriter();
    const ok = await persistPilotEvent(writer, {
      ctx: baseCtx({ statusCode: 500, errorCode: 'INTERNAL_ERROR' }),
      level: 'error',
      action: 'edge.error',
      description: 'intentional failure',
    });

    expect(ok).toBe(true);
    expect(writer.from).toHaveBeenCalledWith('activity_log');
    const inserted = insert.mock.calls[0][0];
    expect(inserted.metadata.request_id).toBe('req-123');
    expect(inserted.metadata.severity).toBe('error');
    expect(inserted.metadata.error_code).toBe('INTERNAL_ERROR');
  });

  it('skips events that fail the persistence filter', async () => {
    const { writer, insert } = makeWriter();
    const ok = await persistPilotEvent(writer, {
      ctx: baseCtx({ eventType: 'some.read' }),
      level: 'info',
      action: 'read',
    });
    expect(ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it('skips events with no tenant to attribute them to', async () => {
    const { writer, insert } = makeWriter();
    const ok = await persistPilotEvent(writer, {
      ctx: baseCtx({ tenantId: undefined }),
      level: 'error',
      action: 'edge.error',
    });
    expect(ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it('never throws when the insert fails', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    const writer: ActivityLogWriter = { from: vi.fn(() => ({ insert })) };
    const ok = await persistPilotEvent(writer, {
      ctx: baseCtx(),
      level: 'error',
      action: 'edge.error',
    });
    expect(ok).toBe(false);
  });
});
