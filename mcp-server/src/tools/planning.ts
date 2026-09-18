import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, IDEMPOTENT_WRITE, ToolError, tool } from "../tool.js";

const daysBetween = (later: string, earlier: string | number) => Math.ceil((Date.parse(later) - (typeof earlier === "number" ? earlier : Date.parse(earlier))) / 86_400_000);

type Op = { id: string; part_id?: string; operation_name?: string; sequence?: number | null; status: string; cell_id?: string | null; estimated_time?: number | null };
const progress = (ops: Op[]) => {
  const completed = ops.filter((o) => o.status === "completed").length;
  return {
    total_operations: ops.length, completed,
    in_progress: ops.filter((o) => o.status === "in_progress").length,
    pending: ops.filter((o) => o.status === "not_started").length,
    percentage: ops.length ? Math.round((completed / ops.length) * 100) : 0,
  };
};

async function findJob(supabase: SupabaseClient, job_id?: string, job_number?: string, select = "id, job_number, customer") {
  if (!job_id && !job_number) throw new ToolError("VALIDATION_ERROR", "Specify job_id or job_number");
  const { data, error } = await supabase.from("jobs").select(select).is("deleted_at", null)
    .eq(job_id ? "id" : "job_number", job_id ?? job_number).single();
  if (error) throw error;
  return data as unknown as Record<string, unknown> & { id: string; job_number: string; customer: string | null; due_date: string | null; status: string };
}

export const planningTools = [
  tool({
    name: "prioritize_job",
    title: "Prioritize job",
    description: "Rush a job: sets the QRM bullet card on all its open parts and optionally appends a priority note.",
    input: { job_id: s.id.optional(), job_number: z.string().optional(), notes: z.string().optional() },
    output: { job_id: z.string(), parts_flagged: z.number() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ job_id, job_number, notes }, supabase) {
      const job = await findJob(supabase, job_id, job_number, "id, job_number, notes");
      if (notes) {
        const { error } = await supabase.from("jobs").update({ notes: [job.notes, `[PRIORITY] ${notes}`].filter(Boolean).join("\n") }).eq("id", job.id);
        if (error) throw error;
      }
      const { data, error } = await supabase.from("parts").update({ is_bullet_card: true })
        .eq("job_id", job.id).neq("status", "completed").is("deleted_at", null).select("id");
      if (error) throw error;
      return { job_id: job.id, job_number: job.job_number, parts_flagged: data.length };
    },
  }),
  tool({
    name: "update_parts",
    title: "Update parts in bulk",
    description: "Set the bullet-card flag or notes on all open parts of a job, or on explicit part ids.",
    input: {
      scope: z.object({ job_id: s.id.optional(), job_number: z.string().optional(), part_ids: z.array(s.id).optional() }),
      updates: z.object({ is_bullet_card: z.boolean().optional(), notes: z.string().optional() }),
      include_completed: z.boolean().default(false),
    },
    output: { updated: z.number() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ scope, updates, include_completed }, supabase) {
      let ids = scope.part_ids ?? [];
      if (ids.length === 0) {
        const job = await findJob(supabase, scope.job_id, scope.job_number, "id");
        let query = supabase.from("parts").select("id").eq("job_id", job.id).is("deleted_at", null);
        if (!include_completed) query = query.neq("status", "completed");
        const { data, error } = await query;
        if (error) throw error;
        ids = data.map((p) => p.id);
      }
      if (ids.length === 0) return { updated: 0 };
      const { data, error } = await supabase.from("parts").update(updates).in("id", ids).select("id, part_number, is_bullet_card");
      if (error) throw error;
      return { updated: data.length, parts: data };
    },
  }),
  tool({
    name: "fetch_parts_by_customer",
    title: "Parts by customer",
    description: "Open parts for a customer (case-insensitive match), grouped by job with operation progress.",
    input: { customer: z.string().min(1), include_completed: z.boolean().default(false), limit: s.limit.default(100) },
    output: { total_parts: z.number(), total_jobs: z.number(), jobs: z.array(z.record(z.string(), z.unknown())) },
    annotations: READ,
    async handler({ customer, include_completed, limit }, supabase) {
      let query = supabase.from("parts")
        .select("id, part_number, material, quantity, status, is_bullet_card, jobs!inner(id, job_number, customer, due_date, status), operations(status)")
        .ilike("jobs.customer", `%${customer}%`).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
      if (!include_completed) query = query.neq("status", "completed");
      const { data, error } = await query;
      if (error) throw error;
      const jobs = new Map<string, Record<string, unknown> & { parts: unknown[] }>();
      for (const part of data) {
        const job = part.jobs as unknown as { id: string };
        const entry = jobs.get(job.id) ?? { ...job, parts: [] };
        const ops = (part.operations ?? []) as { status: string }[];
        entry.parts.push({
          id: part.id, part_number: part.part_number, material: part.material, quantity: part.quantity, status: part.status,
          is_bullet_card: part.is_bullet_card, operations_count: ops.length, operations_completed: ops.filter((o) => o.status === "completed").length,
        });
        jobs.set(job.id, entry);
      }
      return { customer_search: customer, total_parts: data.length, total_jobs: jobs.size, jobs: [...jobs.values()] };
    },
  }),
  tool({
    name: "get_job_overview",
    title: "Job overview",
    description: "A job with its parts, operations, progress and issue counts.",
    input: { job_id: s.id.optional(), job_number: z.string().optional() },
    output: { job: z.record(z.string(), z.unknown()), progress: z.record(z.string(), z.number()), parts: z.array(z.record(z.string(), z.unknown())), issues: z.record(z.string(), z.unknown()) },
    annotations: READ,
    async handler({ job_id, job_number }, supabase) {
      const job = await findJob(supabase, job_id, job_number, "id, job_number, customer, status, due_date, notes, created_at, parts(id, part_number, material, quantity, status, is_bullet_card, current_cell_id)");
      const parts = (job.parts ?? []) as { id: string }[];
      const partIds = parts.map((p) => p.id);
      const { data: operations, error } = await supabase.from("operations")
        .select("id, part_id, operation_name, sequence, status, estimated_time, actual_time, cell_id, planned_start, planned_end")
        .in("part_id", partIds).is("deleted_at", null).order("sequence");
      if (error) throw error;
      const { data: issues, error: issueError } = await supabase.from("issues").select("severity, status").in("operation_id", operations.map((o) => o.id));
      if (issueError) throw issueError;
      const severity: Record<string, number> = {};
      for (const issue of issues) severity[issue.severity ?? "unknown"] = (severity[issue.severity ?? "unknown"] ?? 0) + 1;
      const { parts: _parts, ...jobRow } = job;
      return {
        job: jobRow,
        progress: { total_parts: parts.length, ...progress(operations) },
        parts: parts.map((part) => {
          const ops = operations.filter((o) => o.part_id === part.id);
          return { ...part, operations: ops, progress: progress(ops) };
        }),
        issues: { total: issues.length, by_severity: severity, pending: issues.filter((i) => i.status === "pending").length },
      };
    },
  }),
  tool({
    name: "check_resource_availability",
    title: "Resource availability",
    description: "Active resources (machines, tools, fixtures) with their current operation assignments.",
    input: {
      resource_type: z.string().optional(),
      location: z.string().optional(),
      status: z.enum(["available", "in_use", "maintenance", "unavailable"]).optional(),
    },
    output: { total: z.number(), available: z.number(), resources: z.array(z.record(z.string(), z.unknown())) },
    annotations: READ,
    async handler({ resource_type, location, status }, supabase) {
      let query = supabase.from("resources").select("*").eq("active", true).is("deleted_at", null).order("name");
      if (resource_type) query = query.eq("type", resource_type);
      if (location) query = query.ilike("location", `%${location}%`);
      if (status) query = query.eq("status", status);
      const { data: resources, error } = await query;
      if (error) throw error;
      const { data: usage, error: usageError } = await supabase.from("operation_resources")
        .select("resource_id, quantity, operations!inner(id, operation_name, status, parts!inner(part_number, jobs!inner(job_number, customer)))")
        .in("resource_id", resources.map((r) => r.id)).in("operations.status", ["in_progress", "not_started"]);
      if (usageError) throw usageError;
      const rows = resources.map((resource) => {
        const current_usage = usage.filter((u) => u.resource_id === resource.id).map((u) => {
          const op = u.operations as unknown as { id: string; operation_name: string; status: string; parts: { part_number: string; jobs: { job_number: string; customer: string } } };
          return { operation_id: op.id, operation_name: op.operation_name, status: op.status, quantity: u.quantity, part_number: op.parts.part_number, job_number: op.parts.jobs.job_number, customer: op.parts.jobs.customer };
        });
        return { ...resource, current_usage, is_available: resource.status === "available" && current_usage.length === 0 };
      });
      return { total: rows.length, available: rows.filter((r) => r.is_available).length, resources: rows };
    },
  }),
  tool({
    name: "assign_resource_to_operations",
    title: "Assign resource",
    description: "Assign a resource (by id or name) to explicit operations or to all open operations of a job, part or cell.",
    input: {
      resource_id: s.id.optional(),
      resource_name: z.string().optional(),
      operation_ids: z.array(s.id).optional(),
      scope: z.object({ job_id: s.id.optional(), job_number: z.string().optional(), part_id: s.id.optional(), cell_id: s.id.optional() }).optional(),
      quantity: z.number().int().min(1).default(1),
      notes: z.string().optional(),
    },
    output: { assigned: z.number() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ resource_id, resource_name, operation_ids, scope, quantity, notes }, supabase) {
      if (!resource_id && !resource_name) throw new ToolError("VALIDATION_ERROR", "Specify resource_id or resource_name");
      let resourceQuery = supabase.from("resources").select("id, name").eq("active", true).is("deleted_at", null).limit(1);
      resourceQuery = resource_id ? resourceQuery.eq("id", resource_id) : resourceQuery.ilike("name", `%${resource_name}%`);
      const { data: resource, error } = await resourceQuery.single();
      if (error) throw error;
      let ids = operation_ids ?? [];
      if (ids.length === 0 && scope) {
        let query = supabase.from("operations").select("id, parts!inner(job_id, jobs!inner(job_number))").is("deleted_at", null).neq("status", "completed");
        if (scope.job_id) query = query.eq("parts.job_id", scope.job_id);
        if (scope.job_number) query = query.eq("parts.jobs.job_number", scope.job_number);
        if (scope.part_id) query = query.eq("part_id", scope.part_id);
        if (scope.cell_id) query = query.eq("cell_id", scope.cell_id);
        const { data, error: opError } = await query;
        if (opError) throw opError;
        ids = data.map((o) => o.id);
      }
      if (ids.length === 0) return { assigned: 0 };
      const { data, error: assignError } = await supabase.from("operation_resources")
        .upsert(ids.map((operation_id) => ({ resource_id: resource.id, operation_id, quantity, notes })), { onConflict: "operation_id,resource_id" })
        .select("operation_id");
      if (assignError) throw assignError;
      return { resource, assigned: data.length, operation_ids: ids };
    },
  }),
  tool({
    name: "get_parts_due_soon",
    title: "Parts due soon",
    description: "Open parts whose job is due within N days, with progress and the next operation that blocks completion.",
    input: {
      due_within_days: z.number().int().min(0).default(7),
      customer: z.string().optional(),
      sort_by: z.enum(["due_date", "completion_percentage", "customer"]).default("due_date"),
      limit: s.limit,
    },
    output: { summary: z.record(z.string(), z.number()), parts: z.array(z.record(z.string(), z.unknown())) },
    annotations: READ,
    async handler({ due_within_days, customer, sort_by, limit }, supabase) {
      const cutoff = new Date(Date.now() + due_within_days * 86_400_000).toISOString().slice(0, 10);
      let query = supabase.from("parts")
        .select("id, part_number, quantity, status, is_bullet_card, jobs!inner(job_number, customer, due_date), operations(id, operation_name, sequence, status, estimated_time)")
        .is("deleted_at", null).in("status", ["not_started", "in_progress"]).lte("jobs.due_date", cutoff).limit(limit);
      if (customer) query = query.ilike("jobs.customer", `%${customer}%`);
      const { data, error } = await query;
      if (error) throw error;
      const parts = data.map((part) => {
        const job = part.jobs as unknown as { job_number: string; customer: string | null; due_date: string };
        const ops = [...((part.operations ?? []) as Op[])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const blocking = ops.find((o) => o.status !== "completed");
        return {
          id: part.id, part_number: part.part_number, quantity: part.quantity, status: part.status, is_bullet_card: part.is_bullet_card,
          job_number: job.job_number, customer: job.customer, due_date: job.due_date,
          days_until_due: daysBetween(job.due_date, Date.now()),
          progress: progress(ops),
          blocking_operation: blocking ? { id: blocking.id, name: blocking.operation_name, sequence: blocking.sequence, status: blocking.status, estimated_time: blocking.estimated_time } : null,
        };
      }).sort((a, b) =>
        sort_by === "completion_percentage" ? b.progress.percentage - a.progress.percentage
          : sort_by === "customer" ? (a.customer ?? "").localeCompare(b.customer ?? "")
            : a.days_until_due - b.days_until_due);
      const overdue = parts.filter((p) => p.days_until_due < 0);
      return {
        summary: { total_parts: parts.length, overdue: overdue.length, due_within_3_days: parts.filter((p) => p.days_until_due >= 0 && p.days_until_due <= 3).length, bullet_cards: parts.filter((p) => p.is_bullet_card).length },
        parts,
      };
    },
  }),
  tool({
    name: "suggest_reschedule",
    title: "Suggest reschedule",
    description: "Capacity bottlenecks, consolidation options with the same customer and target-date feasibility for a job.",
    input: { job_id: s.id.optional(), job_number: z.string().optional(), target_date: z.string().optional() },
    output: { remaining_operations: z.number(), bottlenecks: z.array(z.record(z.string(), z.unknown())) },
    annotations: READ,
    async handler({ job_id, job_number, target_date }, supabase) {
      const job = await findJob(supabase, job_id, job_number, "id, job_number, customer, due_date, status, parts(id)");
      const partIds = ((job.parts ?? []) as { id: string }[]).map((p) => p.id);
      const { data: operations, error } = await supabase.from("operations").select("id, cell_id, estimated_time")
        .in("part_id", partIds).neq("status", "completed").is("deleted_at", null);
      if (error) throw error;
      const cellIds = [...new Set(operations.map((o) => o.cell_id).filter((id): id is string => Boolean(id)))];
      const [cells, wip, customerJobs] = await Promise.all([
        supabase.from("cells").select("id, name, wip_limit").in("id", cellIds),
        supabase.from("operations").select("cell_id").in("cell_id", cellIds).in("status", ["in_progress", "not_started"]).is("deleted_at", null),
        job.customer
          ? supabase.from("jobs").select("id, job_number, due_date, status").ilike("customer", job.customer).neq("id", job.id).neq("status", "completed").is("deleted_at", null).order("due_date").limit(5)
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of [cells, wip, customerJobs]) if (result.error) throw result.error;
      const wipByCell: Record<string, number> = {};
      for (const op of wip.data!) wipByCell[op.cell_id] = (wipByCell[op.cell_id] ?? 0) + 1;
      const capacity = cells.data!.map((cell) => ({
        cell_name: cell.name, wip_limit: cell.wip_limit, current_wip: wipByCell[cell.id] ?? 0,
        bottleneck: Boolean(cell.wip_limit) && (wipByCell[cell.id] ?? 0) >= cell.wip_limit,
      }));
      const consolidation = customerJobs.data!.map((cj) => ({ ...cj, days_difference: job.due_date && cj.due_date ? daysBetween(cj.due_date, job.due_date) : null }));
      const hoursRemaining = operations.reduce((sum, o) => sum + (o.estimated_time ?? 0), 0) / 60;
      const daysChange = target_date && job.due_date ? daysBetween(target_date, job.due_date) : null;
      return {
        job: { id: job.id, job_number: job.job_number, customer: job.customer, due_date: job.due_date, status: job.status },
        remaining_operations: operations.length,
        estimated_hours_remaining: Math.round(hoursRemaining * 10) / 10,
        bottlenecks: capacity.filter((c) => c.bottleneck),
        capacity,
        consolidation_options: consolidation,
        target_date: target_date ? {
          date: target_date, days_change: daysChange,
          feasibility: daysChange === null ? "unknown" : daysChange >= 0 ? "likely_feasible" : hoursRemaining < Math.abs(daysChange) * 8 ? "challenging" : "unlikely",
        } : null,
      };
    },
  }),
];
