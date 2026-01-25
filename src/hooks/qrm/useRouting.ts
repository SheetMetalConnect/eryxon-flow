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

/**
 * Shared type for cell routing data
 */
interface CellRoutingData {
  cell_id: string;
  cell_name: string;
  cell_color: string | null;
  sequence: number;
  operation_count: number;
  completed_operations: number;
}

/**
 * Helper to group operations by cell
 */
function groupOperationsByCell(
  operations: Array<{
    cell_id: string;
    cell_name?: string;
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
        cell_name: op.cell_name || "Unknown",
        cell_color: op.cell_color || null,
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
 * @param tenantId - Optional tenant ID (used for realtime subscription scope)
 * @returns Routing data, loading state, error, and refetch function
 */
export function usePartRouting(
  partId: string | null,
  tenantId?: string | null
) {
  const [routing, setRouting] = useState<PartRouting>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRouting = useCallback(async () => {
    if (!partId) {
      setRouting([]);
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
      setRouting([]);
      return;
    }

    fetchRouting();

    // Subscribe to real-time updates on operations for this part
    const channel = supabase
      .channel(`part-routing-${partId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `part_id=eq.${partId}`,
        },
        () => {
          debouncedFetch();
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
  }, [partId, fetchRouting, debouncedFetch]);

  return { routing, loading, error, refetch: fetchRouting };
}

/**
 * Hook to fetch job routing
 *
 * @param jobId - The job ID to fetch routing for
 * @param tenantId - Optional tenant ID for realtime subscription scope
 * @returns Routing data, loading state, error, and refetch function
 */
export function useJobRouting(jobId: string | null, tenantId?: string | null) {
  const [routing, setRouting] = useState<JobRouting>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRouting = useCallback(async () => {
    if (!jobId) {
      setRouting([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all operations for the job's parts with cell information
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
      });
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Debounced fetch
  const debouncedFetch = useDebouncedCallback(fetchRouting, 200);

  useEffect(() => {
    if (!jobId) {
      setRouting([]);
      return;
    }

    fetchRouting();

    // Subscribe to real-time updates
    // Note: We can't filter by job_id directly on operations since it's through a join
    // If tenantId is available, use it to reduce scope; otherwise skip realtime
    if (tenantId) {
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
    }
  }, [jobId, tenantId, fetchRouting, debouncedFetch]);

  return { routing, loading, error, refetch: fetchRouting };
}

/**
 * Hook to fetch routing for multiple jobs efficiently
 * Note: This hook does not use realtime subscriptions to avoid excessive updates
 *
 * @param jobIds - Array of job IDs to fetch routing for
 * @returns Map of routing by job ID
 */
export function useMultipleJobsRouting(jobIds: string[]) {
  const [routings, setRoutings] = useState<Record<string, JobRouting>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoutings = useCallback(async () => {
    if (jobIds.length === 0) {
      setRoutings({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all operations for all jobs in one query
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
      });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(jobIds)]);

  useEffect(() => {
    fetchRoutings();
    // No realtime subscription for bulk queries to prevent excessive updates
  }, [fetchRoutings]);

  return { routings, loading, error, refetch: fetchRoutings };
}
