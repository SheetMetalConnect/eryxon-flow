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

/** Safely unwrap a PostgREST embedded resource (may be array or object) */
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

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

  const debouncedFetch = useDebouncedCallback(fetchRouting, 150);

  useEffect(() => {
    if (!partId) {
      // Only update state if routing is not already empty to prevent re-render loops
      setRouting(prev => prev.length === 0 ? prev : []);
      return;
    }

    fetchRouting();

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
        supabase.removeChannel(channel);
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
          .map((op: any) => ({ ...op, cells: unwrap(op.cells) }))
          .filter((op: any) => op.cells)
          .map((op: any) => ({
            cell_id: op.cell_id,
            cell_name: op.cells.name,
            cell_color: op.cells.color,
            sequence: op.cells.sequence,
            status: op.status,
          }))
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

  const debouncedFetch = useDebouncedCallback(fetchRouting, 200);

  useEffect(() => {
    if (!jobId || !tenantId) {
      // Only update state if routing is not already empty to prevent re-render loops
      setRouting(prev => prev.length === 0 ? prev : []);
      return;
    }

    fetchRouting();

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

  // Stable reference for jobIds to prevent infinite re-renders
  const jobIdsKey = jobIds.join(",");

  const fetchRoutings = useCallback(async () => {
    if (jobIds.length === 0 || !tenantId) {
      setRoutings(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Single query: operations with inner-joined parts (filtered by job_id) + cells
      const { data, error: queryError } = await supabase
        .from("operations")
        .select(`
          id,
          status,
          sequence,
          cell_id,
          part_id,
          cell:cells!operations_cell_id_fkey(id, name, color, sequence),
          part:parts!inner(id, job_id)
        `)
        .eq("tenant_id", tenantId)
        .in("part.job_id", jobIds);

      if (queryError) {
        // Fallback: if the inner join filter fails, try the two-query approach
        console.warn('[useMultipleJobsRouting] single query failed, trying fallback:', queryError.message);
        await fetchRoutingsFallback();
        return;
      }

      const jobRoutingsMap: Record<string, Map<string, CellRoutingData>> = {};
      jobIds.forEach((jobId) => { jobRoutingsMap[jobId] = new Map(); });

      (data || []).forEach((rawOp: any) => {
        const cell = unwrap(rawOp.cell);
        const part = unwrap(rawOp.part);
        if (!cell || !part) return;

        const jobId = part.job_id;
        const cellMap = jobRoutingsMap[jobId];
        if (!cellMap) return;

        const existing = cellMap.get(rawOp.cell_id);
        if (existing) {
          existing.operation_count++;
          if (rawOp.status === "completed") existing.completed_operations++;
        } else {
          cellMap.set(rawOp.cell_id, {
            cell_id: rawOp.cell_id,
            cell_name: cell.name,
            cell_color: cell.color,
            sequence: cell.sequence,
            operation_count: 1,
            completed_operations: rawOp.status === "completed" ? 1 : 0,
          });
        }
      });

      const result: Record<string, JobRouting> = {};
      Object.entries(jobRoutingsMap).forEach(([jobId, cellMap]) => {
        result[jobId] = Array.from(cellMap.values()).sort((a, b) => a.sequence - b.sequence);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdsKey, tenantId]);

  // Fallback two-query approach if single query with .in on joined table fails
  const fetchRoutingsFallback = useCallback(async () => {
    if (!tenantId) return;

    const { data: parts } = await supabase
      .from("parts")
      .select("id, job_id")
      .eq("tenant_id", tenantId)
      .in("job_id", jobIds);

    if (!parts || parts.length === 0) {
      setRoutings({});
      setLoading(false);
      return;
    }

    const partIds = parts.map((p: any) => p.id);
    const partJobMap = Object.fromEntries(parts.map((p: any) => [p.id, p.job_id]));

    const { data, error: queryError } = await supabase
      .from("operations")
      .select(`
        id, status, sequence, cell_id, part_id,
        cell:cells!operations_cell_id_fkey(id, name, color, sequence)
      `)
      .eq("tenant_id", tenantId)
      .in("part_id", partIds);

    if (queryError) throw queryError;

    const jobRoutingsMap: Record<string, Map<string, CellRoutingData>> = {};
    jobIds.forEach((jobId) => { jobRoutingsMap[jobId] = new Map(); });

    (data || []).forEach((rawOp: any) => {
      const cell = unwrap(rawOp.cell);
      if (!cell || !rawOp.part_id) return;

      const jobId = partJobMap[rawOp.part_id];
      const cellMap = jobRoutingsMap[jobId];
      if (!cellMap) return;

      const existing = cellMap.get(rawOp.cell_id);
      if (existing) {
        existing.operation_count++;
        if (rawOp.status === "completed") existing.completed_operations++;
      } else {
        cellMap.set(rawOp.cell_id, {
          cell_id: rawOp.cell_id,
          cell_name: cell.name,
          cell_color: cell.color,
          sequence: cell.sequence,
          operation_count: 1,
          completed_operations: rawOp.status === "completed" ? 1 : 0,
        });
      }
    });

    const result: Record<string, JobRouting> = {};
    Object.entries(jobRoutingsMap).forEach(([jobId, cellMap]) => {
      result[jobId] = Array.from(cellMap.values()).sort((a, b) => a.sequence - b.sequence);
    });

    setRoutings(result);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdsKey, tenantId]);

  useEffect(() => {
    fetchRoutings();
  }, [fetchRoutings]);

  return { routings, loading, error, refetch: fetchRoutings };
}
