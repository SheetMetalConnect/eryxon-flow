/**
 * Cache abstraction layer for Edge Functions
 *
 * Supports:
 * - Redis (Upstash) for production - serverless-compatible via HTTP
 * - In-memory fallback for development/local Docker without Redis
 *
 * This design ensures the app remains portable and works in any environment.
 *
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST URL (optional)
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST token (optional)
 *
 * If Redis credentials are not provided, falls back to in-memory cache.
 */

// In-memory cache store (fallback)
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

// Cleanup expired entries periodically (in-memory only)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt && entry.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute

/**
 * Cache configuration
 */
export interface CacheConfig {
  redisUrl?: string;
  redisToken?: string;
}

/**
 * Get cache configuration from environment
 */
function getCacheConfig(): CacheConfig {
  return {
    redisUrl: Deno.env.get('UPSTASH_REDIS_REST_URL'),
    redisToken: Deno.env.get('UPSTASH_REDIS_REST_TOKEN'),
  };
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  const config = getCacheConfig();
  return !!(config.redisUrl && config.redisToken);
}

/**
 * Execute Redis command via Upstash REST API
 */
async function redisCommand(command: string[]): Promise<any> {
  const config = getCacheConfig();

  if (!config.redisUrl || !config.redisToken) {
    throw new Error('Redis not configured');
  }

  const response = await fetch(`${config.redisUrl}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Redis command failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.result;
}

/**
 * Cache interface
 */
export interface Cache {
  /**
   * Get a value from cache
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to store (will be stringified if not a string)
   * @param ttlSeconds Optional TTL in seconds
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a key from cache
   */
  del(key: string): Promise<void>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Increment a counter (atomic)
   * @param key Cache key
   * @param ttlSeconds Optional TTL for new keys
   * @returns New value after increment
   */
  incr(key: string, ttlSeconds?: number): Promise<number>;

  /**
   * Get multiple keys at once
   */
  mget(keys: string[]): Promise<(string | null)[]>;

  /**
   * Set multiple key-value pairs at once
   */
  mset(pairs: Array<{ key: string; value: string; ttlSeconds?: number }>): Promise<void>;

  /**
   * Get the cache type being used
   */
  getType(): 'redis' | 'memory';
}

/**
 * Memory-based cache implementation
 */
const memoryCache: Cache = {
  async get(key: string): Promise<string | null> {
    const entry = memoryStore.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }

    return entry.value;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null,
    });
  },

  async del(key: string): Promise<void> {
    memoryStore.delete(key);
  },

  async exists(key: string): Promise<boolean> {
    const entry = memoryStore.get(key);
    if (!entry) return false;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return false;
    }

    return true;
  },

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const existing = await this.get(key);
    const newValue = existing ? parseInt(existing, 10) + 1 : 1;
    await this.set(key, newValue.toString(), ttlSeconds);
    return newValue;
  },

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  },

  async mset(pairs: Array<{ key: string; value: string; ttlSeconds?: number }>): Promise<void> {
    await Promise.all(pairs.map(({ key, value, ttlSeconds }) => this.set(key, value, ttlSeconds)));
  },

  getType(): 'redis' | 'memory' {
    return 'memory';
  },
};

/**
 * Redis-based cache implementation (via Upstash REST API)
 */
const redisCache: Cache = {
  async get(key: string): Promise<string | null> {
    try {
      const result = await redisCommand(['GET', key]);
      return result;
    } catch (error) {
      console.error(`[Cache] Redis GET error for key ${key}:`, error);
      // Fallback to memory on error
      return memoryCache.get(key);
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await redisCommand(['SET', key, value, 'EX', ttlSeconds.toString()]);
      } else {
        await redisCommand(['SET', key, value]);
      }
    } catch (error) {
      console.error(`[Cache] Redis SET error for key ${key}:`, error);
      // Fallback to memory on error
      await memoryCache.set(key, value, ttlSeconds);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redisCommand(['DEL', key]);
    } catch (error) {
      console.error(`[Cache] Redis DEL error for key ${key}:`, error);
      await memoryCache.del(key);
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisCommand(['EXISTS', key]);
      return result === 1;
    } catch (error) {
      console.error(`[Cache] Redis EXISTS error for key ${key}:`, error);
      return memoryCache.exists(key);
    }
  },

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await redisCommand(['INCR', key]);
      if (ttlSeconds) {
        // Set TTL only if this is a new key (INCR returns 1)
        // Use EXPIRE to set TTL
        await redisCommand(['EXPIRE', key, ttlSeconds.toString(), 'NX']);
      }
      return result;
    } catch (error) {
      console.error(`[Cache] Redis INCR error for key ${key}:`, error);
      return memoryCache.incr(key, ttlSeconds);
    }
  },

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      if (keys.length === 0) return [];
      const result = await redisCommand(['MGET', ...keys]);
      return result;
    } catch (error) {
      console.error(`[Cache] Redis MGET error:`, error);
      return memoryCache.mget(keys);
    }
  },

  async mset(pairs: Array<{ key: string; value: string; ttlSeconds?: number }>): Promise<void> {
    try {
      // For pairs with TTL, we need to use pipeline-like approach
      // Upstash supports MSET but not with individual TTLs
      // So we'll do SET with EX for each if TTL is needed
      const withTtl = pairs.filter(p => p.ttlSeconds);
      const withoutTtl = pairs.filter(p => !p.ttlSeconds);

      if (withoutTtl.length > 0) {
        const args = withoutTtl.flatMap(({ key, value }) => [key, value]);
        await redisCommand(['MSET', ...args]);
      }

      // Set items with TTL individually
      await Promise.all(
        withTtl.map(({ key, value, ttlSeconds }) =>
          redisCommand(['SET', key, value, 'EX', ttlSeconds!.toString()])
        )
      );
    } catch (error) {
      console.error(`[Cache] Redis MSET error:`, error);
      await memoryCache.mset(pairs);
    }
  },

  getType(): 'redis' | 'memory' {
    return 'redis';
  },
};

/**
 * Get the cache instance
 * Automatically selects Redis if configured, otherwise uses memory
 */
export function getCache(): Cache {
  if (isRedisConfigured()) {
    return redisCache;
  }
  return memoryCache;
}

/**
 * Convenience function: Get and parse JSON from cache
 */
export async function getCachedJson<T>(key: string): Promise<T | null> {
  const cache = getCache();
  const value = await cache.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Convenience function: Set JSON in cache
 */
export async function setCachedJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const cache = getCache();
  await cache.set(key, JSON.stringify(value), ttlSeconds);
}

/**
 * Cache key builder helpers
 */
export const CacheKeys = {
  /** Rate limit key for a specific identifier and window */
  rateLimit: (prefix: string, identifier: string) => `ratelimit:${prefix}:${identifier}`,

  /** QRM metrics for a cell */
  qrmMetrics: (cellId: string, tenantId: string) => `qrm:cell:${cellId}:${tenantId}`,

  /** Dashboard stats for a tenant */
  dashboardStats: (tenantId: string) => `dashboard:stats:${tenantId}`,

  /** Operation details */
  operationDetails: (operationId: string) => `operation:${operationId}`,

  /** Job details */
  jobDetails: (jobId: string) => `job:${jobId}`,

  /** Cell details */
  cellDetails: (cellId: string) => `cell:${cellId}`,

  /** Tenant settings */
  tenantSettings: (tenantId: string) => `tenant:settings:${tenantId}`,
};

/**
 * Cache TTL presets (in seconds)
 */
export const CacheTTL = {
  /** Very short - for rate limiting windows */
  RATE_LIMIT: 60,

  /** Short - for frequently changing data */
  SHORT: 30,

  /** Medium - for moderately changing data */
  MEDIUM: 120, // 2 minutes

  /** Long - for slowly changing data */
  LONG: 300, // 5 minutes

  /** Very long - for rarely changing data */
  VERY_LONG: 900, // 15 minutes

  /** Hour */
  HOUR: 3600,

  /** Day */
  DAY: 86400,
};
