import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startTimeTracking, completeOperation } from './operations';
import { dispatchOperationStarted } from '../event-dispatch';
import { startBatchTimeTracking, stopBatchTimeTracking } from './batches';
import { stopTimeTracking, pauseTimeTracking, resumeTimeTracking, adminStopTimeTracking } from './time-tracking';

const { transport } = vi.hoisted(() => ({ transport: vi.fn<typeof fetch>() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  }) };
});
vi.mock('../event-dispatch', () => ({ dispatchOperationStarted: vi.fn(), dispatchOperationCompleted: vi.fn() }));

beforeEach(() => {
  transport.mockReset();
  vi.mocked(dispatchOperationStarted).mockReset().mockResolvedValue({ success: true });
  transport.mockImplementation(async input => new Response(JSON.stringify(
    String(input).includes('/rpc/')
      ? { changed: false, total_minutes: 9, operations: [{ id: 'operation', minutes: 9 }] }
      : { tenant_id: 'tenant' },
  ), { headers: { 'Content-Type': 'application/json' } }));
});

function writes() {
  return transport.mock.calls.filter(([, init]) => init?.method === 'POST');
}

describe('production lifecycle RPC adapters', () => {
  it.each([
    ['start', () => startTimeTracking('operation', 'operator', 'tenant')],
    ['complete', () => completeOperation('operation', 'tenant', 'operator')],
  ] as const)('operation %s has one transactional write', async (action, perform) => {
    await perform();
    expect(writes()).toHaveLength(1);
    expect(String(writes()[0][0])).toContain('/rpc/transition_operation');
    expect(JSON.parse(String(writes()[0][1]?.body))).toMatchObject({ p_action: action, p_tenant_id: 'tenant', p_operation_id: 'operation', p_operator_id: 'operator' });
  });

  it.each([
    ['start', () => startBatchTimeTracking('batch', 'operator', 'tenant')],
    ['stop', () => stopBatchTimeTracking('batch', 'operator', 'tenant')],
  ] as const)('batch %s has one transactional write', async (action, perform) => {
    await perform();
    expect(writes()).toHaveLength(1);
    expect(String(writes()[0][0])).toContain('/rpc/transition_batch');
    expect(JSON.parse(String(writes()[0][1]?.body))).toMatchObject({ p_action: action, p_tenant_id: 'tenant', p_batch_id: 'batch' });
  });

  it.each([
    ['pause', () => pauseTimeTracking('entry')],
    ['resume', () => resumeTimeTracking('entry')],
    ['stop', () => adminStopTimeTracking('entry')],
  ] as const)('entry %s uses the authorized entry tenant in one write', async (action, perform) => {
    await perform();
    expect(writes()).toHaveLength(1);
    expect(String(writes()[0][0])).toContain('/rpc/time_entry_action');
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({ p_action: action, p_tenant_id: 'tenant', p_time_entry_id: 'entry' });
  });

  it('stops a timer through the operation transaction', async () => {
    await stopTimeTracking('operation', 'operator');
    expect(writes()).toHaveLength(1);
    expect(JSON.parse(String(writes()[0][1]?.body))).toMatchObject({ p_action: 'stop', p_tenant_id: 'tenant' });
  });

  it.each(['not_started', 'in_progress', 'on_hold'])('emits started only on the first lifecycle transition (previous=%s)', async previousStatus => {
    transport.mockImplementation(async input => {
      const url = String(input);
      const data = url.includes('/rpc/')
        ? { changed: true, previous_status: previousStatus, status: 'in_progress', operator_name: 'Employee' }
        : url.includes('/operations')
          ? { id: 'operation', operation_name: 'Cut', part_id: 'part', started_at: '2026-09-07T12:00:00Z', part: { part_number: 'P-1', job: { id: 'job', job_number: 'J-1' } } }
          : { full_name: 'Employee' };
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    });
    await startTimeTracking('operation', 'operator', 'tenant');
    expect(writes()).toHaveLength(1);
    if (previousStatus === 'not_started') await vi.waitFor(() => expect(dispatchOperationStarted).toHaveBeenCalledWith('tenant', expect.objectContaining({ operation_id: 'operation', operator_name: 'Employee' })));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(dispatchOperationStarted).toHaveBeenCalledTimes(previousStatus === 'not_started' ? 1 : 0);
  });

  it('surfaces a rejected transaction without follow-up writes', async () => {
    transport.mockResolvedValue(new Response(JSON.stringify({ code: '42501', message: 'Tenant access denied' }), { status: 403 }));
    await expect(startTimeTracking('operation', 'operator', 'tenant')).rejects.toMatchObject({ message: 'Tenant access denied' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
