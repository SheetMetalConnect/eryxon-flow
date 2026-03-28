/**
 * TerminalCellInfo — Standalone POLCA cell signal for terminal rows.
 *
 * Shows the next cell in routing with a GO/PAUSE capacity signal.
 * For "expected" rows, shows current cell (where the job is now).
 * Uses own useQuery to avoid stale closures in table rows (FlowCell pattern).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Play, Pause, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalCellInfoProps {
  operationId: string;
  partId: string;
  currentCellId: string;
  currentCellName: string;
  currentCellColor: string;
  currentSequence?: number;
  /** "expected" shows current cell (upstream), others show next cell */
  variant: "process" | "buffer" | "expected";
}

interface NextCellData {
  cellId: string;
  cellName: string;
  cellColor: string | null;
  wipLimit: number | null;
  currentWip: number;
  freeSlots: number | null; // null = no limit
  isLast: boolean;
}

export function TerminalCellInfo({
  operationId,
  partId,
  currentCellId,
  currentCellName,
  currentCellColor,
  currentSequence,
  variant,
}: TerminalCellInfoProps) {
  const profile = useProfile();
  const tenantId = profile?.tenant_id;

  const { data: nextCell, isLoading } = useQuery({
    queryKey: ["terminal-cell-info", operationId, partId, tenantId],
    queryFn: async (): Promise<NextCellData | null> => {
      if (!tenantId) return null;

      // Get all operations for this part, ordered by sequence
      const { data: ops, error: opsErr } = await supabase
        .from("operations")
        .select("id, sequence, cell_id, status")
        .eq("tenant_id", tenantId)
        .eq("part_id", partId)
        .order("sequence", { ascending: true });

      if (opsErr || !ops || ops.length === 0) return null;

      // Find current operation index
      const currentIdx = ops.findIndex((op: any) => op.id === operationId);
      if (currentIdx === -1) return null;

      // Find next operation with a different cell
      let nextOp = null;
      for (let i = currentIdx + 1; i < ops.length; i++) {
        if (ops[i].cell_id && ops[i].cell_id !== currentCellId) {
          nextOp = ops[i];
          break;
        }
      }

      // Last operation or no different next cell
      if (!nextOp) {
        return { cellId: "", cellName: "", cellColor: null, wipLimit: null, currentWip: 0, freeSlots: null, isLast: true };
      }

      // Fetch next cell metadata
      const { data: cell, error: cellErr } = await supabase
        .from("cells")
        .select("id, name, color, wip_limit")
        .eq("id", nextOp.cell_id)
        .single();

      if (cellErr || !cell) return null;

      // Count non-completed operations in the next cell (= current WIP)
      const { count, error: countErr } = await supabase
        .from("operations")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("cell_id", cell.id)
        .in("status", ["not_started", "in_progress"]);

      const currentWip = countErr ? 0 : (count ?? 0);
      const wipLimit = cell.wip_limit;
      const freeSlots = wipLimit != null ? wipLimit - currentWip : null;

      return {
        cellId: cell.id,
        cellName: cell.name,
        cellColor: cell.color,
        wipLimit,
        currentWip,
        freeSlots,
        isLast: false,
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

  // For "expected" variant, show where the job currently is (upstream cell)
  if (variant === "expected") {
    return (
      <div className="flex items-center gap-1.5">
        <CellDot color={currentCellColor} />
        <span className="text-xs text-foreground truncate max-w-[120px]">
          {currentCellName}
        </span>
        {nextCell && !nextCell.isLast && nextCell.freeSlots != null && (
          <PolcaSignal freeSlots={nextCell.freeSlots} />
        )}
      </div>
    );
  }

  // For process/buffer: show next cell with POLCA signal
  if (!nextCell || nextCell.isLast) {
    // Last operation — show current cell with checkmark
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
    <div className="flex items-center gap-1">
      <CellDot color={currentCellColor} />
      <span className="text-xs text-muted-foreground truncate max-w-[60px]">
        {currentCellName}
      </span>
      <span className="text-[10px] text-muted-foreground/50 mx-0.5">→</span>
      <CellDot color={nextCell.cellColor || "#666"} />
      <span className="text-xs text-foreground truncate max-w-[60px]">
        {nextCell.cellName}
      </span>
      {nextCell.freeSlots != null && (
        <PolcaSignal freeSlots={nextCell.freeSlots} />
      )}
    </div>
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

/** POLCA GO/PAUSE signal icon */
function PolcaSignal({ freeSlots }: { freeSlots: number }) {
  if (freeSlots > 0) {
    return (
      <Play
        className="h-3 w-3 shrink-0 fill-emerald-500 text-emerald-500"
        title={`${freeSlots} free`}
      />
    );
  }
  return (
    <Pause
      className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500"
      title={`${Math.abs(freeSlots)} over capacity`}
    />
  );
}
