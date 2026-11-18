/**
 * Cache utilities for common data caching patterns
 *
 * Provides high-level caching functions for frequently accessed data.
 * Uses the cache abstraction layer which automatically selects Redis or memory.
 */

import { getCache, getCachedJson, setCachedJson, CacheKeys, CacheTTL } from './cache.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cache wrapper that handles the get-or-fetch pattern
 *
 * @param key Cache key
 * @param ttlSeconds Cache TTL in seconds
 * @param fetchFn Function to fetch data if not in cache
 * @returns Cached or freshly fetched data
 */
export async function cacheOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await getCachedJson<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache (don't await to avoid blocking)
  setCachedJson(key, data, ttlSeconds).catch((error) => {
    console.error(`[Cache] Error caching key ${key}:`, error);
  });

  return data;
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(key: string): Promise<void> {
  const cache = getCache();
  await cache.del(key);
}

/**
 * Invalidate multiple cache keys matching a pattern
 * Note: Pattern matching is simulated - we delete known keys
 */
export async function invalidateCachePattern(
  keys: string[]
): Promise<void> {
  const cache = getCache();
  await Promise.all(keys.map((key) => cache.del(key)));
}

// ============================================================================
// QRM Metrics Caching
// ============================================================================

export interface CachedQRMMetrics {
  cell_id: string;
  tenant_id: string;
  wip_count: number;
  capacity_limit: number | null;
  capacity_utilization: number | null;
  is_at_capacity: boolean;
  operations_pending: number;
  operations_in_progress: number;
  cached_at: number;
}

/**
 * Get QRM metrics for a cell with caching
 */
export async function getCachedQRMMetrics(
  supabase: SupabaseClient,
  cellId: string,
  tenantId: string
): Promise<CachedQRMMetrics | null> {
  const key = CacheKeys.qrmMetrics(cellId, tenantId);

  return cacheOrFetch(key, CacheTTL.MEDIUM, async () => {
    const { data, error } = await supabase.rpc('get_cell_qrm_metrics', {
      cell_id_param: cellId,
      tenant_id_param: tenantId,
    });

    if (error) {
      console.error('[Cache] Error fetching QRM metrics:', error);
      return null;
    }

    return {
      ...data,
      cell_id: cellId,
      tenant_id: tenantId,
      cached_at: Date.now(),
    } as CachedQRMMetrics;
  });
}

/**
 * Invalidate QRM metrics cache for a cell
 */
export async function invalidateQRMMetrics(
  cellId: string,
  tenantId: string
): Promise<void> {
  await invalidateCache(CacheKeys.qrmMetrics(cellId, tenantId));
}

// ============================================================================
// Dashboard Stats Caching
// ============================================================================

export interface CachedDashboardStats {
  tenant_id: string;
  total_jobs: number;
  jobs_by_status: Record<string, number>;
  overdue_jobs: number;
  due_this_week: number;
  total_operations: number;
  operations_by_status: Record<string, number>;
  cached_at: number;
}

/**
 * Get dashboard stats with caching
 */
export async function getCachedDashboardStats(
  supabase: SupabaseClient,
  tenantId: string
): Promise<CachedDashboardStats | null> {
  const key = CacheKeys.dashboardStats(tenantId);

  return cacheOrFetch(key, CacheTTL.LONG, async () => {
    // Fetch jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, status, due_date')
      .eq('tenant_id', tenantId);

    if (jobsError) {
      console.error('[Cache] Error fetching jobs for stats:', jobsError);
      return null;
    }

    // Fetch operations
    const { data: operations, error: opsError } = await supabase
      .from('operations')
      .select('id, status')
      .eq('tenant_id', tenantId);

    if (opsError) {
      console.error('[Cache] Error fetching operations for stats:', opsError);
      return null;
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Calculate job stats
    const jobsByStatus: Record<string, number> = {};
    let overdueJobs = 0;
    let dueThisWeek = 0;

    (jobs || []).forEach((job: any) => {
      jobsByStatus[job.status] = (jobsByStatus[job.status] || 0) + 1;

      if (job.due_date) {
        const dueDate = new Date(job.due_date);
        if (dueDate < now && job.status !== 'completed' && job.status !== 'cancelled') {
          overdueJobs++;
        } else if (dueDate <= weekFromNow && dueDate >= now) {
          dueThisWeek++;
        }
      }
    });

    // Calculate operation stats
    const operationsByStatus: Record<string, number> = {};
    (operations || []).forEach((op: any) => {
      operationsByStatus[op.status] = (operationsByStatus[op.status] || 0) + 1;
    });

    return {
      tenant_id: tenantId,
      total_jobs: jobs?.length || 0,
      jobs_by_status: jobsByStatus,
      overdue_jobs: overdueJobs,
      due_this_week: dueThisWeek,
      total_operations: operations?.length || 0,
      operations_by_status: operationsByStatus,
      cached_at: Date.now(),
    };
  });
}

/**
 * Invalidate dashboard stats cache for a tenant
 */
export async function invalidateDashboardStats(tenantId: string): Promise<void> {
  await invalidateCache(CacheKeys.dashboardStats(tenantId));
}

// ============================================================================
// Tenant Settings Caching
// ============================================================================

export interface CachedTenantSettings {
  id: string;
  name: string;
  settings: Record<string, any>;
  plan_type: string;
  cached_at: number;
}

/**
 * Get tenant settings with caching
 */
export async function getCachedTenantSettings(
  supabase: SupabaseClient,
  tenantId: string
): Promise<CachedTenantSettings | null> {
  const key = CacheKeys.tenantSettings(tenantId);

  return cacheOrFetch(key, CacheTTL.LONG, async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, settings, plan_type')
      .eq('id', tenantId)
      .single();

    if (error) {
      console.error('[Cache] Error fetching tenant settings:', error);
      return null;
    }

    return {
      ...data,
      cached_at: Date.now(),
    } as CachedTenantSettings;
  });
}

/**
 * Invalidate tenant settings cache
 */
export async function invalidateTenantSettings(tenantId: string): Promise<void> {
  await invalidateCache(CacheKeys.tenantSettings(tenantId));
}

// ============================================================================
// Cache Health & Debugging
// ============================================================================

/**
 * Get cache health status
 */
export async function getCacheHealth(): Promise<{
  type: 'redis' | 'memory';
  healthy: boolean;
  latencyMs: number;
}> {
  const cache = getCache();
  const start = Date.now();

  try {
    // Test write
    await cache.set('health:check', 'ok', 60);

    // Test read
    const value = await cache.get('health:check');

    // Cleanup
    await cache.del('health:check');

    return {
      type: cache.getType(),
      healthy: value === 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      type: cache.getType(),
      healthy: false,
      latencyMs: Date.now() - start,
    };
  }
}
