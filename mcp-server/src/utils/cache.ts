/**
 * Cache abstraction layer for MCP Server (Node.js)
 *
 * Provides the same caching patterns as the Edge Functions cache layer.
 * Supports:
 * - Redis (Upstash) for production - serverless-compatible via HTTP
 * - In-memory fallback for development/local installations
 *
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST URL (optional)
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST token (optional)
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
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Execute Redis command via Upstash REST API
 */
async function redisCommand(command: string[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Redis not configured');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
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
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getType(): 'redis' | 'memory';
}

/**
 * Memory-based cache implementation
 */
const memoryCache: Cache = {
  async get(key: string): Promise<string | null> {
    const entry = memoryStore.get(key);
    if (!entry) return null;

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
      return await redisCommand(['GET', key]);
    } catch (error) {
      console.error(`[Cache] Redis GET error for key ${key}:`, error);
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

  getType(): 'redis' | 'memory' {
    return 'redis';
  },
};

/**
 * Get the cache instance
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
 * Cache-or-fetch pattern
 */
export async function cacheOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await getCachedJson<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  setCachedJson(key, data, ttlSeconds).catch((error) => {
    console.error(`[Cache] Error caching key ${key}:`, error);
  });

  return data;
}

/**
 * Cache key builders for MCP Server
 */
export const CacheKeys = {
  /** Cells list for a tenant */
  cells: (tenantId: string) => `mcp:cells:${tenantId}`,

  /** Operations list */
  operations: (tenantId: string) => `mcp:operations:${tenantId}`,

  /** Jobs list */
  jobs: (tenantId: string) => `mcp:jobs:${tenantId}`,

  /** Dashboard stats */
  dashboard: (tenantId: string) => `mcp:dashboard:${tenantId}`,
};

/**
 * Cache TTL presets (in seconds)
 */
export const CacheTTL = {
  SHORT: 30,
  MEDIUM: 120,
  LONG: 300,
};
