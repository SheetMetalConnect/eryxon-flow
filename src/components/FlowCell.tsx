/**
 * FlowCell — Standalone cell component for the Jobs table Flow column.
 *
 * Uses useQuery directly so it has its own React lifecycle and re-renders
 * independently of TanStack Table's MemoizedRow. This avoids the stale
 * closure problem where useMemo'd column definitions capture old data.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompactOperationsFlow } from "@/components/qrm/OperationsFlowVisualization";
import { useProfile } from "@/hooks/useProfile";
import type { RoutingStep } from "@/types/qrm";

export function FlowCell({ jobId }: { jobId: string }) {
  const profile = useProfile();
  const tenantId = profile?.tenant_id;

  const { data: routing = [], isLoading } = useQuery({
    queryKey: ["job-flow", jobId, tenantId],
    queryFn: async (): Promise<RoutingStep[]> => {
      if (!tenantId) return [];

      // Step 1: Get parts for this job
      const { data: parts, error: partsErr } = await supabase
        .from("parts")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("job_id", jobId);

      if (partsErr || !parts || parts.length === 0) return [];

      const partIds = parts.map((p: { id: string }) => p.id);

      // Step 2: Get operations with cell info
      const { data: ops, error: opsErr } = await supabase
        .from("operations")
        .select("id, status, cell_id")
        .eq("tenant_id", tenantId)
        .in("part_id", partIds);

      if (opsErr || !ops || ops.length === 0) return [];

      // Step 3: Get cells
      const cellIds = [...new Set(ops.map((op: { cell_id: string }) => op.cell_id).filter(Boolean))];
      if (cellIds.length === 0) return [];

      const { data: cells, error: cellsErr } = await supabase
        .from("cells")
        .select("id, name, color, sequence")
        .in("id", cellIds);

      if (cellsErr || !cells) return [];

      const cellMap = Object.fromEntries(cells.map((c: any) => [c.id, c]));

      // Group operations by cell
      const groups = new Map<string, RoutingStep>();
      ops.forEach((op: any) => {
        const cell = cellMap[op.cell_id];
        if (!cell) return;
        const existing = groups.get(op.cell_id);
        if (existing) {
          existing.operation_count++;
          if (op.status === "completed") existing.completed_operations++;
        } else {
          groups.set(op.cell_id, {
            cell_id: op.cell_id,
            cell_name: cell.name,
            cell_color: cell.color,
            sequence: cell.sequence,
            operation_count: 1,
            completed_operations: op.status === "completed" ? 1 : 0,
          });
        }
      });

      return Array.from(groups.values()).sort((a, b) => a.sequence - b.sequence);
    },
    enabled: !!tenantId && !!jobId,
    staleTime: 60 * 1000,
  });

  return (
    <div className="min-w-[100px]">
      <CompactOperationsFlow routing={routing} loading={isLoading} />
    </div>
  );
}
