import { z } from "zod";
import * as s from "../schemas.js";
import { READ, tool } from "../tool.js";

const byStatus = (rows: { status: string | null }[]) => {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status ?? "unknown"] = (counts[row.status ?? "unknown"] ?? 0) + 1;
  return { total: rows.length, by_status: counts };
};

export const dashboardTools = [
  tool({
    name: "get_dashboard_stats",
    title: "Dashboard stats",
    description: "Counts of jobs, parts, operations and issues by status.",
    input: {},
    output: { jobs: z.record(z.string(), z.unknown()), parts: z.record(z.string(), z.unknown()), operations: z.record(z.string(), z.unknown()), issues: z.record(z.string(), z.unknown()) },
    annotations: READ,
    async handler(_args, supabase) {
      const [jobs, parts, operations, issues] = await Promise.all([
        supabase.from("jobs").select("status").is("deleted_at", null),
        supabase.from("parts").select("status").is("deleted_at", null),
        supabase.from("operations").select("status").is("deleted_at", null),
        supabase.from("issues").select("status"),
      ]);
      for (const result of [jobs, parts, operations, issues]) if (result.error) throw result.error;
      return { jobs: byStatus(jobs.data!), parts: byStatus(parts.data!), operations: byStatus(operations.data!), issues: byStatus(issues.data!) };
    },
  }),
  tool({
    name: "get_cell_capacity",
    title: "Cell capacity",
    description: "WIP against limits per cell: running and queued operations, queued hours and capacity warnings.",
    input: { cell_id: s.id.optional(), cell_name: z.string().optional() },
    output: { summary: z.record(z.string(), z.number()), cells: z.array(z.record(z.string(), z.unknown())) },
    annotations: READ,
    async handler({ cell_id, cell_name }, supabase) {
      let query = supabase.from("cells").select("*").eq("active", true).is("deleted_at", null).order("sequence");
      if (cell_id) query = query.eq("id", cell_id);
      if (cell_name) query = query.ilike("name", `%${cell_name}%`);
      const { data: cells, error } = await query;
      if (error) throw error;
      const { data: operations, error: opsError } = await supabase.from("operations")
        .select("cell_id, status, estimated_time").in("cell_id", cells.map((c) => c.id))
        .in("status", ["not_started", "in_progress"]).is("deleted_at", null);
      if (opsError) throw opsError;
      const rows = cells.map((cell) => {
        const ops = operations.filter((op) => op.cell_id === cell.id);
        const wip = ops.length;
        return {
          id: cell.id, name: cell.name, color: cell.color,
          wip_limit: cell.wip_limit, wip_current: wip,
          wip_available: cell.wip_limit ? Math.max(0, cell.wip_limit - wip) : null,
          at_capacity: Boolean(cell.wip_limit) && wip >= cell.wip_limit,
          near_capacity: Boolean(cell.wip_warning_threshold) && wip >= cell.wip_warning_threshold,
          in_progress: ops.filter((op) => op.status === "in_progress").length,
          queued: ops.filter((op) => op.status === "not_started").length,
          queued_minutes: ops.reduce((sum, op) => sum + (op.estimated_time ?? 0), 0),
        };
      });
      return {
        summary: { total_cells: rows.length, at_capacity: rows.filter((r) => r.at_capacity).length, total_wip: operations.length },
        cells: rows,
      };
    },
  }),
  tool({
    name: "get_production_metrics",
    title: "Production metrics",
    description: "Completed jobs and operations plus good/scrap quantities and yield for a period (default last 30 days).",
    input: { start_date: s.datetime.optional(), end_date: s.datetime.optional() },
    output: { jobs_completed: z.number(), operations_completed: z.number(), quality: z.record(z.string(), z.number()) },
    annotations: READ,
    async handler({ start_date, end_date }, supabase) {
      const end = end_date ?? new Date().toISOString();
      const start = start_date ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [jobs, operations, quantities] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "completed").gte("updated_at", start).lte("updated_at", end).is("deleted_at", null),
        supabase.from("operations").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", start).lte("completed_at", end),
        supabase.from("operation_quantities").select("quantity_good, quantity_scrap").gte("recorded_at", start).lte("recorded_at", end),
      ]);
      for (const result of [jobs, operations, quantities]) if (result.error) throw result.error;
      let good = 0;
      let scrap = 0;
      for (const q of quantities.data!) {
        good += q.quantity_good ?? 0;
        scrap += q.quantity_scrap ?? 0;
      }
      return {
        period: { start, end },
        jobs_completed: jobs.count ?? 0,
        operations_completed: operations.count ?? 0,
        quality: { good_quantity: good, scrap_quantity: scrap, yield_rate_percent: good + scrap > 0 ? Math.round((good / (good + scrap)) * 10000) / 100 : 100 },
      };
    },
  }),
];
