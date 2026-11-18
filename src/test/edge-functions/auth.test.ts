/**
 * Tests for supabase/functions/_shared/auth.ts
 *
 * Tests the pure utility functions exported by the auth module:
 * - Bearer token extraction
 * - API key format validation
 * - Test vs live key detection
 *
 * The async authenticateApiKey/authenticateAndSetContext functions are not
 * tested here — they require a real Supabase client and database state.
 * Those are integration test territory.
 */

import { describe, it, expect, vi } from 'vitest';

// Deno.env is read at module-eval time by cors.ts (pulled in transitively now
// that auth.ts re-exports from validation/errorHandler.ts). vi.hoisted runs
// before the import graph evaluates, so Deno exists in time.
vi.hoisted(() => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (_key: string): undefined => undefined },
  };
});

// Mock the cache/rate-limiter dependencies that auth.ts imports
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

import {
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  authenticateApiKey,
} from '../../../supabase/functions/_shared/auth.ts';

describe('auth — custom error classes', () => {
  it('UnauthorizedError has correct name and message', () => {
    const error = new UnauthorizedError('Invalid API key');
    expect(error.name).toBe('UnauthorizedError');
    expect(error.message).toBe('Invalid API key');
    expect(error).toBeInstanceOf(Error);
  });

  it('ForbiddenError has correct name and message', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toBe('Access denied');
    expect(error).toBeInstanceOf(Error);
  });

  it('RateLimitError carries rate limit result', () => {
    const rateLimitResult = {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
      retryAfter: 60,
    };
    const error = new RateLimitError('Too many requests', rateLimitResult);
    expect(error.name).toBe('RateLimitError');
    expect(error.rateLimitResult).toBe(rateLimitResult);
    expect(error.rateLimitResult.retryAfter).toBe(60);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('auth — authenticateApiKey', () => {
  it('throws UnauthorizedError when auth header is missing', async () => {
    await expect(authenticateApiKey(null, {})).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when auth header has no Bearer prefix', async () => {
    await expect(authenticateApiKey('Token abc', {})).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for invalid key format', async () => {
    await expect(authenticateApiKey('Bearer sk_live_abc', {})).rejects.toThrow(
      UnauthorizedError
    );
    await expect(authenticateApiKey('Bearer invalid_key', {})).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('throws UnauthorizedError when no matching keys found', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    };
    await expect(
      authenticateApiKey('Bearer ery_live_abc123xyz', mockSupabase)
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError on database error', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      }),
    };
    await expect(
      authenticateApiKey('Bearer ery_live_abc123xyz', mockSupabase)
    ).rejects.toThrow(UnauthorizedError);
  });
});
