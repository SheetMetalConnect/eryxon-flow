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

// Mock Deno.env (required by transitive imports through cors.ts)
vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => undefined,
  },
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
  extractBearerToken,
  isValidApiKeyFormat,
  isTestKey,
  isLiveKey,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  authenticateApiKey,
} from '../../../supabase/functions/_shared/auth.ts';

describe('auth — extractBearerToken', () => {
  it('extracts token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('extracts full API key from Bearer header', () => {
    const key = 'ery_live_abcdef1234567890';
    expect(extractBearerToken(`Bearer ${key}`)).toBe(key);
  });

  it('returns null for missing header', () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it('returns null for empty header', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null for non-Bearer auth schemes', () => {
    expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(extractBearerToken('Token abc123')).toBeNull();
  });

  it('returns null for "Bearer" without a space', () => {
    expect(extractBearerToken('Bearerabc123')).toBeNull();
  });

  it('preserves the full token value', () => {
    const token = 'ery_test_' + 'x'.repeat(32);
    expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
  });
});

describe('auth — isValidApiKeyFormat', () => {
  it('accepts live keys', () => {
    expect(isValidApiKeyFormat('ery_live_abc123')).toBe(true);
  });

  it('accepts test keys', () => {
    expect(isValidApiKeyFormat('ery_test_abc123')).toBe(true);
  });

  it('rejects keys without ery_ prefix', () => {
    expect(isValidApiKeyFormat('sk_live_abc123')).toBe(false);
    expect(isValidApiKeyFormat('pk_test_abc123')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidApiKeyFormat('')).toBe(false);
  });

  it('rejects partial prefixes', () => {
    expect(isValidApiKeyFormat('ery_')).toBe(false);
    expect(isValidApiKeyFormat('ery_li')).toBe(false);
    expect(isValidApiKeyFormat('ery_tes')).toBe(false);
  });

  it('rejects keys with wrong mode', () => {
    expect(isValidApiKeyFormat('ery_staging_abc123')).toBe(false);
    expect(isValidApiKeyFormat('ery_dev_abc123')).toBe(false);
  });
});

describe('auth — isTestKey', () => {
  it('returns true for test keys', () => {
    expect(isTestKey('ery_test_abc123')).toBe(true);
    expect(isTestKey('ery_test_')).toBe(true);
  });

  it('returns false for live keys', () => {
    expect(isTestKey('ery_live_abc123')).toBe(false);
  });

  it('returns false for invalid keys', () => {
    expect(isTestKey('sk_test_abc')).toBe(false);
    expect(isTestKey('')).toBe(false);
  });
});

describe('auth — isLiveKey', () => {
  it('returns true for live keys', () => {
    expect(isLiveKey('ery_live_abc123')).toBe(true);
    expect(isLiveKey('ery_live_')).toBe(true);
  });

  it('returns false for test keys', () => {
    expect(isLiveKey('ery_test_abc123')).toBe(false);
  });

  it('returns false for invalid keys', () => {
    expect(isLiveKey('sk_live_abc')).toBe(false);
    expect(isLiveKey('')).toBe(false);
  });
});

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
