/**
 * useJobFlows — Fetch operation flow/routing for multiple jobs.
 *
 * Returns a map of jobId → array of { cellName, cellColor, total, completed }.
 * Used by the Jobs table to render the compact flow chevrons.
 *
 * Architecture: 3 simple queries, no PostgREST FK hints, no joined-table .in().
 *   1. parts → get part_id → job_id mapping
 *   2. operations → get status + cell_id per operation
 *   3. cells → get name + color + sequence per cell
 */

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlowStep {
  cell_id: string;
  cell_name: string;
  cell_color: string | null;
  sequence: number;
  operation_count: number;
  completed_operations: number;
}

export type JobFlowMap = Record<string, FlowStep[]>;

export function useJobFlows(jobIds: string[], tenantId: string | null) {
  const enabled = jobIds.length > 0 && !!tenantId;
  const jobIdsKey = jobIds.join(",");

  // Query 1: All cells (small table, cached)
  const { data: cells } = useQuery({
    queryKey: ["cells", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("id, name, color, sequence")
        .eq("tenant_id", tenantId!)
        .eq("active", true);
      if (error) throw error;
      return data as { id: string; name: string; color: string | null; sequence: number }[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Query 2: Parts for these jobs (maps part_id → job_id)
  const { data: parts } = useQuery({
    queryKey: ["job-flows-parts", jobIdsKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("id, job_id")
        .eq("tenant_id", tenantId!)
        .in("job_id", jobIds);
      if (error) throw error;
      return data as { id: string; job_id: string }[];
    },
    enabled,
    staleTime: 30 * 1000,
  });

  const partIds = useMemo(() => parts?.map(p => p.id) ?? [], [parts]);
  const partJobMap = useMemo(
    () => Object.fromEntries((parts ?? []).map(p => [p.id, p.job_id])),
    [parts]
  );

  // Query 3: Operations for those parts (just id, status, cell_id, part_id — no joins)
  const { data: operations } = useQuery({
    queryKey: ["job-flows-ops", partIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("id, status, cell_id, part_id")
        .eq("tenant_id", tenantId!)
        .in("part_id", partIds);
      if (error) throw error;
      return data as { id: string; status: string; cell_id: string; part_id: string }[];
    },
    enabled: partIds.length > 0,
    staleTime: 30 * 1000,
  });

  // Debug: log query results (console.warn to ensure visibility)
  if (typeof window !== "undefined" && enabled) {
    console.warn("[useJobFlows] pipeline:", {
      jobIds: jobIds.length,
      cells: cells?.length ?? "loading",
      parts: parts?.length ?? "loading",
      partIds: partIds.length,
      operations: operations?.length ?? "loading",
      tenantId,
    });
  }

  // Build the flow map: jobId → FlowStep[]
  const flows = useMemo<JobFlowMap>(() => {
    if (!operations || !cells || operations.length === 0) return {};

    const cellMap = Object.fromEntries(cells.map(c => [c.id, c]));
    const result: Record<string, Map<string, FlowStep>> = {};

    // Initialize for all jobs
    jobIds.forEach(jid => { result[jid] = new Map(); });

    operations.forEach(op => {
      const jobId = partJobMap[op.part_id];
      if (!jobId || !result[jobId]) return;

      const cell = cellMap[op.cell_id];
      if (!cell) return;

      const existing = result[jobId].get(op.cell_id);
      if (existing) {
        existing.operation_count++;
        if (op.status === "completed") existing.completed_operations++;
      } else {
        result[jobId].set(op.cell_id, {
          cell_id: op.cell_id,
          cell_name: cell.name,
          cell_color: cell.color,
          sequence: cell.sequence,
          operation_count: 1,
          completed_operations: op.status === "completed" ? 1 : 0,
        });
      }
    });

    const flows: JobFlowMap = {};
    let totalSteps = 0;
    Object.entries(result).forEach(([jobId, cellMap]) => {
      const steps = Array.from(cellMap.values()).sort((a, b) => a.sequence - b.sequence);
      if (steps.length > 0) {
        flows[jobId] = steps;
        totalSteps += steps.length;
      }
    });

    console.warn("[useJobFlows] built flows:", {
      jobsWithFlow: Object.keys(flows).length,
      totalSteps,
      opsProcessed: operations.length,
      opsWithCell: operations.filter(op => cellMap[op.cell_id]).length,
      opsWithJob: operations.filter(op => partJobMap[op.part_id]).length,
      sampleOp: operations[0],
      samplePartJob: operations[0] ? partJobMap[operations[0].part_id] : "none",
      sampleCell: operations[0] ? cellMap[operations[0].cell_id] : "none",
    });

    return flows;
  }, [operations, cells, partJobMap, jobIds]);

  const loading = !cells || (enabled && !operations);

  return { flows, loading };
}
