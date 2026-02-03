/**
 * Routing Hooks
 *
 * Provides routing visualization for parts and jobs.
 * Shows the flow of operations through cells.
 *
 * SRP: Only handles routing-related functionality
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import type { PartRouting, JobRouting } from "@/types/qrm";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Shared type for cell routing data
 * cell_name is nullable to let UI/localization layer render translated fallback
 */
interface CellRoutingData {
  cell_id: string;
  cell_name: string | null;
  cell_color: string | null;
  sequence: number;
  operation_count: number;
  completed_operations: number;
}

/**
 * Helper to group operations by cell
 * Returns null for missing cell names - UI should provide localized fallback
 */
function groupOperationsByCell(
  operations: Array<{
    cell_id: string;
    cell_name?: string | null;
    cell_color?: string | null;
    sequence: number;
    status: string;
  }>
): CellRoutingData[] {
  const cellMap = new Map<string, CellRoutingData>();

  operations.forEach((op) => {
    if (!op.cell_id) return;

    const existing = cellMap.get(op.cell_id);

    if (existing) {
      existing.operation_count++;
      if (op.status === "completed") {
        existing.completed_operations++;
      }
    } else {
      cellMap.set(op.cell_id, {
        cell_id: op.cell_id,
        cell_name: op.cell_name ?? null,
        cell_color: op.cell_color ?? null,
        sequence: op.sequence,
        operation_count: 1,
        completed_operations: op.status === "completed" ? 1 : 0,
      });
    }
  });

  return Array.from(cellMap.values()).sort((a, b) => a.sequence - b.sequence);
}

/**
 * Hook to fetch part routing
 *
 * @param partId - The part ID to fetch routing for
 * @param tenantId - Tenant ID for RLS filtering and realtime subscription scope
 * @returns Routing data, loading state, error, and refetch function
 */
export function usePartRouting(
  partId: string | null,
  tenantId: string | null
) {
  const [routing, setRouting] = useState<PartRouting>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRouting = useCallback(async () => {
    if (!partId) {
      // Only update state if routing is not already empty to prevent re-render loops
      setRouting(prev => prev.length === 0 ? prev : []);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("get_part_routing", {
        p_part_id: partId,
      });

      if (rpcError) throw rpcError;

      const routingData = groupOperationsByCell(
        (data || []).map(
          (op: {
            cell_id: string;
            cell_name: string;
            sequence: number;
            status: string;
          }) => ({
            cell_id: op.cell_id,
            cell_name: op.cell_name,
            sequence: op.sequence,
            status: op.status,
          })
        )
      );

      setRouting(routingData);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to fetch part routing", err, {
        operation: "usePartRouting",
        entityType: "part",
        entityId: partId,
      });
    } finally {
      setLoading(false);
    }
  }, [partId]);

  // Debounced fetch
  const debouncedFetch = useDebouncedCallback(fetchRouting, 150);

  useEffect(() => {
    if (!partId) {
      // Only update state if routing is not already empty to prevent re-render loops
      setRouting(prev => prev.length === 0 ? prev : []);
      return;
    }

    fetchRouting();

    // Subscribe to real-time updates on operations
    // Use tenant_id filter for RLS compliance; client-side filter by part_id
    if (tenantId) {
      const channel = supabase
        .channel(`part-routing-${partId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "operations",
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload: RealtimePostgresChangesPayload<{ part_id?: string }>) => {
            // Client-side filter: only refetch if event matches our part
            const record = payload.new as { part_id?: string } | undefined;
            const oldRecord = payload.old as { part_id?: string } | undefined;
            if (record?.part_id === partId || oldRecord?.part_id === partId) {
              debouncedFetch();
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            logger.error("Realtime subscription error", undefined, {
              operation: "usePartRouting",
              channelName: `part-routing-${partId}`,
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [partId, tenantId, fetchRouting, debouncedFetch]);

  return { routing, loading, error, refetch: fetchRouting };
}

/**
 * Hook to fetch job routing
 *
 * @param jobId - The job ID to fetch routing for
 * @param tenantId - Tenant ID for RLS filtering (required)
 * @returns Routing data, loading state, error, and refetch function
 */
export function useJobRouting(jobId: string | null, tenantId: string | null) {
  const [routing, setRouting] = useState<JobRouting>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRouting = useCallback(async () => {
    if (!jobId || !tenantId) {
      // Only update state if routing is not already empty to prevent re-render loops
      setRouting(prev => prev.length === 0 ? prev : []);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all operations for the job's parts with cell information
      // Include tenant_id filter for RLS compliance
      const { data, error: queryError } = await supabase
        .from("operations")
        .select(
          `
          id,
          status,
          sequence,
          cell_id,
          cells:cell_id (
            id,
            name,
            color,
            sequence
          ),
          parts!inner (
            id,
            job_id
          )
        `
        )
        .eq("tenant_id", tenantId)
        .eq("parts.job_id", jobId);

      if (queryError) throw queryError;

      const routingData = groupOperationsByCell(
        (data || [])
          .filter(
            (op: {
              cells: { name: string; color: string | null; sequence: number } | null;
            }) => op.cells
          )
          .map(
            (op: {
              cell_id: string;
              status: string;
              cells: { name: string; color: string | null; sequence: number };
            }) => ({
              cell_id: op.cell_id,
              cell_name: op.cells.name,
              cell_color: op.cells.color,
              sequence: op.cells.sequence,
              status: op.status,
            })
          )
      );

      setRouting(routingData);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to fetch job routing", err, {
        operation: "useJobRouting",
        entityType: "job",
        entityId: jobId,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [jobId, tenantId]);

  // Debounced fetch
  const debouncedFetch = useDebouncedCallback(fetchRouting, 200);

  useEffect(() => {
    if (!jobId || !tenantId) {
      // Only update state if routing is not already empty to prevent re-render loops
      setRouting(prev => prev.length === 0 ? prev : []);
      return;
    }

    fetchRouting();

    // Subscribe to real-time updates
    // Filter by tenant_id for RLS compliance
    const channel = supabase
      .channel(`job-routing-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          logger.error("Realtime subscription error", undefined, {
            operation: "useJobRouting",
            channelName: `job-routing-${jobId}`,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [jobId, tenantId, fetchRouting, debouncedFetch]);

  return { routing, loading, error, refetch: fetchRouting };
}

/**
 * Hook to fetch routing for multiple jobs efficiently
 * Note: This hook does not use realtime subscriptions to avoid excessive updates
 *
 * @param jobIds - Array of job IDs to fetch routing for
 * @param tenantId - Tenant ID for RLS filtering (required)
 * @returns Map of routing by job ID
 */
export function useMultipleJobsRouting(jobIds: string[], tenantId: string | null) {
  const [routings, setRoutings] = useState<Record<string, JobRouting>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoutings = useCallback(async () => {
    if (jobIds.length === 0 || !tenantId) {
      // Only update state if routings is not already empty to prevent re-render loops
      setRoutings(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all operations for all jobs in one query with tenant filter
      const { data, error: queryError } = await supabase
        .from("operations")
        .select(
          `
          id,
          status,
          sequence,
          cell_id,
          cells:cell_id (
            id,
            name,
            color,
            sequence
          ),
          parts!inner (
            id,
            job_id
          )
        `
        )
        .eq("tenant_id", tenantId)
        .in("parts.job_id", jobIds);

      if (queryError) throw queryError;

      // Group operations by job, then by cell
      const jobRoutingsMap: Record<string, Map<string, CellRoutingData>> = {};

      // Initialize maps for each job
      jobIds.forEach((jobId) => {
        jobRoutingsMap[jobId] = new Map();
      });

      // Process operations
      (data || []).forEach(
        (op: {
          id: string;
          status: string;
          sequence: number;
          cell_id: string;
          cells: {
            id: string;
            name: string;
            color: string | null;
            sequence: number;
          } | null;
          parts: { id: string; job_id: string };
        }) => {
          if (!op.cells || !op.parts) return;

          const jobId = op.parts.job_id;
          const cellId = op.cell_id;
          const cellMap = jobRoutingsMap[jobId];

          if (!cellMap) return;

          const existing = cellMap.get(cellId);

          if (existing) {
            existing.operation_count++;
            if (op.status === "completed") {
              existing.completed_operations++;
            }
          } else {
            cellMap.set(cellId, {
              cell_id: cellId,
              cell_name: op.cells.name,
              cell_color: op.cells.color,
              sequence: op.cells.sequence,
              operation_count: 1,
              completed_operations: op.status === "completed" ? 1 : 0,
            });
          }
        }
      );

      // Convert to final format
      const result: Record<string, JobRouting> = {};
      Object.entries(jobRoutingsMap).forEach(([jobId, cellMap]) => {
        result[jobId] = Array.from(cellMap.values()).sort(
          (a, b) => a.sequence - b.sequence
        );
      });

      setRoutings(result);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to fetch multiple jobs routing", err, {
        operation: "useMultipleJobsRouting",
        entityType: "job",
        jobCount: jobIds.length,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(jobIds), tenantId]);

  useEffect(() => {
    fetchRoutings();
    // No realtime subscription for bulk queries to prevent excessive updates
  }, [fetchRoutings]);

  return { routings, loading, error, refetch: fetchRoutings };
}
