import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startTimeTracking, completeOperation } from './operations';
import { startBatchTimeTracking, stopBatchTimeTracking } from './batches';
import { stopTimeTracking, pauseTimeTracking, resumeTimeTracking, adminStopTimeTracking } from './time-tracking';

const { transport } = vi.hoisted(() => ({ transport: vi.fn<typeof fetch>() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  }) };
});

beforeEach(() => {
  transport.mockReset();
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

  it('surfaces a rejected transaction without follow-up writes', async () => {
    transport.mockResolvedValue(new Response(JSON.stringify({ code: '42501', message: 'Tenant access denied' }), { status: 403 }));
    await expect(startTimeTracking('operation', 'operator', 'tenant')).rejects.toMatchObject({ message: 'Tenant access denied' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
