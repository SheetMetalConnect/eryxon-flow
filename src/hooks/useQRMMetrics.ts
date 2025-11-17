import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CellQRMMetrics, NextCellCapacity, PartRouting, JobRouting } from '@/types/qrm';

/**
 * Hook to fetch QRM metrics for a specific cell
 */
export function useCellQRMMetrics(cellId: string | null, tenantId: string | null) {
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
        const { data, error: rpcError } = await supabase.rpc('get_cell_qrm_metrics', {
          cell_id_param: cellId,
          tenant_id_param: tenantId,
        });

        if (rpcError) throw rpcError;
        setMetrics(data as any);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching cell QRM metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`qrm-cell-${cellId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operations',
          filter: `cell_id=eq.${cellId}`,
        },
        () => {
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cells',
          filter: `id=eq.${cellId}`,
        },
        () => {
          fetchMetrics();
        }
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
export function useNextCellCapacity(currentCellId: string | null, tenantId: string | null) {
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
        const { data, error: rpcError } = await supabase.rpc('check_next_cell_capacity', {
          current_cell_id: currentCellId,
          tenant_id_param: tenantId,
        });

        if (rpcError) throw rpcError;
        setCapacity(data as any);
      } catch (err) {
        setError(err as Error);
        console.error('Error checking next cell capacity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCapacity();

    // Subscribe to real-time updates on operations that could affect next cell
    const channel = supabase
      .channel(`next-cell-capacity-${currentCellId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operations',
        },
        () => {
          fetchCapacity();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentCellId, tenantId]);

  return { capacity, loading, error };
}

/**
 * Hook to fetch part routing (commented out until SQL function is implemented)
 */
export function usePartRouting(partId: string | null) {
  const [routing] = useState<PartRouting>([]);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  // TODO: Implement when get_part_routing SQL function is created
  // useEffect(() => {
  //   if (!partId) return;
  //   // Implementation here
  // }, [partId]);

  return { routing, loading, error };
}

/**
 * Hook to fetch job routing (commented out until SQL function is implemented)
 */
export function useJobRouting(jobId: string | null) {
  const [routing] = useState<JobRouting>([]);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  // TODO: Implement when get_job_routing SQL function is created
  // useEffect(() => {
  //   if (!jobId) return;
  //   // Implementation here
  // }, [jobId]);

  return { routing, loading, error };
}

/**
 * Hook to fetch all cells with their QRM metrics
 */
export function useAllCellsQRMMetrics(tenantId: string | null) {
  const [cellsMetrics, setCellsMetrics] = useState<Record<string, CellQRMMetrics>>({});
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
          .from('cells')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('active', true);

        if (cellsError) throw cellsError;

        // Fetch metrics for each cell
        const metricsPromises = (cells || []).map(async (cell) => {
          const { data } = await supabase.rpc('get_cell_qrm_metrics', {
            cell_id_param: cell.id,
            tenant_id_param: tenantId,
          });
          return { cellId: cell.id, data: data as CellQRMMetrics };
        });

        const results = await Promise.all(metricsPromises);
        const metricsMap = results.reduce((acc, { cellId, data }) => {
          if (data) acc[cellId] = data;
          return acc;
        }, {} as Record<string, CellQRMMetrics>);

        setCellsMetrics(metricsMap);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching all cells QRM metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMetrics();

    // Subscribe to real-time updates on operations and cells
    const channel = supabase
      .channel('qrm-all-cells')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operations',
        },
        () => {
          fetchAllMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cells',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchAllMetrics();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId]);

  return { cellsMetrics, loading, error };
}
