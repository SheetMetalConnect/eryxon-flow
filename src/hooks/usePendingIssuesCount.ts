import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QueryKeys } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

export function usePendingIssuesCount() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const tenantId = profile?.tenant_id;

  const { data: count, isLoading } = useQuery({
    queryKey: QueryKeys.issues.pendingCount(tenantId ?? ''),
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count, error } = await supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time changes
  React.useEffect(() => {
    const channel = supabase
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
          queryClient.invalidateQueries({ queryKey: QueryKeys.issues.pendingCount(profile?.tenant_id ?? '') });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, profile?.tenant_id]);

  return { count: count || 0, isLoading };
}
