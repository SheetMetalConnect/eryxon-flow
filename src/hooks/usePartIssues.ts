import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTableSubscription } from './useRealtimeSubscription';

interface PartIssueSummary {
  totalCount: number;
  pendingCount: number;
  highestSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
}

export function usePartIssues(partId: string | undefined) {
  const [summary, setSummary] = useState<PartIssueSummary>({
    totalCount: 0,
    pendingCount: 0,
    highestSeverity: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchIssueSummary = useCallback(async () => {
    if (!partId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_part_issue_summary', {
        part_id_param: partId,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setSummary({
          totalCount: Number(result.total_count) || 0,
          pendingCount: Number(result.pending_count) || 0,
          highestSeverity: result.highest_severity || null,
        });
      } else {
        setSummary({
          totalCount: 0,
          pendingCount: 0,
          highestSeverity: null,
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching part issue summary:', error);
      setSummary({
        totalCount: 0,
        pendingCount: 0,
        highestSeverity: null,
      });
    } finally {
      setLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    if (!partId) {
      setLoading(false);
      return;
    }

    fetchIssueSummary();
  }, [partId, fetchIssueSummary]);

  // Subscribe to changes in issues using the reusable realtime hook
  // Note: Can't filter by part_id directly since issues link through operations
  useTableSubscription(
    'issues',
    fetchIssueSummary,
    { filter: 'status=eq.pending', enabled: !!partId, debounceMs: 200 }
  );

  return { ...summary, loading };
}
