import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePendingIssuesCount() {
  const queryClient = useQueryClient();

  const { data: count, isLoading } = useQuery({
    queryKey: ['pending-issues-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time changes
  React.useEffect(() => {
    const subscription = supabase
      .channel('pending-issues-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: 'status=eq.pending',
        },
        () => {
          // Refetch when there are changes to pending issues
          queryClient.invalidateQueries({ queryKey: ['pending-issues-count'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return { count: count || 0, isLoading };
}
