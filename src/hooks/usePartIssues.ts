import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    if (!partId) {
      setLoading(false);
      return;
    }

    const fetchIssueSummary = async () => {
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
        console.error('Error fetching part issue summary:', error);
        setSummary({
          totalCount: 0,
          pendingCount: 0,
          highestSeverity: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIssueSummary();

    // Subscribe to changes in issues
    const subscription = supabase
      .channel(`part-issues-${partId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        () => {
          fetchIssueSummary();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [partId]);

  return { ...summary, loading };
}
