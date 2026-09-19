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
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error("useCellQRMMetrics", "Failed to fetch cell QRM metrics", {
        error,
        entityId: cellId,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [cellId, tenantId]);

  const debouncedFetch = useDebouncedCallback(fetchMetrics, 150);

  useEffect(() => {
    if (!cellId || !tenantId) {
      setMetrics(null);
      return;
    }

    fetchMetrics();

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
          logger.error("useCellQRMMetrics", "Realtime subscription error", {
            channelName: `qrm-cell-${cellId}`,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
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
      const { data, error: rpcError } = await supabase.rpc("get_all_cell_qrm_metrics", {
        p_tenant_id: tenantId,
      });
      if (rpcError) throw rpcError;

      const metrics = Array.isArray(data) ? data as unknown as CellQRMMetrics[] : [];
      const metricsMap = Object.fromEntries(metrics.map((metric) => [metric.cell_id, metric]));

      setCellsMetrics(metricsMap);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error("useAllCellsQRMMetrics", "Failed to fetch all cells QRM metrics", {
        error,
        tenantId,
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const debouncedFetch = useDebouncedCallback(fetchAllMetrics, 300);

  useEffect(() => {
    if (!tenantId) {
      setCellsMetrics({});
      return;
    }

    fetchAllMetrics();

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
          logger.error("useAllCellsQRMMetrics", "Realtime subscription error", {
            channelName: `qrm-all-cells-${tenantId}`,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchAllMetrics, debouncedFetch]);

  return { cellsMetrics, loading, error, refetch: fetchAllMetrics };
}
