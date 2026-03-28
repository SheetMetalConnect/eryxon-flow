/**
 * TerminalCellInfo — Standalone POLCA cell signal for terminal rows.
 *
 * Shows the next cell in routing with a GO/PAUSE capacity signal.
 * For "expected" rows, shows where the part actually IS now (upstream cell).
 * Uses own useQuery to avoid stale closures in table rows (FlowCell pattern).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Play, Pause, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TerminalCellInfoProps {
  operationId: string;
  partId: string;
  currentCellId: string;
  currentCellName: string;
  currentCellColor: string;
  currentSequence?: number;
  /** "expected" shows where part IS now, others show next cell */
  variant: "process" | "buffer" | "expected";
}

interface CellRouteData {
  /** Where the part actually is right now */
  activeCellId: string;
  activeCellName: string;
  activeCellColor: string;
  /** Next cell in the routing (after this operation) */
  nextCellId: string | null;
  nextCellName: string | null;
  nextCellColor: string | null;
  nextWipLimit: number | null;
  nextCurrentWip: number;
  nextFreeSlots: number | null;
  /** True if this operation is the last step */
  isLastStep: boolean;
}

export function TerminalCellInfo({
  operationId,
  partId,
  currentCellId,
  currentCellName,
  currentCellColor,
  variant,
}: TerminalCellInfoProps) {
  const profile = useProfile();
  const tenantId = profile?.tenant_id;

  const { data, isLoading } = useQuery({
    queryKey: ["terminal-cell-info", operationId, partId, tenantId],
    queryFn: async (): Promise<CellRouteData | null> => {
      if (!tenantId) return null;

      // Get all operations for this part with their cells, ordered by sequence
      const { data: ops, error: opsErr } = await supabase
        .from("operations")
        .select("id, sequence, cell_id, status")
        .eq("tenant_id", tenantId)
        .eq("part_id", partId)
        .order("sequence", { ascending: true });

      if (opsErr || !ops || ops.length === 0) return null;

      // Collect all unique cell IDs we need
      const cellIds = [...new Set(ops.map((op: any) => op.cell_id).filter(Boolean))];
      if (cellIds.length === 0) return null;

      // Fetch all cells in one query
      const { data: cells, error: cellsErr } = await supabase
        .from("cells")
        .select("id, name, color, wip_limit")
        .in("id", cellIds);

      if (cellsErr || !cells) return null;
      const cellMap = Object.fromEntries(cells.map((c: any) => [c.id, c]));

      // Find where the part actually IS — first non-completed operation's cell
      const activeOp = ops.find((op: any) => op.status !== "completed");
      const activeCell = activeOp ? cellMap[activeOp.cell_id] : null;

      // Find current operation index
      const currentIdx = ops.findIndex((op: any) => op.id === operationId);
      if (currentIdx === -1) return null;

      // Find next operation with a different cell (after this operation)
      let nextOp = null;
      for (let i = currentIdx + 1; i < ops.length; i++) {
        if (ops[i].cell_id && ops[i].cell_id !== currentCellId) {
          nextOp = ops[i];
          break;
        }
      }

      const isLastStep = !nextOp;
      let nextCellData = null;

      if (nextOp) {
        nextCellData = cellMap[nextOp.cell_id] || null;
      }

      // Count WIP for next cell if it exists and has a limit
      let nextCurrentWip = 0;
      let nextFreeSlots: number | null = null;
      if (nextCellData?.wip_limit != null) {
        const { count, error: countErr } = await supabase
          .from("operations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("cell_id", nextCellData.id)
          .in("status", ["not_started", "in_progress"]);

        nextCurrentWip = countErr ? 0 : (count ?? 0);
        nextFreeSlots = nextCellData.wip_limit - nextCurrentWip;
      }

      return {
        activeCellId: activeCell?.id || currentCellId,
        activeCellName: activeCell?.name || currentCellName,
        activeCellColor: activeCell?.color || currentCellColor,
        nextCellId: nextCellData?.id || null,
        nextCellName: nextCellData?.name || null,
        nextCellColor: nextCellData?.color || null,
        nextWipLimit: nextCellData?.wip_limit ?? null,
        nextCurrentWip,
        nextFreeSlots,
        isLastStep,
      };
    },
    enabled: !!tenantId && !!operationId && !!partId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse" />
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    // Fallback: just show the operation's own cell
    return (
      <div className="flex items-center gap-1.5">
        <CellDot color={currentCellColor} />
        <span className="text-xs text-foreground truncate max-w-[120px]">
          {currentCellName}
        </span>
      </div>
    );
  }

  // For "expected": show where the part actually IS now (upstream)
  if (variant === "expected") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          <CellDot color={data.activeCellColor} />
          <span className="text-xs text-foreground truncate max-w-[120px]">
            {data.activeCellName}
          </span>
          {data.nextFreeSlots != null && (
            <PolcaSignal
              freeSlots={data.nextFreeSlots}
              nextCellName={data.nextCellName}
              currentWip={data.nextCurrentWip}
              wipLimit={data.nextWipLimit}
            />
          )}
        </div>
      </TooltipProvider>
    );
  }

  // For process/buffer: show current → next cell with POLCA signal
  if (data.isLastStep) {
    return (
      <div className="flex items-center gap-1.5">
        <CellDot color={currentCellColor} />
        <span className="text-xs text-foreground truncate max-w-[80px]">
          {currentCellName}
        </span>
        <CheckCircle2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <CellDot color={currentCellColor} />
        <span className="text-xs text-muted-foreground truncate max-w-[60px]">
          {currentCellName}
        </span>
        <span className="text-[10px] text-muted-foreground/50 mx-0.5">→</span>
        <CellDot color={data.nextCellColor || "#666"} />
        <span className="text-xs text-foreground truncate max-w-[60px]">
          {data.nextCellName}
        </span>
        {data.nextFreeSlots != null && (
          <PolcaSignal
            freeSlots={data.nextFreeSlots}
            nextCellName={data.nextCellName}
            currentWip={data.nextCurrentWip}
            wipLimit={data.nextWipLimit}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

/** Colored circle representing a cell */
function CellDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0 border border-white/20"
      style={{ backgroundColor: color }}
    />
  );
}

/** POLCA GO/PAUSE signal icon with capacity tooltip */
function PolcaSignal({
  freeSlots,
  nextCellName,
  currentWip,
  wipLimit,
}: {
  freeSlots: number;
  nextCellName: string | null;
  currentWip: number;
  wipLimit: number | null;
}) {
  const icon =
    freeSlots > 0 ? (
      <Play className="h-3 w-3 shrink-0 fill-emerald-500 text-emerald-500" />
    ) : (
      <Pause className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">{icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-0.5">
          <div className="font-medium">{nextCellName}</div>
          <div className="text-muted-foreground">
            {currentWip}/{wipLimit} active
            {freeSlots > 0
              ? ` · ${freeSlots} free`
              : ` · ${Math.abs(freeSlots)} over`}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
