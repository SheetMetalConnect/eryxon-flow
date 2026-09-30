import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { loadEntrypoint } from './entrypoint-test-utils';

describe('REST complete forwards the strict database action', () => {
  it.each([
    ['not_started', 'Start the operation before completing it'],
    ['active_timer', 'Stop active time entries before completing'],
    ['started_stopped', null],
  ])('%s', async (_state, message) => {
    const transport = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input).includes('/rpc/transition_operation')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ p_action: 'complete', p_tenant_id: 'tenant', p_operation_id: 'operation' });
        return message
          ? Response.json({ code: '22023', message }, { status: 400 })
          : Response.json({ changed: true, previous_status: 'in_progress' });
      }
      return Response.json({ id: 'operation', status: 'completed' });
    });
    const supabase = createClient('http://localhost:54321', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
    });
    const handler = loadEntrypoint('api-operation-lifecycle', {
      '@shared/validation/errorHandler.ts': { throwDatabaseError: (error: { message: string }) => { throw new Error(error.message); } },
    });
    const url = new URL('http://localhost/functions/v1/api-operation-lifecycle/complete?id=operation');
    const response = handler(new Request(url, { method: 'POST' }), { supabase, url, tenantId: 'tenant', recordPilotEvent: async () => {} });
    if (message) await expect(response).rejects.toThrow(message);
    else expect(await (await response).json()).toMatchObject({ data: { operation: { status: 'completed' }, operation_type: 'complete' } });
  });
});
