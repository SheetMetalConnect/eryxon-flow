/**
 * PartFlowCell — Standalone cell component for the Parts table route column.
 * Shows the operation sequence: Laser → Kantbank → Lassen etc.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompactOperationsFlow } from "@/components/qrm/OperationsFlowVisualization";
import { useProfile } from "@/hooks/useProfile";
import type { RoutingStep } from "@/types/qrm";

export function PartFlowCell({ partId }: { partId: string }) {
  const profile = useProfile();
  const tenantId = profile?.tenant_id;

  const { data: routing = [], isLoading } = useQuery({
    queryKey: ["part-flow", partId, tenantId],
    queryFn: async (): Promise<RoutingStep[]> => {
      if (!tenantId) return [];

      const { data: ops, error: opsErr } = await supabase
        .from("operations")
        .select("id, status, cell_id")
        .eq("tenant_id", tenantId)
        .eq("part_id", partId)
        .order("sequence", { ascending: true });

      if (opsErr || !ops || ops.length === 0) return [];

      const cellIds = [...new Set(ops.map((op: any) => op.cell_id).filter(Boolean))];
      if (cellIds.length === 0) return [];

      const { data: cells, error: cellsErr } = await supabase
        .from("cells")
        .select("id, name, color, sequence")
        .in("id", cellIds);

      if (cellsErr || !cells) return [];

      const cellMap = Object.fromEntries(cells.map((c: any) => [c.id, c]));

      // Build routing steps in operation sequence order (not cell sequence)
      const steps: RoutingStep[] = [];
      const seen = new Map<string, RoutingStep>();

      ops.forEach((op: any) => {
        const cell = cellMap[op.cell_id];
        if (!cell) return;
        const existing = seen.get(op.cell_id);
        if (existing) {
          existing.operation_count++;
          if (op.status === "completed") existing.completed_operations++;
        } else {
          const step: RoutingStep = {
            cell_id: op.cell_id,
            cell_name: cell.name,
            cell_color: cell.color,
            sequence: cell.sequence,
            operation_count: 1,
            completed_operations: op.status === "completed" ? 1 : 0,
          };
          seen.set(op.cell_id, step);
          steps.push(step);
        }
      });

      return steps;
    },
    enabled: !!tenantId && !!partId,
    staleTime: 60 * 1000,
  });

  return (
    <div className="min-w-[80px]">
      <CompactOperationsFlow routing={routing} loading={isLoading} />
    </div>
  );
}
