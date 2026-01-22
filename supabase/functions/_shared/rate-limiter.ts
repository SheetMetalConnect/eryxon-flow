/**
 * Rate limiter for Edge Functions
 *
 * Uses Redis (Upstash) when available for persistent rate limiting across
 * function restarts and distributed instances. Falls back to in-memory
 * when Redis is not configured.
 *
 * This is a drop-in replacement for the previous in-memory-only implementation.
 */

import { getCache, CacheKeys, CacheTTL } from './cache.ts';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if request is within rate limit
 *
 * @param identifier - Unique identifier (IP, API key, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const cache = getCache();
  const prefix = config.keyPrefix || 'default';
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  // Create cache keys
  const countKey = CacheKeys.rateLimit(prefix, `${identifier}:count`);
  const resetKey = CacheKeys.rateLimit(prefix, `${identifier}:reset`);

  const now = Date.now();

  // Get current state from cache
  const [countStr, resetStr] = await cache.mget([countKey, resetKey]);

  let count = countStr ? parseInt(countStr, 10) : 0;
  let resetAt = resetStr ? parseInt(resetStr, 10) : 0;

  // Check if window expired
  if (!resetAt || resetAt < now) {
    // Start new window
    resetAt = now + config.windowMs;
    count = 1;

    // Set new count and reset time with TTL
    await cache.mset([
      { key: countKey, value: '1', ttlSeconds: windowSeconds },
      { key: resetKey, value: resetAt.toString(), ttlSeconds: windowSeconds },
    ]);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  // Increment count
  count = await cache.incr(countKey, windowSeconds);

  // Check if exceeded
  if (count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    resetAt,
  };
}

/**
 * Synchronous version for backward compatibility
 * Uses in-memory only (no Redis) for immediate response
 *
 * @deprecated Use async checkRateLimit instead for persistent rate limiting
 */
const syncRateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of syncRateLimitStore.entries()) {
    if (entry.resetAt < now) {
      syncRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix || 'default'}:${identifier}`;
  const now = Date.now();

  let entry = syncRateLimitStore.get(key);

  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    syncRateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if exceeded
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter,
      },
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}
