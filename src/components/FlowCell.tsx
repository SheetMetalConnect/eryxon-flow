import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompactOperationsFlow } from '@/components/qrm/OperationsFlowVisualization';
import { useProfile } from '@/hooks/useProfile';
import { fetchAllPages } from '@/lib/db/pagination';
import { groupRoutingSteps } from '@/lib/routingSummary';

export function FlowCell({ jobId }: { jobId: string }) {
  const tenantId = useProfile()?.tenant_id;
  const { data: routing = [], isLoading } = useQuery({
    queryKey: ['job-flow', jobId, tenantId],
    queryFn: async () => {
      const query = supabase.from('operations')
        .select('id, status, cell_id, part:parts!inner(job_id), cell:cells(id, name, color, sequence)')
        .eq('tenant_id', tenantId).eq('part.job_id', jobId).order('id');
      return groupRoutingSteps(await fetchAllPages((from, to) => query.range(from, to)));
    },
    enabled: !!tenantId && !!jobId,
    staleTime: 60_000,
  });
  return <div className="min-w-[100px]"><CompactOperationsFlow routing={routing} loading={isLoading} /></div>;
}
