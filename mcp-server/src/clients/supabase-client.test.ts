import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTenantScopedClient, DirectSupabaseClient } from './supabase-client.js';

describe('tenant-scoped client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('cannot reassign a row to another tenant through update payloads', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createClient('http://localhost:54321', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
    });
    await createTenantScopedClient(client, 'tenant-a').from('jobs')
      .update({ tenant_id: 'tenant-b', notes: 'updated' }).eq('id', 'job');
    const [input, init] = transport.mock.calls[0];
    expect(new URL(String(input)).searchParams.get('tenant_id')).toBe('eq.tenant-a');
    expect(JSON.parse(String(init?.body))).toEqual({ tenant_id: 'tenant-a', notes: 'updated' });
  });

  it('keeps the tenant boundary when using the unified update method', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubEnv('TENANT_ID', 'tenant-a');
    vi.stubGlobal('fetch', transport);

    const client = new DirectSupabaseClient('http://localhost:54321', 'test-key');
    const result = await client.update('jobs', 'job', { tenant_id: 'tenant-b', notes: 'updated' });

    expect(result.error).toBeNull();
    const [input, init] = transport.mock.calls[0];
    expect(new URL(String(input)).searchParams.get('tenant_id')).toBe('eq.tenant-a');
    expect(JSON.parse(String(init?.body))).toEqual({ tenant_id: 'tenant-a', notes: 'updated' });
  });
});
