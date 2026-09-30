import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { loadEntrypoint } from './entrypoint-test-utils';

describe('API key creation and listing', () => {
  it('lists a newly created key without a profile join or key hash', async () => {
    let stored: Record<string, unknown> = {};
    const transport = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      let body: unknown;
      if (url.pathname.endsWith('/user')) body = { id: 'admin', aud: 'authenticated' };
      else if (url.pathname.endsWith('/profiles')) body = { id: 'admin', tenant_id: 'tenant', role: 'admin' };
      else {
        if (init?.method === 'POST') stored = { ...JSON.parse(String(init.body)), id: 'key-id' };
        else {
          expect(url.searchParams.get('select')).toBe('id,name,key_prefix,active,last_used_at,created_at');
          expect(url.searchParams.get('tenant_id')).toBe('eq.tenant');
        }
        const selected = Object.fromEntries((url.searchParams.get('select') ?? '').split(',').map(key => [key, stored[key]]));
        body = init?.method === 'POST' ? selected : [selected];
      }
      return Response.json(body);
    });
    const supabase = createClient('http://localhost:54321', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
    });
    const handler = loadEntrypoint('api-key-generate');
    const url = new URL('http://localhost/functions/v1/api-key-generate');
    const context = { supabase, url, tenantId: 'tenant', recordPilotEvent: async () => {} };
    const created = await handler(new Request(url, { method: 'POST', headers: { authorization: 'Bearer test-jwt' }, body: JSON.stringify({ name: 'Integration' }) }), context);
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.data.api_key).toMatch(/^ery_live_/);
    expect(stored.key_hash).toMatch(/^[a-f0-9]{64}$/);
    const listed = await handler(new Request(url, { headers: { authorization: 'Bearer test-jwt' } }), context);
    expect(listed.status).toBe(200);
    const body = await listed.json();
    expect(body.data.api_keys[0]).toMatchObject({ id: 'key-id', name: 'Integration' });
    expect(body.data.api_keys[0]).not.toHaveProperty('key_hash');
    expect(body.data.api_keys[0]).not.toHaveProperty('api_key');
  });
});
