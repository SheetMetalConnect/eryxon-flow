/**
 * Cell Metrics Hooks
 *
 * Provides QRM metrics for individual cells and all cells.
 * Includes realtime subscriptions for live updates.
 *
 * SRP: Only handles cell-level metrics
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import type { CellQRMMetrics } from "@/types/qrm";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Hook to fetch QRM metrics for a specific cell
 *
 * @param cellId - The cell ID to fetch metrics for
 * @param tenantId - The tenant ID for filtering
 * @returns Metrics data, loading state, error, and refetch function
 */
export function useCellQRMMetrics(
  cellId: string | null,
  tenantId: string | null
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
        }
      );

      if (rpcError) throw rpcError;
      setMetrics(data as unknown as CellQRMMetrics);
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

    // Subscribe to real-time updates with tenant-level filtering
    // Supabase RLS requires single-filter; we filter by tenant and check cell client-side
    const channel = supabase
      .channel(`qrm-cell-${cellId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ cell_id?: string }>) => {
          // Client-side filter: only refetch if event matches our cell
          const record = payload.new as { cell_id?: string } | undefined;
          const oldRecord = payload.old as { cell_id?: string } | undefined;
          if (record?.cell_id === cellId || oldRecord?.cell_id === cellId) {
            debouncedFetch();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cells",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ id?: string }>) => {
          // Client-side filter: only refetch if event matches our cell
          const record = payload.new as { id?: string } | undefined;
          const oldRecord = payload.old as { id?: string } | undefined;
          if (record?.id === cellId || oldRecord?.id === cellId) {
            debouncedFetch();
          }
        }
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
 * Hook to fetch all cells with their QRM metrics
 *
 * @param tenantId - The tenant ID for filtering
 * @returns Map of cell metrics by cell ID
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

      // Fetch metrics for each cell with proper error handling
      const metricsPromises = (cells || []).map(async (cell) => {
        const { data, error: rpcError } = await supabase.rpc(
          "get_cell_qrm_metrics",
          {
            cell_id_param: cell.id,
            tenant_id_param: tenantId,
          }
        );

        if (rpcError) {
          throw new Error(
            `Failed to fetch metrics for cell ${cell.id}: ${rpcError.message}`
          );
        }

        return { cellId: cell.id, data: data as unknown as CellQRMMetrics };
      });

      // Use Promise.allSettled to capture all results
      const results = await Promise.allSettled(metricsPromises);

      // Check for any failures
      const failures = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );

      if (failures.length > 0) {
        // Aggregate error messages from all failures
        const errorMessages = failures
          .map((f) => f.reason?.message || "Unknown error")
          .join("; ");
        throw new Error(`Failed to fetch cell metrics: ${errorMessages}`);
      }

      // All succeeded - extract values
      const successResults = results
        .filter(
          (r): r is PromiseFulfilledResult<{
            cellId: string;
            data: CellQRMMetrics;
          }> => r.status === "fulfilled"
        )
        .map((r) => r.value);

      const metricsMap = successResults.reduce(
        (acc, { cellId, data }) => {
          if (data) acc[cellId] = data;
          return acc;
        },
        {} as Record<string, CellQRMMetrics>
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
        }
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
        }
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
