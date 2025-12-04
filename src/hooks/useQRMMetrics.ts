import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    if (!cellId || !tenantId) {
      setMetrics(null);
      return;
    }

    const fetchMetrics = async () => {
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
        setMetrics(data as any);
      } catch (err) {
        setError(err as Error);
        console.error("Error fetching cell QRM metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Subscribe to real-time updates
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
          fetchMetrics();
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
          fetchMetrics();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [cellId, tenantId]);

  return { metrics, loading, error };
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

  useEffect(() => {
    if (!currentCellId || !tenantId) {
      setCapacity(null);
      return;
    }

    const fetchCapacity = async () => {
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
        setCapacity(data as any);
      } catch (err) {
        setError(err as Error);
        console.error("Error checking next cell capacity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCapacity();

    // Subscribe to real-time updates on operations that could affect next cell
    const channel = supabase
      .channel(`next-cell-capacity-${currentCellId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
        },
        () => {
          fetchCapacity();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentCellId, tenantId]);

  return { capacity, loading, error };
}

/**
 * Hook to fetch part routing
 */
export function usePartRouting(partId: string | null) {
  const [routing, setRouting] = useState<PartRouting>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!partId) {
      setRouting([]);
      return;
    }

    const fetchRouting = async () => {
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
        console.error("Error fetching part routing:", err);
      } finally {
        setLoading(false);
      }
    };

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
          fetchRouting();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [partId]);

  return { routing, loading, error };
}

/**
 * Hook to fetch job routing
 */
export function useJobRouting(jobId: string | null) {
  const [routing, setRouting] = useState<JobRouting>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) {
      setRouting([]);
      return;
    }

    const fetchRouting = async () => {
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

        (data || []).forEach((op: any) => {
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
        console.error("Error fetching job routing:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRouting();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`job-routing-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
        },
        () => {
          fetchRouting();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [jobId]);

  return { routing, loading, error };
}

/**
 * Hook to fetch routing for multiple jobs efficiently
 */
export function useMultipleJobsRouting(jobIds: string[]) {
  const [routings, setRoutings] = useState<Record<string, JobRouting>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (jobIds.length === 0) {
      setRoutings({});
      return;
    }

    const fetchRoutings = async () => {
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
        (data || []).forEach((op: any) => {
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
        console.error("Error fetching multiple jobs routing:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutings();
  }, [JSON.stringify(jobIds)]);

  return { routings, loading, error };
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

  useEffect(() => {
    if (!tenantId) {
      setCellsMetrics({});
      return;
    }

    const fetchAllMetrics = async () => {
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
        console.error("Error fetching all cells QRM metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMetrics();

    // Subscribe to real-time updates on operations and cells
    const channel = supabase
      .channel("qrm-all-cells")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
        },
        () => {
          fetchAllMetrics();
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
          fetchAllMetrics();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId]);

  return { cellsMetrics, loading, error };
}
