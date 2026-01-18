/**
 * Cache invalidation utilities for React Query
 *
 * Provides functions to invalidate related caches when data changes,
 * ensuring consistency across the application.
 */

import { QueryClient } from "@tanstack/react-query";
import { QueryKeys } from "./queryClient";

/**
 * Invalidate all job-related caches
 */
export function invalidateJobCaches(
  queryClient: QueryClient,
  tenantId: string,
  jobId?: string
) {
  // Invalidate job list
  queryClient.invalidateQueries({ queryKey: QueryKeys.jobs.all(tenantId) });

  // Invalidate specific job if provided
  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.jobs.detail(jobId) });
  }

  // Invalidate dashboard stats (jobs affect stats)
  queryClient.invalidateQueries({
    queryKey: QueryKeys.dashboard.stats(tenantId),
  });
}

/**
 * Invalidate all part-related caches
 */
export function invalidatePartCaches(
  queryClient: QueryClient,
  tenantId: string,
  partId?: string,
  jobId?: string
) {
  // Invalidate part list
  queryClient.invalidateQueries({ queryKey: QueryKeys.parts.all(tenantId) });

  // Invalidate specific part if provided
  if (partId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
  }

  // Invalidate parts by job if job ID provided
  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.parts.byJob(jobId) });
    // Also invalidate the job itself (part count may change)
    queryClient.invalidateQueries({ queryKey: QueryKeys.jobs.detail(jobId) });
  }
}

/**
 * Invalidate all operation-related caches
 */
export function invalidateOperationCaches(
  queryClient: QueryClient,
  tenantId: string,
  operationId?: string,
  cellId?: string,
  partId?: string
) {
  // Invalidate operation list
  queryClient.invalidateQueries({
    queryKey: QueryKeys.operations.all(tenantId),
  });

  // Invalidate specific operation if provided
  if (operationId) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.operations.detail(operationId),
    });
  }

  // Invalidate operations by cell if cell ID provided
  if (cellId) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.operations.byCell(cellId),
    });
    queryClient.invalidateQueries({
      queryKey: QueryKeys.operations.workQueue(cellId),
    });
    // Also invalidate cell QRM metrics
    queryClient.invalidateQueries({
      queryKey: QueryKeys.cells.qrmMetrics(cellId, tenantId),
    });
  }

  // Invalidate operations by part if part ID provided
  if (partId) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.operations.byPart(partId),
    });
  }

  // Invalidate all QRM metrics (operation changes affect capacity)
  queryClient.invalidateQueries({
    queryKey: QueryKeys.cells.allQrmMetrics(tenantId),
  });

  // Invalidate dashboard stats
  queryClient.invalidateQueries({
    queryKey: QueryKeys.dashboard.stats(tenantId),
  });
}

/**
 * Invalidate cell-related caches
 */
export function invalidateCellCaches(
  queryClient: QueryClient,
  tenantId: string,
  cellId?: string
) {
  // Invalidate cell list
  queryClient.invalidateQueries({ queryKey: QueryKeys.cells.all(tenantId) });

  // Invalidate specific cell if provided
  if (cellId) {
    queryClient.invalidateQueries({ queryKey: QueryKeys.cells.detail(cellId) });
    queryClient.invalidateQueries({
      queryKey: QueryKeys.cells.qrmMetrics(cellId, tenantId),
    });
  }

  // Invalidate all QRM metrics
  queryClient.invalidateQueries({
    queryKey: QueryKeys.cells.allQrmMetrics(tenantId),
  });
}

/**
 * Invalidate time entry related caches
 */
export function invalidateTimeEntryCaches(
  queryClient: QueryClient,
  tenantId: string,
  operationId?: string,
  userId?: string
) {
  // Invalidate time entry list
  queryClient.invalidateQueries({
    queryKey: QueryKeys.timeEntries.all(tenantId),
  });
  queryClient.invalidateQueries({
    queryKey: QueryKeys.timeEntries.active(tenantId),
  });

  // Invalidate by operation if provided
  if (operationId) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.timeEntries.byOperation(operationId),
    });
    // Also invalidate the operation (timing data may have changed)
    queryClient.invalidateQueries({
      queryKey: QueryKeys.operations.detail(operationId),
    });
  }

  // Invalidate by user if provided
  if (userId) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.timeEntries.byUser(userId),
    });
  }

  // Invalidate dashboard activity
  queryClient.invalidateQueries({
    queryKey: QueryKeys.dashboard.activity(tenantId),
  });
}

/**
 * Invalidate issue-related caches
 */
export function invalidateIssueCaches(
  queryClient: QueryClient,
  tenantId: string,
  operationId?: string
) {
  // Invalidate issue lists
  queryClient.invalidateQueries({ queryKey: QueryKeys.issues.all(tenantId) });
  queryClient.invalidateQueries({
    queryKey: QueryKeys.issues.pending(tenantId),
  });

  // Invalidate by operation if provided
  if (operationId) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.issues.byOperation(operationId),
    });
  }
}

/**
 * Invalidate configuration-related caches
 */
export function invalidateConfigCaches(
  queryClient: QueryClient,
  tenantId: string,
  configType?: "materials" | "scrapReasons" | "resources" | "stepsTemplates"
) {
  if (configType) {
    queryClient.invalidateQueries({
      queryKey: QueryKeys.config[configType](tenantId),
    });
  } else {
    // Invalidate all config caches
    queryClient.invalidateQueries({
      queryKey: QueryKeys.config.materials(tenantId),
    });
    queryClient.invalidateQueries({
      queryKey: QueryKeys.config.scrapReasons(tenantId),
    });
    queryClient.invalidateQueries({
      queryKey: QueryKeys.config.resources(tenantId),
    });
    queryClient.invalidateQueries({
      queryKey: QueryKeys.config.stepsTemplates(tenantId),
    });
  }
}

/**
 * Invalidate all caches for a tenant
 * Use sparingly - only for major data refreshes
 */
export function invalidateAllCaches(
  queryClient: QueryClient,
  tenantId: string
) {
  // Invalidate all queries that include the tenant ID
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key.includes(tenantId);
    },
  });
}

/**
 * Prefetch commonly needed data
 * Call this after login or tenant switch
 */
export async function prefetchCommonData(
  queryClient: QueryClient,
  tenantId: string,
  fetchFunctions: {
    fetchCells?: () => Promise<any>;
    fetchMaterials?: () => Promise<any>;
    fetchScrapReasons?: () => Promise<any>;
  }
) {
  const prefetchPromises: Promise<void>[] = [];

  if (fetchFunctions.fetchCells) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: QueryKeys.cells.all(tenantId),
        queryFn: fetchFunctions.fetchCells,
      })
    );
  }

  if (fetchFunctions.fetchMaterials) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: QueryKeys.config.materials(tenantId),
        queryFn: fetchFunctions.fetchMaterials,
      })
    );
  }

  if (fetchFunctions.fetchScrapReasons) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: QueryKeys.config.scrapReasons(tenantId),
        queryFn: fetchFunctions.fetchScrapReasons,
      })
    );
  }

  await Promise.all(prefetchPromises);
}
