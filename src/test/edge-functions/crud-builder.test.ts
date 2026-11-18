import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createCrudHandler, type CrudConfig } from '../../../supabase/functions/_shared/crud-builder';
import type { HandlerContext } from '../../../supabase/functions/_shared/handler';

const tenantId = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';

function setup(handlerFetch: typeof fetch, path = '?limit=2&offset=3', method = 'GET', body?: unknown) {
  const supabase = createClient('http://localhost:54321', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: handlerFetch },
  });
  const req = new Request(`http://localhost/functions/v1/api-jobs${path}`, {
    method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const ctx: HandlerContext = {
    supabase, req, url: new URL(req.url), tenantId, plan: 'free', apiKeyId: 'test', keyPrefix: 'test',
    pathSegments: [], lastSegment: new URL(req.url).pathname.split('/').slice(-1)[0],
    requestId: 'test', log: { requestId: 'test', service: 'test', route: '/', method },
    recordPilotEvent: async () => {},
  };
  return { req, ctx };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Content-Range': '3-4/9' } });
}

describe('CRUD with real PostgREST thenables', () => {
  it.each([false, true])('applies range after a modifier (async=%s)', async (asynchronous) => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(json([{ id: recordId }]));
    const { req, ctx } = setup(transport);
    const modify: NonNullable<CrudConfig['queryModifier']> = query => ({ query: query.eq('status', 'in_progress') });
    const handler = createCrudHandler({ table: 'jobs', queryModifier: asynchronous ? async (q, c) => modify(q, c) : modify });
    const response = await handler(req, ctx);
    expect(response.status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(1);
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.searchParams.get('offset')).toBe('3');
    expect(url.searchParams.get('limit')).toBe('2');
    expect(url.searchParams.get('status')).toBe('eq.in_progress');
  });

  it('retains maybeSingle on async-modified detail queries', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(json([{ id: recordId }]));
    const { req, ctx } = setup(transport, `?id=${recordId}`);
    const response = await createCrudHandler({ table: 'jobs', queryModifier: async query => ({ query }) })(req, ctx);
    expect((await response.json()).data.job.id).toBe(recordId);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each(['lookup', 'insert', 'update'])('counts %s errors as failures, never successes', async (failure) => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        if (failure === 'lookup') return json({ message: 'lookup unavailable', code: 'XX000' }, 500);
        return json(failure === 'update' ? [{ id: recordId }] : []);
      }
      return json({ message: 'write rejected', code: '23514' }, 400);
    });
    const { req, ctx } = setup(transport, '/bulk-sync', 'POST', { items: [{ external_id: 'external-1', external_source: 'test', job_number: 'test' }] });
    const response = await createCrudHandler({ table: 'jobs', enableSync: true })(req, ctx);
    expect((await response.json()).data.results).toMatchObject({ created: 0, updated: 0, failed: 1 });
  });

  it('rejects cross-tenant references before issuing a mutation', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(json([]));
    const { req, ctx } = setup(transport, '', 'POST', { operation_name: 'Cut', part_id: recordId });
    await expect(createCrudHandler({ table: 'operations' })(req, ctx)).rejects.toThrow('this tenant');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(new URL(String(transport.mock.calls[0][0])).searchParams.get('tenant_id')).toBe(`eq.${tenantId}`);
  });

  it.each(['id', 'tenant_id', 'deleted_at'])('rejects mass assignment of %s', async (field) => {
    const transport = vi.fn<typeof fetch>();
    const { req, ctx } = setup(transport, '', 'POST', { job_number: 'test', [field]: recordId });
    await expect(createCrudHandler({ table: 'jobs' })(req, ctx)).rejects.toThrow('not writable');
    expect(transport).not.toHaveBeenCalled();
  });
});
