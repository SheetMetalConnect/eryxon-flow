import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/lib/logger';
import {
  selectOverScheduledHours,
  type AttentionOperation,
} from '@/lib/admin/dashboardAttention';

const ACTIVE_OPS_CAP = 200;

export interface DashboardAttention {
  rushCount: number;
  onHoldCount: number;
  overHoursOps: AttentionOperation[];
  isLoading: boolean;
}

/**
 * Derived, read-only "needs attention" signals for the dashboard — no user input.
 * Rush + on-hold are exact head-counts; over-scheduled-hours is computed from the
 * bounded set of in-progress operations (column comparison can't be a head-count),
 * which is what needs attention now and keeps the query scalable.
 */
export function useDashboardAttention(): DashboardAttention {
  const profile = useProfile();
  const tenantId = profile?.tenant_id;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'attention', tenantId ?? ''],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return { rushCount: 0, onHoldCount: 0, overHoursOps: [] };

      const [onHold, rush, activeOps] = await Promise.all([
        supabase
          .from('operations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'on_hold')
          .is('deleted_at', null),
        supabase
          .from('parts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('is_bullet_card', true),
        supabase
          .from('operations')
          .select(
            'id, operation_name, status, estimated_time, actual_time, part:parts!inner(part_number, job:jobs!inner(job_number))',
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'in_progress')
          .is('deleted_at', null)
          .not('actual_time', 'is', null)
          .limit(ACTIVE_OPS_CAP),
      ]);

      if (onHold.error) throw onHold.error;
      if (rush.error) throw rush.error;
      if (activeOps.error) throw activeOps.error;

      return {
        rushCount: rush.count ?? 0,
        onHoldCount: onHold.count ?? 0,
        overHoursOps: selectOverScheduledHours(
          (activeOps.data ?? []) as unknown as AttentionOperation[],
        ),
      };
    },
  });

  if (!data && !isLoading) {
    logger.debug?.('useDashboardAttention', 'no attention data');
  }

  return {
    rushCount: data?.rushCount ?? 0,
    onHoldCount: data?.onHoldCount ?? 0,
    overHoursOps: data?.overHoursOps ?? [],
    isLoading,
  };
}
