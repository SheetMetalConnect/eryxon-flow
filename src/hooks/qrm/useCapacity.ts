/**
 * Capacity Hooks
 *
 * Provides capacity checking for cells.
 * Used for QRM flow visualization and capacity planning.
 *
 * SRP: Only handles capacity-related functionality
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import type { NextCellCapacity } from "@/types/qrm";

/**
 * Hook to check next cell capacity
 *
 * @param currentCellId - The current cell ID
 * @param tenantId - The tenant ID for filtering
 * @returns Capacity data, loading state, error, and refetch function
 */
export function useNextCellCapacity(
  currentCellId: string | null,
  tenantId: string | null
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
        }
      );

      if (rpcError) throw rpcError;
      setCapacity(data as unknown as NextCellCapacity);
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
        }
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
