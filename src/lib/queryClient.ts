/**
 * React Query client configuration with optimized caching settings
 *
 * This configuration provides sensible defaults for caching while
 * maintaining data freshness for a real-time MES application.
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Stale time presets (in milliseconds)
 *
 * These define how long data is considered "fresh" before React Query
 * will refetch in the background on window focus or component mount.
 */
export const StaleTime = {
  /** Immediately stale - always refetch (default React Query behavior) */
  NONE: 0,

  /** Very short - for rapidly changing data like active operations */
  VERY_SHORT: 10 * 1000, // 10 seconds

  /** Short - for frequently changing data like job lists */
  SHORT: 30 * 1000, // 30 seconds

  /** Medium - for moderately changing data like cell configurations */
  MEDIUM: 2 * 60 * 1000, // 2 minutes

  /** Long - for slowly changing data like user profiles */
  LONG: 5 * 60 * 1000, // 5 minutes

  /** Very long - for rarely changing data like app settings */
  VERY_LONG: 15 * 60 * 1000, // 15 minutes

  /** Infinite - data never becomes stale automatically */
  INFINITE: Infinity,
} as const;

/**
 * Cache time presets (in milliseconds)
 *
 * These define how long inactive data stays in the cache before
 * being garbage collected.
 */
export const CacheTime = {
  /** No cache - remove immediately when unused */
  NONE: 0,

  /** Short cache - for temporary data */
  SHORT: 1 * 60 * 1000, // 1 minute

  /** Medium cache - default for most data */
  MEDIUM: 5 * 60 * 1000, // 5 minutes (React Query default)

  /** Long cache - for stable data */
  LONG: 15 * 60 * 1000, // 15 minutes

  /** Very long cache - for rarely changing data */
  VERY_LONG: 30 * 60 * 1000, // 30 minutes

  /** Persistent cache - keep for the session */
  SESSION: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Query key factory for consistent cache key generation
 *
 * Usage:
 *   queryKey: QueryKeys.jobs.all(tenantId)
 *   queryKey: QueryKeys.jobs.detail(jobId)
 *   queryKey: QueryKeys.operations.byCell(cellId)
 */
export const QueryKeys = {
  // Jobs
  jobs: {
    all: (tenantId: string) => ["jobs", "all", tenantId] as const,
    detail: (jobId: string) => ["jobs", "detail", jobId] as const,
    byStatus: (tenantId: string, status: string) =>
      ["jobs", "byStatus", tenantId, status] as const,
  },

  // Parts
  parts: {
    all: (tenantId: string) => ["parts", "all", tenantId] as const,
    detail: (partId: string) => ["parts", "detail", partId] as const,
    byJob: (jobId: string) => ["parts", "byJob", jobId] as const,
  },

  // Operations
  operations: {
    all: (tenantId: string) => ["operations", "all", tenantId] as const,
    detail: (operationId: string) => ["operations", "detail", operationId] as const,
    byCell: (cellId: string) => ["operations", "byCell", cellId] as const,
    byPart: (partId: string) => ["operations", "byPart", partId] as const,
    workQueue: (cellId: string) => ["operations", "workQueue", cellId] as const,
  },

  // Cells
  cells: {
    all: (tenantId: string) => ["cells", "all", tenantId] as const,
    detail: (cellId: string) => ["cells", "detail", cellId] as const,
    qrmMetrics: (cellId: string, tenantId: string) =>
      ["cells", "qrmMetrics", cellId, tenantId] as const,
    allQrmMetrics: (tenantId: string) =>
      ["cells", "allQrmMetrics", tenantId] as const,
  },

  // Time entries
  timeEntries: {
    all: (tenantId: string) => ["timeEntries", "all", tenantId] as const,
    byOperation: (operationId: string) =>
      ["timeEntries", "byOperation", operationId] as const,
    byUser: (userId: string) => ["timeEntries", "byUser", userId] as const,
    active: (tenantId: string) => ["timeEntries", "active", tenantId] as const,
  },

  // Issues
  issues: {
    all: (tenantId: string) => ["issues", "all", tenantId] as const,
    pending: (tenantId: string) => ["issues", "pending", tenantId] as const,
    byOperation: (operationId: string) =>
      ["issues", "byOperation", operationId] as const,
  },

  // Users and profiles
  profiles: {
    all: (tenantId: string) => ["profiles", "all", tenantId] as const,
    detail: (userId: string) => ["profiles", "detail", userId] as const,
    current: () => ["profiles", "current"] as const,
  },

  // Configuration
  config: {
    materials: (tenantId: string) => ["config", "materials", tenantId] as const,
    scrapReasons: (tenantId: string) =>
      ["config", "scrapReasons", tenantId] as const,
    resources: (tenantId: string) => ["config", "resources", tenantId] as const,
    stepsTemplates: (tenantId: string) =>
      ["config", "stepsTemplates", tenantId] as const,
  },

  // Dashboard stats
  dashboard: {
    stats: (tenantId: string) => ["dashboard", "stats", tenantId] as const,
    activity: (tenantId: string) => ["dashboard", "activity", tenantId] as const,
  },

  // Tenant
  tenant: {
    current: (tenantId: string) => ["tenant", "current", tenantId] as const,
    settings: (tenantId: string) => ["tenant", "settings", tenantId] as const,
  },
} as const;

/**
 * Default query options for different data categories
 */
export const defaultQueryOptions = {
  /** For real-time operational data (work queue, active operations) */
  realtime: {
    staleTime: StaleTime.VERY_SHORT,
    gcTime: CacheTime.SHORT,
    refetchOnWindowFocus: true,
  },

  /** For frequently updated lists (jobs, parts, operations) */
  lists: {
    staleTime: StaleTime.SHORT,
    gcTime: CacheTime.MEDIUM,
    refetchOnWindowFocus: true,
  },

  /** For detail views (job detail, operation detail) */
  details: {
    staleTime: StaleTime.MEDIUM,
    gcTime: CacheTime.LONG,
    refetchOnWindowFocus: false,
  },

  /** For configuration data (cells, materials, resources) */
  config: {
    staleTime: StaleTime.LONG,
    gcTime: CacheTime.VERY_LONG,
    refetchOnWindowFocus: false,
  },

  /** For static data (app settings, tenant info) */
  static: {
    staleTime: StaleTime.VERY_LONG,
    gcTime: CacheTime.SESSION,
    refetchOnWindowFocus: false,
  },
} as const;

/**
 * Create a configured QueryClient instance
 *
 * This client has optimized defaults for a real-time MES application:
 * - Sensible retry logic (3 retries with exponential backoff)
 * - Window focus refetching enabled
 * - Reasonable default stale/cache times
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 30 seconds by default
        staleTime: StaleTime.SHORT,

        // Keep inactive data in cache for 5 minutes
        gcTime: CacheTime.MEDIUM,

        // Retry failed queries up to 3 times
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus for real-time data
        refetchOnWindowFocus: true,

        // Don't refetch on reconnect by default (Supabase handles this)
        refetchOnReconnect: false,

        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

/**
 * Singleton query client instance
 * Use this for consistency across the app
 */
export const queryClient = createQueryClient();
