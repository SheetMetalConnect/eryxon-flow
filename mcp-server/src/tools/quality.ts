import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, IDEMPOTENT_WRITE, actor, tool } from "../tool.js";
import { createTool, deleteTool, fetchTool, updateTool } from "./crud.js";
import { bucket } from "./issues.js";

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const pct = (part: number, whole: number, empty = 0) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : empty);

type QuantityRow = {
  quantity_scrap: number | null; quantity_good: number | null; quantity_produced: number | null; quantity_rework: number | null; recorded_at?: string;
  scrap_reasons?: { id: string; code: string; description: string } | null;
  operations?: { operation_name: string | null; cells?: { name: string } | null; parts?: { material: string | null } | null } | null;
};

export const qualityTools = [
  fetchTool({
    name: "fetch_operation_quantities", table: "operation_quantities", title: "Fetch production reports",
    description: "Reported good/scrap/rework quantities per operation.",
    select: "*, scrap_reasons(code, description), operations(operation_name, parts(part_number, jobs(job_number)))",
    filters: { operation_id: s.id.optional() }, orderBy: { column: "recorded_at" }, softDelete: false,
  }),
  tool({
    name: "report_production",
    title: "Report production",
    description: "Record output on an operation the way the terminal does: good, scrap and rework quantities with optional scrap reasons and material traceability.",
    input: {
      operation_id: s.id,
      quantity_good: z.number().int().min(0).default(0),
      quantity_scrap: z.number().int().min(0).default(0),
      quantity_rework: z.number().int().min(0).default(0),
      scrap_reasons: z.array(z.object({ scrap_reason_id: s.id, quantity: z.number().int().min(1), notes: z.string().optional() })).default([]),
      notes: z.string().optional(),
      material_lot: z.string().optional(), material_supplier: z.string().optional(), material_cert_number: z.string().optional(),
      recorded_by: s.id.optional(),
    },
    output: s.ROW,
    annotations: WRITE,
    async handler({ scrap_reasons, recorded_by, ...report }, supabase) {
      if (report.quantity_good + report.quantity_scrap + report.quantity_rework === 0) throw new Error("Report at least one quantity");
      const { data, error } = await supabase.from("operation_quantities").insert({
        ...report, quantity_produced: report.quantity_good + report.quantity_scrap + report.quantity_rework,
        scrap_reason_id: scrap_reasons[0]?.scrap_reason_id ?? null, recorded_by: recorded_by ?? process.env.MCP_ACTOR_ID ?? null, recorded_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      if (scrap_reasons.length > 0) {
        const { error: reasonError } = await supabase.from("operation_quantity_scrap_reasons")
          .insert(scrap_reasons.map((r) => ({ ...r, operation_quantity_id: data.id })));
        if (reasonError) throw reasonError;
      }
      return data as Record<string, unknown>;
    },
  }),
  deleteTool({ table: "operation_quantities", name: "delete_production_report", title: "Delete production report", description: "Remove a quantity report.", softDelete: false }),
  fetchTool({
    table: "scrap_reasons", title: "Fetch scrap reasons", description: "Configured scrap reason codes.",
    filters: { active: z.boolean().default(true), category: z.string().optional() }, orderBy: { column: "code", ascending: true }, softDelete: false,
  }),
  createTool({ table: "scrap_reasons", name: "create_scrap_reason", title: "Create scrap reason", description: "Add a scrap reason code.",
    fields: { code: z.string().min(1), description: z.string().min(1), category: z.string().default("general"), active: z.boolean().default(true) } }),
  updateTool({ table: "scrap_reasons", name: "update_scrap_reason", title: "Update scrap reason", description: "Edit or deactivate a scrap reason.",
    fields: { code: z.string().optional(), description: z.string().optional(), category: z.string().optional(), active: z.boolean().optional() } }),
  tool({
    name: "seed_default_scrap_reasons", title: "Seed default scrap reasons", description: "Insert the standard scrap reason set for the workshop (seed_default_scrap_reasons).",
    input: { tenant_id: s.id }, output: { inserted_count: z.number() }, annotations: IDEMPOTENT_WRITE,
    async handler({ tenant_id }, supabase) {
      const { data, error } = await supabase.rpc("seed_default_scrap_reasons", { p_tenant_id: tenant_id });
      if (error) throw error;
      return { inserted_count: Number(data?.[0]?.inserted_count ?? 0) };
    },
  }),
  tool({
    name: "get_scrap_analytics", title: "Scrap analytics", description: "Scrap totals over a period grouped by reason, cell, operation or material.",
    input: { days: s.days, group_by: z.enum(["reason", "cell", "operation", "material"]).default("reason") },
    output: { total_records: z.number(), data: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler({ days, group_by }, supabase) {
      const { data, error } = await supabase.from("operation_quantities")
        .select("quantity_scrap, scrap_reasons(id, code, description), operations(operation_name, cells(name), parts(material))")
        .gte("recorded_at", since(days)).gt("quantity_scrap", 0);
      if (error) throw error;
      const groups: Record<string, { total_scrap: number; occurrence_count: number }> = {};
      for (const q of data as unknown as QuantityRow[]) {
        const key = {
          reason: q.scrap_reasons?.description ?? q.scrap_reasons?.code ?? "Unspecified",
          cell: q.operations?.cells?.name ?? "Unknown cell",
          operation: q.operations?.operation_name ?? "Unknown operation",
          material: q.operations?.parts?.material ?? "Unknown material",
        }[group_by];
        const entry = (groups[key] ??= { total_scrap: 0, occurrence_count: 0 });
        entry.total_scrap += q.quantity_scrap ?? 0;
        entry.occurrence_count++;
      }
      return { group_by, period_days: days, total_records: data.length, data: Object.entries(groups).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total_scrap - a.total_scrap) };
    },
  }),
  tool({
    name: "get_scrap_trends", title: "Scrap trends", description: "Scrap, good and produced quantities per day or week.",
    input: { days: s.days, interval: z.enum(["daily", "weekly"]).default("daily") },
    output: { data: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler({ days, interval }, supabase) {
      const { data, error } = await supabase.from("operation_quantities").select("quantity_scrap, quantity_good, quantity_produced, recorded_at").gte("recorded_at", since(days)).order("recorded_at");
      if (error) throw error;
      const buckets: Record<string, { scrap: number; good: number; produced: number }> = {};
      for (const q of data) {
        const entry = (buckets[bucket(q.recorded_at, interval)] ??= { scrap: 0, good: 0, produced: 0 });
        entry.scrap += q.quantity_scrap ?? 0; entry.good += q.quantity_good ?? 0; entry.produced += q.quantity_produced ?? 0;
      }
      return { interval, period_days: days, data: Object.entries(buckets).map(([date, v]) => ({ date, ...v, scrap_rate: pct(v.scrap, v.produced) })) };
    },
  }),
  tool({
    name: "get_yield_metrics", title: "Yield metrics", description: "First-pass yield, scrap rate and rework rate overall and per cell.",
    input: { days: s.days, cell_id: s.id.optional() },
    output: { overall: z.record(z.string(), z.number()), by_cell: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler({ days, cell_id }, supabase) {
      let query = supabase.from("operation_quantities").select("quantity_scrap, quantity_good, quantity_produced, quantity_rework, operations!inner(cell_id, cells(name))").gte("recorded_at", since(days));
      if (cell_id) query = query.eq("operations.cell_id", cell_id);
      const { data, error } = await query;
      if (error) throw error;
      const overall = { produced: 0, good: 0, scrap: 0, rework: 0 };
      const cells: Record<string, typeof overall> = {};
      for (const q of data as unknown as QuantityRow[]) {
        const cell = (cells[q.operations?.cells?.name ?? "Unknown"] ??= { produced: 0, good: 0, scrap: 0, rework: 0 });
        for (const target of [overall, cell]) {
          target.produced += q.quantity_produced ?? 0; target.good += q.quantity_good ?? 0; target.scrap += q.quantity_scrap ?? 0; target.rework += q.quantity_rework ?? 0;
        }
      }
      const rates = (v: typeof overall) => ({ ...v, first_pass_yield: pct(v.good, v.produced, 100), scrap_rate: pct(v.scrap, v.produced), rework_rate: pct(v.rework, v.produced) });
      return { period_days: days, overall: rates(overall), by_cell: Object.entries(cells).map(([cell, v]) => ({ cell, ...rates(v) })).sort((a, b) => a.first_pass_yield - b.first_pass_yield) };
    },
  }),
  tool({
    name: "get_scrap_pareto", title: "Scrap Pareto", description: "Top scrap reasons with share and cumulative share of total scrap.",
    input: { days: s.days, top_n: z.number().int().min(1).max(50).default(10) },
    output: { total_scrap: z.number(), data: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler({ days, top_n }, supabase) {
      const { data, error } = await supabase.from("operation_quantities").select("quantity_scrap, scrap_reasons(id, code, description)").gte("recorded_at", since(days)).gt("quantity_scrap", 0);
      if (error) throw error;
      const reasons: Record<string, { code: string; description: string; quantity: number }> = {};
      let total = 0;
      for (const q of data as unknown as QuantityRow[]) {
        const entry = (reasons[q.scrap_reasons?.id ?? "unspecified"] ??= { code: q.scrap_reasons?.code ?? "UNSPEC", description: q.scrap_reasons?.description ?? "Unspecified", quantity: 0 });
        entry.quantity += q.quantity_scrap ?? 0; total += q.quantity_scrap ?? 0;
      }
      let cumulative = 0;
      const rows = Object.values(reasons).sort((a, b) => b.quantity - a.quantity).slice(0, top_n).map((r) => {
        cumulative += r.quantity;
        return { ...r, percentage: pct(r.quantity, total), cumulative_percentage: pct(cumulative, total) };
      });
      return { period_days: days, total_scrap: total, data: rows };
    },
  }),
  tool({
    name: "get_quality_score", title: "Quality score", description: "A 0-100 quality score from yield (50%), weighted issues (30%) and issue resolution speed (20%).",
    input: { days: s.days }, output: { overall_score: z.number(), rating: z.string() }, annotations: READ,
    async handler({ days }, supabase) {
      const [quantities, issues] = await Promise.all([
        supabase.from("operation_quantities").select("quantity_good, quantity_produced").gte("recorded_at", since(days)),
        supabase.from("issues").select("severity, status, created_at, updated_at").gte("created_at", since(days)),
      ]);
      if (quantities.error) throw quantities.error;
      if (issues.error) throw issues.error;
      let produced = 0, good = 0, impact = 0, resolved = 0, resolutionDays = 0;
      for (const q of quantities.data) { produced += q.quantity_produced ?? 0; good += q.quantity_good ?? 0; }
      const weight: Record<string, number> = { critical: 10, high: 5, medium: 2, low: 1 };
      for (const issue of issues.data) {
        impact += weight[issue.severity ?? ""] ?? 0;
        if (issue.status === "approved" || issue.status === "closed") { resolved++; resolutionDays += (Date.parse(issue.updated_at) - Date.parse(issue.created_at)) / 86_400_000; }
      }
      const yieldScore = produced > 0 ? (good / produced) * 100 : 100;
      const issueScore = Math.max(0, 100 - impact);
      const avgResolution = resolved ? resolutionDays / resolved : 0;
      const resolutionScore = Math.max(0, Math.min(100, 100 - (avgResolution - 3) * 14.3));
      const overall = Math.round(yieldScore * 0.5 + issueScore * 0.3 + resolutionScore * 0.2);
      return {
        period_days: days, overall_score: overall, rating: overall >= 80 ? "good" : overall >= 60 ? "moderate" : "needs_attention",
        breakdown: { yield_score: Math.round(yieldScore), issue_score: Math.round(issueScore), resolution_score: Math.round(resolutionScore) },
        metrics: { first_pass_yield: Math.round(yieldScore * 10) / 10, total_issues: issues.data.length, critical_issues: issues.data.filter((i) => i.severity === "critical").length, avg_resolution_days: Math.round(avgResolution * 10) / 10 },
      };
    },
  }),
];
