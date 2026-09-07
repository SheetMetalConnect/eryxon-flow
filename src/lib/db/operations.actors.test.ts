import { describe, expect, it, vi } from 'vitest';
import { fetchOperationLookupDetails } from './operations';

const { transport } = vi.hoisted(() => ({ transport: vi.fn<typeof fetch>() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  }) };
});

describe('effective timer actor', () => {
  it.each([true, false])('preserves PIN/profile actor in operation and batch display (PIN=%s)', async pinActor => {
    transport.mockImplementation(async input => {
      const url = new URL(String(input));
      const select = url.searchParams.get('select') ?? '';
      let rows: unknown[] = [];
      if (url.pathname.endsWith('/operations')) rows = [{ id: 'op', status: 'in_progress', operation_name: 'Cut', part_id: 'part', sequence: 1 }];
      if (url.pathname.endsWith('/time_entries') && select.includes('shop_floor_operator_id')) rows = [{
        id: 'entry', operation_id: 'op', operator_id: 'profile', shop_floor_operator_id: pinActor ? 'pin-operator' : null,
        start_time: '2026-01-01T00:00:00Z', notes: null, operator: { full_name: 'Terminal profile' },
        shop_floor_operator: pinActor ? { full_name: 'PIN operator' } : null,
      }];
      if (url.pathname.endsWith('/batch_operations')) rows = select.includes('batch:')
        ? [{ batch_id: 'batch', operation_id: 'op', sequence_in_batch: 1, batch: { id: 'batch', batch_number: 'B-1', batch_type: 'laser_nesting', status: 'in_progress', operations_count: 1, parent_batch: null } }]
        : [{ batch_id: 'batch', operation_id: 'op', sequence_in_batch: 1, operation: { id: 'op', status: 'in_progress', operation_name: 'Cut', part_id: 'part' } }];
      return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
    });
    const [operation] = await fetchOperationLookupDetails('tenant');
    const id = pinActor ? 'pin-operator' : 'profile';
    const name = pinActor ? 'PIN operator' : 'Terminal profile';
    expect(operation.active_time_entry).toMatchObject({ operator_id: id, operator: { full_name: name } });
    expect(operation.batch_context?.members[0].active_time_entry).toMatchObject({ operator_id: id, operator_name: name });
  });
});
