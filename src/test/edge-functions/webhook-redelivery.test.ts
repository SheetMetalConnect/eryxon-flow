import { afterEach, expect, it, vi } from 'vitest';

declare global {
  const Deno: {
    serve: (handler: (request: Request) => Promise<Response>) => void;
    env: { get: (name: string) => string | undefined };
  };
}

const state = vi.hoisted(() => ({
  serve: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));
vi.hoisted(() => {
  Object.assign(globalThis, { Deno: { serve: state.serve, env: { get: () => 'test-only' } } });
});
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  from: () => {
    const query = {
      select: () => query, eq: () => query,
      update: state.update, insert: state.insert,
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: [
        { id: 'webhook-1', url: 'https://receiver.example.invalid', secret_key: 'test-only', consecutive_failures: 0 },
      ], error: null }).then(resolve),
    };
    return query;
  },
}) }));
vi.mock('../../../supabase/functions/_shared/event-auth.ts', () => ({ authorizeEventRequest: async () => true }));
vi.mock('../../../supabase/functions/_shared/cors.ts', () => ({ corsHeaders: {} }));
vi.mock('../../../supabase/functions/_shared/runtime-env.ts', () => ({ getRuntimeEnv: (): undefined => undefined }));
vi.mock('../../../supabase/functions/_shared/security.ts', () => ({ sanitizeError: () => ({ message: 'failed' }) }));
vi.mock('../../../supabase/functions/_shared/observability.ts', () => ({
  REQUEST_ID_HEADER: 'x-request-id', edgeLog: vi.fn(), persistPilotEvent: vi.fn(), resolveRequestId: () => 'request-1',
}));

import '../../../supabase/functions/webhook-dispatch/index.ts';
afterEach(() => vi.unstubAllGlobals());

it('delivers the same event and occurrence time with a fresh delivery ID on redelivery', async () => {
  state.insert.mockResolvedValue({ error: null });
  state.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const receiver = vi.fn<typeof fetch>().mockImplementation(async () => new Response('ok'));
  vi.stubGlobal('fetch', receiver);
  const handler = state.serve.mock.calls[0][0] as (request: Request) => Promise<Response>;
  const payload = { tenant_id: 'tenant-1', webhook_id: 'webhook-1', event_id: 'event-1', event: 'webhook.test',
    occurred_at: '2026-09-25T12:00:00Z', data: { test: true } };
  for (let i = 0; i < 2; i++) {
    const response = await handler(new Request('http://localhost/webhook-dispatch', {
      method: 'POST', body: JSON.stringify(payload),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ dispatched: 1, failed: 0 });
  }
  const [original, redelivery] = state.insert.mock.calls.map(([row]) => row);
  expect(redelivery.id).not.toBe(original.id);
  expect(redelivery.event_id).toBe(original.event_id);
  expect(redelivery.payload).toEqual(original.payload);
  expect(redelivery.payload.occurred_at).toBe(payload.occurred_at);
  expect(receiver).toHaveBeenCalledTimes(2);
  const headers = receiver.mock.calls.map(([, init]) => new Headers(init?.headers));
  expect(headers[0].get('X-Eryxon-Delivery-Id')).not.toBe(headers[1].get('X-Eryxon-Delivery-Id'));
});
