/**
 * Regression test for issue #908.
 *
 * Auth failures must map to HTTP 401, not 500. The bug was that auth.ts
 * defined its own UnauthorizedError/ForbiddenError classes, which mapError()
 * in validation/errorHandler.ts did not recognize via instanceof — so they
 * fell through to the generic `instanceof Error -> 500` branch.
 *
 * This test asserts the error THROWN by the auth module is the SAME class
 * mapError() checks, and therefore maps to the correct status code.
 */

import { describe, it, expect, vi } from 'vitest';

// cors.ts calls Deno.env.get() at module-eval time (top-level), so Deno must
// exist before the import graph below evaluates. vi.hoisted runs first.
vi.hoisted(() => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (_key: string) => undefined },
  };
});

// auth.ts pulls in cache + rate-limiter; stub them so the import is side-effect free
vi.mock('../../../supabase/functions/_shared/cache-utils.ts', () => ({
  cacheOrFetch: vi.fn(),
  invalidateCache: vi.fn(),
}));
vi.mock('../../../supabase/functions/_shared/cache.ts', () => ({
  CacheKeys: { rateLimit: (a: string, b: string) => `${a}:${b}` },
  CacheTTL: { SHORT: 60, MEDIUM: 300, LONG: 3600 },
  getCache: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    mget: vi.fn(),
    mset: vi.fn(),
    incr: vi.fn(),
    getType: () => 'memory',
  })),
  getCachedJson: vi.fn(),
  setCachedJson: vi.fn(),
}));
vi.mock('../../../supabase/functions/_shared/rate-limiter.ts', () => ({
  checkRateLimit: vi.fn(),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

import { UnauthorizedError as AuthUnauthorizedError, ForbiddenError as AuthForbiddenError } from '../../../supabase/functions/_shared/auth.ts';
import { mapError } from '../../../supabase/functions/_shared/validation/errorHandler.ts';

describe('auth error -> HTTP status mapping (issue #908)', () => {
  it('maps an UnauthorizedError thrown by the auth module to 401', () => {
    const mapped = mapError(new AuthUnauthorizedError('Invalid API key'));
    expect(mapped.status).toBe(401);
    expect(mapped.code).toBe('UNAUTHORIZED');
  });

  it('maps a ForbiddenError thrown by the auth module to 403', () => {
    const mapped = mapError(new AuthForbiddenError('Access denied'));
    expect(mapped.status).toBe(403);
    expect(mapped.code).toBe('FORBIDDEN');
  });

  it('does not fall through to the generic 500 branch for auth errors', () => {
    const mapped = mapError(new AuthUnauthorizedError('Invalid API key'));
    expect(mapped.status).not.toBe(500);
    expect(mapped.code).not.toBe('INTERNAL_ERROR');
  });
});
