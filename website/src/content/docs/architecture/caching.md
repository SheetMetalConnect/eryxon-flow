---
title: "Caching Architecture"
description: "Documentation for Caching Architecture"
---

This document describes the caching architecture implemented in the application to improve performance and reduce database load.

## Overview

The application uses a dual-layer caching strategy:

1. **Server-side caching** (Edge Functions) - Redis (Upstash) with in-memory fallback
2. **Client-side caching** (Frontend) - React Query with optimized configurations

This design ensures the app remains **portable** - it works perfectly without Redis for development, Docker deployments, or small-scale production use.

## Server-Side Caching (Edge Functions)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Edge Function                         │
├─────────────────────────────────────────────────────────┤
│  Request  →  Cache Check  →  Cache Hit?  →  Response    │
│                    │              │                      │
│                    │              No                     │
│                    │              ↓                      │
│                    │        Database Query               │
│                    │              │                      │
│                    │        Cache Store                  │
│                    │              ↓                      │
│                    └──────────Response                   │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
         ┌─────────────────────────────────────┐
         │         Cache Abstraction           │
         │                                     │
         │   Redis Configured?                 │
         │      Yes → Upstash Redis (HTTP)     │
         │      No  → In-Memory Map            │
         └─────────────────────────────────────┘
```

### Files

| File | Description |
|------|-------------|
| `supabase/functions/_shared/cache.ts` | Core cache abstraction layer |
| `supabase/functions/_shared/cache-utils.ts` | High-level caching utilities |
| `supabase/functions/_shared/rate-limiter.ts` | Rate limiting with cache support |

### Configuration

Redis is **optional**. Set these environment variables to enable:

```ini
UPSTASH_REDIS_REST_URL=https://us1-example-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cache Key Patterns

```typescript
// Pre-defined key builders
CacheKeys.rateLimit(prefix, identifier)  // ratelimit:{prefix}:{identifier}
CacheKeys.qrmMetrics(cellId, tenantId)   // qrm:cell:{cellId}:{tenantId}
CacheKeys.dashboardStats(tenantId)       // dashboard:stats:{tenantId}
CacheKeys.operationDetails(operationId)  // operation:{operationId}
CacheKeys.tenantSettings(tenantId)       // tenant:settings:{tenantId}
```

### TTL Presets

```typescript
CacheTTL.RATE_LIMIT  // 60 seconds
CacheTTL.SHORT       // 30 seconds
CacheTTL.MEDIUM      // 2 minutes
CacheTTL.LONG        // 5 minutes
CacheTTL.VERY_LONG   // 15 minutes
CacheTTL.HOUR        // 1 hour
CacheTTL.DAY         // 24 hours
```

### Usage Examples

```typescript
import { getCache, getCachedJson, setCachedJson, CacheKeys, CacheTTL } from '../_shared/cache.ts';
import { cacheOrFetch, getCachedQRMMetrics } from '../_shared/cache-utils.ts';

// Simple get/set
const cache = getCache();
await cache.set('my-key', 'my-value', 300); // 5 minute TTL
const value = await cache.get('my-key');

// JSON helpers
await setCachedJson('user:123', { name: 'John' }, 600);
const user = await getCachedJson<User>('user:123');

// Cache-or-fetch pattern
const data = await cacheOrFetch(
  CacheKeys.dashboardStats(tenantId),
  CacheTTL.LONG,
  async () => {
    // Expensive database query
    return await fetchDashboardStats(tenantId);
  }
);

// Pre-built QRM metrics caching
const metrics = await getCachedQRMMetrics(supabase, cellId, tenantId);
```

### Rate Limiting with Cache

```typescript
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';

// Async version (uses Redis if available)
const result = await checkRateLimit(apiKey, {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  keyPrefix: 'api',
});

if (!result.allowed) {
  return createRateLimitResponse(result, corsHeaders);
}

// Sync version (in-memory only, for backward compatibility)
const syncResult = checkRateLimitSync(apiKey, config);
```

## Client-Side Caching (React Query)

### Architecture

React Query provides automatic caching with configurable stale times and garbage collection.

### Files

| File | Description |
|------|-------------|
| `src/lib/queryClient.ts` | QueryClient configuration and presets |
| `src/lib/cacheInvalidation.ts` | Cache invalidation utilities |

### Query Keys Factory

Use consistent query keys for proper cache invalidation:

```typescript
import { QueryKeys } from '@/lib/queryClient';

// Jobs
QueryKeys.jobs.all(tenantId)
QueryKeys.jobs.detail(jobId)

// Operations
QueryKeys.operations.all(tenantId)
QueryKeys.operations.byCell(cellId)
QueryKeys.operations.workQueue(cellId)

// Cells & QRM
QueryKeys.cells.all(tenantId)
QueryKeys.cells.qrmMetrics(cellId, tenantId)

// Dashboard
QueryKeys.dashboard.stats(tenantId)
```

### Stale Time Presets

```typescript
import { StaleTime, CacheTime, defaultQueryOptions } from '@/lib/queryClient';

// Stale time presets
StaleTime.NONE        // 0 - Always refetch
StaleTime.VERY_SHORT  // 10 seconds
StaleTime.SHORT       // 30 seconds (default)
StaleTime.MEDIUM      // 2 minutes
StaleTime.LONG        // 5 minutes
StaleTime.VERY_LONG   // 15 minutes

// Pre-configured options for common scenarios
defaultQueryOptions.realtime  // For work queues, active operations
defaultQueryOptions.lists     // For job lists, part lists
defaultQueryOptions.details   // For detail views
defaultQueryOptions.config    // For configuration data
defaultQueryOptions.static    // For rarely changing data
```

### Usage Examples

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, StaleTime, defaultQueryOptions } from '@/lib/queryClient';
import { invalidateOperationCaches } from '@/lib/cacheInvalidation';

// Using query keys and stale time
const { data: jobs } = useQuery({
  queryKey: QueryKeys.jobs.all(tenantId),
  queryFn: fetchJobs,
  staleTime: StaleTime.SHORT,
});

// Using preset options
const { data: cells } = useQuery({
  queryKey: QueryKeys.cells.all(tenantId),
  queryFn: fetchCells,
  ...defaultQueryOptions.config,
});

// Cache invalidation after mutations
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateOperation,
  onSuccess: (_, variables) => {
    invalidateOperationCaches(
      queryClient,
      tenantId,
      variables.operationId,
      variables.cellId
    );
  },
});
```

## Docker / Local Development

The caching system works seamlessly without Redis:

```yaml

services:
  app:
    build: .
    environment:
      - VITE_SUPABASE_URL=...
      - VITE_SUPABASE_PUBLISHABLE_KEY=...
      # Redis variables not set = uses in-memory cache
```

For local development with Redis (optional):

```yaml

services:
  app:
    build: .
    environment:
      - UPSTASH_REDIS_REST_URL=http://redis:8079
      - UPSTASH_REDIS_REST_TOKEN=local-token
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Best Practices

### 1. Cache Invalidation

Always invalidate related caches when data changes:

```typescript
// After updating an operation
invalidateOperationCaches(queryClient, tenantId, operationId, cellId);

// After updating a job
invalidateJobCaches(queryClient, tenantId, jobId);
```

### 2. Choosing TTL Values

| Data Type | Recommended TTL | Reason |
|-----------|-----------------|--------|
| Active operations | 10-30 seconds | Real-time display |
| Job lists | 30-60 seconds | Moderate update frequency |
| Configuration | 5-15 minutes | Rarely changes |
| User profiles | 5 minutes | Session-stable |
| Tenant settings | 15-30 minutes | Admin changes only |

### 3. Cache Keys

- Always include `tenantId` for multi-tenant data
- Use the `CacheKeys` helper for consistency
- Keep keys descriptive but concise

### 4. Error Handling

The cache layer gracefully handles errors:

```typescript
// Redis errors fall back to memory
const cache = getCache();
await cache.set('key', 'value'); // Uses Redis or memory transparently

// Check cache type for debugging
console.log(`Using ${cache.getType()} cache`);
```

## Monitoring

### Cache Health Check

```typescript
import { getCacheHealth } from '../_shared/cache-utils.ts';

const health = await getCacheHealth();
console.log(`Cache: ${health.type}, Healthy: ${health.healthy}, Latency: ${health.latencyMs}ms`);
```

### Recommended Metrics

When using Redis, monitor:
- Cache hit rate
- Memory usage
- Connection errors
- Latency percentiles

## Troubleshooting

### Common Issues

**1. Rate limiting not persisting across restarts**
- Check if Redis credentials are set correctly
- Verify Upstash dashboard shows connections

**2. Stale data in UI**
- Ensure cache invalidation is called after mutations
- Check staleTime configuration
- Verify real-time subscriptions are working

**3. Memory issues in Edge Functions**
- In-memory cache grows unbounded in long-running functions
- Consider reducing TTL or adding size limits
- Switch to Redis for production workloads

### Debug Logging

Enable cache debug logging:

```typescript
// In Edge Function
const cache = getCache();
console.log(`[Cache] Type: ${cache.getType()}`);
console.log(`[Cache] Redis configured: ${isRedisConfigured()}`);
```
