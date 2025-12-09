import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import type {
  CellQRMMetrics,
  NextCellCapacity,
  PartRouting,
  JobRouting,
} from "@/types/qrm";

/**
 * Hook to fetch QRM metrics for a specific cell
 */
export function useCellQRMMetrics(
  cellId: string | null,
  tenantId: string | null,
) {
  const [metrics, setMetrics] = useState<CellQRMMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!cellId || !tenantId) {
      setMetrics(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_cell_qrm_metrics",
        {
          cell_id_param: cellId,
          tenant_id_param: tenantId,
        },
      );

      if (rpcError) throw rpcError;
      setMetrics(data as CellQRMMetrics);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to fetch cell QRM metrics", err, {
        operation: "useCellQRMMetrics",
        entityType: "cell",
        entityId: cellId,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [cellId, tenantId]);

  // Debounced fetch to prevent cascade updates
  const debouncedFetch = useDebouncedCallback(fetchMetrics, 150);

  useEffect(() => {
    if (!cellId || !tenantId) {
      setMetrics(null);
      return;
    }

    fetchMetrics();

    // Subscribe to real-time updates with proper filtering
    const channel = supabase
      .channel(`qrm-cell-${cellId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `cell_id=eq.${cellId}`,
        },
        () => {
          debouncedFetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cells",
          filter: `id=eq.${cellId}`,
        },
        () => {
          debouncedFetch();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          logger.error("Realtime subscription error", undefined, {
            operation: "useCellQRMMetrics",
            channelName: `qrm-cell-${cellId}`,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [cellId, tenantId, fetchMetrics, debouncedFetch]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

/**
 * Hook to check next cell capacity
 */
export function useNextCellCapacity(
  currentCellId: string | null,
  tenantId: string | null,
) {
  const [capacity, setCapacity] = useState<NextCellCapacity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCapacity = useCallback(async () => {
    if (!currentCellId || !tenantId) {
      setCapacity(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "check_next_cell_capacity",
        {
          current_cell_id: currentCellId,
          tenant_id_param: tenantId,
        },
      );

      if (rpcError) throw rpcError;
      setCapacity(data as NextCellCapacity);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to check next cell capacity", err, {
        operation: "useNextCellCapacity",
        entityType: "cell",
        entityId: currentCellId,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [currentCellId, tenantId]);

  // Debounced fetch to prevent cascade updates
  const debouncedFetch = useDebouncedCallback(fetchCapacity, 200);

  useEffect(() => {
    if (!currentCellId || !tenantId) {
      setCapacity(null);
      return;
    }

    fetchCapacity();

    // Subscribe to real-time updates on operations
    // Note: We filter by tenant_id to reduce scope since we can't filter by related cells
    const channel = supabase
      .channel(`next-cell-capacity-${currentCellId}`)
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
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          logger.error("Realtime subscription error", undefined, {
            operation: "useNextCellCapacity",
            channelName: `next-cell-capacity-${currentCellId}`,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentCellId, tenantId, fetchCapacity, debouncedFetch]);

  return { capacity, loading, error, refetch: fetchCapacity };
}

/**
 * Hook to fetch part routing
 */
export function usePartRouting(partId: string | null, tenantId?: string | null) {
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
      const { data, error: rpcError } = await supabase.rpc(
        "get_part_routing",
        { p_part_id: partId }
      );

      if (rpcError) throw rpcError;

      // Group operations by cell and aggregate counts
      const cellMap = new Map<string, {
        cell_id: string;
        cell_name: string;
        cell_color: string | null;
        sequence: number;
        operation_count: number;
        completed_operations: number;
      }>();

      (data || []).forEach((op: {
        cell_id: string;
        cell_name: string;
        sequence: number;
        status: string;
      }) => {
        if (!op.cell_id) return;

        const existing = cellMap.get(op.cell_id);

        if (existing) {
          existing.operation_count++;
          if (op.status === 'completed') {
            existing.completed_operations++;
          }
        } else {
          cellMap.set(op.cell_id, {
            cell_id: op.cell_id,
            cell_name: op.cell_name || 'Unknown',
            cell_color: null,
            sequence: op.sequence,
            operation_count: 1,
            completed_operations: op.status === 'completed' ? 1 : 0,
          });
        }
      });

      // Convert to array and sort by sequence
      const routingData = Array.from(cellMap.values())
        .sort((a, b) => a.sequence - b.sequence);

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
        .select(`
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
        `)
        .eq("parts.job_id", jobId);

      if (queryError) throw queryError;

      // Group operations by cell
      const cellMap = new Map<string, {
        cell_id: string;
        cell_name: string;
        cell_color: string | null;
        sequence: number;
        operation_count: number;
        completed_operations: number;
      }>();

      (data || []).forEach((op: {
        id: string;
        status: string;
        sequence: number;
        cell_id: string;
        cells: { id: string; name: string; color: string | null; sequence: number } | null;
        parts: { id: string; job_id: string };
      }) => {
        if (!op.cells) return;

        const cellId = op.cell_id;
        const existing = cellMap.get(cellId);

        if (existing) {
          existing.operation_count++;
          if (op.status === 'completed') {
            existing.completed_operations++;
          }
        } else {
          cellMap.set(cellId, {
            cell_id: cellId,
            cell_name: op.cells.name,
            cell_color: op.cells.color,
            sequence: op.cells.sequence,
            operation_count: 1,
            completed_operations: op.status === 'completed' ? 1 : 0,
          });
        }
      });

      // Convert to array and sort by cell sequence
      const routingData = Array.from(cellMap.values())
        .sort((a, b) => a.sequence - b.sequence);

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
        .select(`
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
        `)
        .in("parts.job_id", jobIds);

      if (queryError) throw queryError;

      // Group operations by job, then by cell
      const jobRoutingsMap: Record<string, Map<string, {
        cell_id: string;
        cell_name: string;
        cell_color: string | null;
        sequence: number;
        operation_count: number;
        completed_operations: number;
      }>> = {};

      // Initialize maps for each job
      jobIds.forEach(jobId => {
        jobRoutingsMap[jobId] = new Map();
      });

      // Process operations
      (data || []).forEach((op: {
        id: string;
        status: string;
        sequence: number;
        cell_id: string;
        cells: { id: string; name: string; color: string | null; sequence: number } | null;
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
          if (op.status === 'completed') {
            existing.completed_operations++;
          }
        } else {
          cellMap.set(cellId, {
            cell_id: cellId,
            cell_name: op.cells.name,
            cell_color: op.cells.color,
            sequence: op.cells.sequence,
            operation_count: 1,
            completed_operations: op.status === 'completed' ? 1 : 0,
          });
        }
      });

      // Convert to final format
      const result: Record<string, JobRouting> = {};
      Object.entries(jobRoutingsMap).forEach(([jobId, cellMap]) => {
        result[jobId] = Array.from(cellMap.values())
          .sort((a, b) => a.sequence - b.sequence);
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

/**
 * Hook to fetch all cells with their QRM metrics
 */
export function useAllCellsQRMMetrics(tenantId: string | null) {
  const [cellsMetrics, setCellsMetrics] = useState<
    Record<string, CellQRMMetrics>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllMetrics = useCallback(async () => {
    if (!tenantId) {
      setCellsMetrics({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get all active cells
      const { data: cells, error: cellsError } = await supabase
        .from("cells")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (cellsError) throw cellsError;

      // Fetch metrics for each cell
      const metricsPromises = (cells || []).map(async (cell) => {
        const { data } = await supabase.rpc("get_cell_qrm_metrics", {
          cell_id_param: cell.id,
          tenant_id_param: tenantId,
        });
        return { cellId: cell.id, data: data as unknown as CellQRMMetrics };
      });

      const results = await Promise.all(metricsPromises);
      const metricsMap = results.reduce(
        (acc, { cellId, data }) => {
          if (data) acc[cellId] = data;
          return acc;
        },
        {} as Record<string, CellQRMMetrics>,
      );

      setCellsMetrics(metricsMap);
    } catch (err) {
      setError(err as Error);
      logger.error("Failed to fetch all cells QRM metrics", err, {
        operation: "useAllCellsQRMMetrics",
        entityType: "cell",
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Debounced fetch with longer delay to prevent cascade from multiple operation updates
  const debouncedFetch = useDebouncedCallback(fetchAllMetrics, 300);

  useEffect(() => {
    if (!tenantId) {
      setCellsMetrics({});
      return;
    }

    fetchAllMetrics();

    // Subscribe to real-time updates on operations and cells
    // IMPORTANT: Filter by tenant_id to reduce scope significantly
    const channel = supabase
      .channel(`qrm-all-cells-${tenantId}`)
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
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cells",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          debouncedFetch();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          logger.error("Realtime subscription error", undefined, {
            operation: "useAllCellsQRMMetrics",
            channelName: `qrm-all-cells-${tenantId}`,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, fetchAllMetrics, debouncedFetch]);

  return { cellsMetrics, loading, error, refetch: fetchAllMetrics };
}
