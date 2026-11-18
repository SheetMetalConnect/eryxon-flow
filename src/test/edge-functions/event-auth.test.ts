import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeEventRequest, internalEventHeaders } from '../../../supabase/functions/_shared/event-auth';

const tenantId = '11111111-1111-4111-8111-111111111111';
const runtimeEnv = new Map<string, string>();

beforeEach(() => {
  runtimeEnv.clear();
  vi.stubGlobal('Deno', { env: { get: (name: string) => runtimeEnv.get(name) } });
});
afterEach(() => vi.unstubAllGlobals());

function client(profile: Record<string, unknown> | null) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async input => {
    const isAuth = String(input).includes('/auth/v1/user');
    return new Response(JSON.stringify(isAuth ? { id: 'actor', aud: 'authenticated' } : profile ? [profile] : []), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { transport, supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  }) };
}

function request(token?: string) {
  return new Request('http://localhost/functions/v1/webhook-dispatch', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('event authentication', () => {
  it('rejects unauthenticated calls even without internal secret configuration', async () => {
    const { supabase, transport } = client(null);
    expect(await authorizeEventRequest(request(), tenantId, supabase)).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });

  it('uses the same mandatory secret on the internal sender and receiver', async () => {
    expect(() => internalEventHeaders()).toThrow('INTERNAL_SERVICE_SECRET');
    runtimeEnv.set('INTERNAL_SERVICE_SECRET', 'test-internal-secret');
    const { supabase, transport } = client(null);
    const req = new Request('http://localhost', { headers: internalEventHeaders('request-1') });
    expect(await authorizeEventRequest(req, tenantId, supabase)).toBe(true);
    expect(req.headers.get('x-request-id')).toBe('request-1');
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    { tenant_id: tenantId, role: 'operator', active: true, permitted: true },
    { tenant_id: tenantId, role: 'admin', active: true, permitted: true },
    { tenant_id: 'other-tenant', role: 'admin', active: true, permitted: false },
    { tenant_id: tenantId, role: 'operator', active: false, permitted: false },
    { tenant_id: tenantId, role: 'visitor', active: true, permitted: false },
  ])('verifies JWT and tenant/role/active state: $permitted', async ({ permitted, ...profile }) => {
    const { supabase, transport } = client(profile);
    expect(await authorizeEventRequest(request('user-jwt'), tenantId, supabase)).toBe(permitted);
    expect(transport).toHaveBeenCalledTimes(2);
  });

});
