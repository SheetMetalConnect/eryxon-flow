import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, IDEMPOTENT_WRITE, tool, tenantOf } from "../tool.js";
import { createTool, deleteTool, fetchTool, updateTool } from "./crud.js";

const fields = {
  operation_name: z.string().min(1).optional(),
  cell_id: s.id.optional(),
  sequence: z.number().int().min(1).optional(),
  estimated_time: z.number().min(0).optional(),
  setup_time: z.number().min(0).optional(),
  run_time_per_unit: z.number().min(0).optional(),
  changeover_time: z.number().min(0).optional(),
  wait_time: z.number().min(0).optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  planned_start: s.datetime.optional(),
  planned_end: s.datetime.optional(),
  assigned_operator_id: s.id.optional(),
  icon_name: z.string().optional(),
};

const lifecycle = (name: string, title: string, action: string, description: string) =>
  tool({
    name, title, description,
    input: { id: s.id, operator_id: s.id.optional(), notes: z.string().optional() },
    output: s.TRANSITION,
    annotations: IDEMPOTENT_WRITE,
    async handler({ id, operator_id, notes }, supabase) {
      const { data, error } = await supabase.rpc("transition_operation", {
        p_tenant_id: await tenantOf(supabase, "operations", id), p_operation_id: id, p_action: action,
        p_operator_id: operator_id ?? null, p_notes: notes ?? null,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

const timeEntry = (name: string, title: string, action: "stop" | "pause" | "resume") =>
  tool({
    name, title, description: `${title} (time_entry_action). Pausing keeps the operation in progress; stopping closes the timer and stores its duration.`,
    input: { time_entry_id: s.id },
    output: { changed: z.boolean() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ time_entry_id }, supabase) {
      const { data, error } = await supabase.rpc("time_entry_action", {
        p_tenant_id: await tenantOf(supabase, "time_entries", time_entry_id), p_time_entry_id: time_entry_id, p_action: action,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

export const operationTools = [
  fetchTool({
    table: "operations", title: "Fetch operations", description: "List operations with part and job numbers.",
    select: "*, parts(part_number, jobs(job_number))",
    filters: { part_id: s.id.optional(), status: s.productionStatus.optional(), cell_id: s.id.optional() },
    orderBy: { column: "created_at" },
  }),
  createTool({
    table: "operations", name: "create_operation", title: "Create operation",
    description: "Add an operation to a part's routing at a cell. Sequence orders the routing; sequential release uses it.",
    fields: { ...fields, part_id: s.id, operation_name: z.string().min(1), cell_id: s.id, sequence: z.number().int().min(1), estimated_time: z.number().min(0).default(0) },
    defaults: { status: "not_started" },
  }),
  updateTool({
    table: "operations", name: "update_operation", title: "Update operation",
    description: "Update routing (cell, sequence), times, planning dates or notes. Use the lifecycle tools to change status.",
    fields,
  }),
  deleteTool({ table: "operations", name: "delete_operation", title: "Delete operation", description: "Soft-delete an operation from the routing.", softDelete: "deleted_at" }),
  lifecycle("start_operation", "Start operation", "start",
    "Start an operation (transition_operation). With operator_id a timer opens for that operator. Rule violations (already clocked elsewhere, standstill, sequential release) return INVALID_STATE_TRANSITION with the rule text."),
  lifecycle("pause_operation", "Pause operation", "pause", "Pause an in-progress operation and close its running timers."),
  lifecycle("resume_operation", "Resume operation", "resume", "Resume a paused operation."),
  lifecycle("stop_operation", "Stop operator timer", "stop", "Stop the given operator's timer on an operation without completing it."),
  lifecycle("complete_operation", "Complete operation", "finish",
    "Complete a started operation: closes running timers, stores actual time and refreshes part and job status."),
  fetchTool({
    name: "fetch_time_entries", table: "time_entries", title: "Fetch time entries",
    description: "Time entries per operation or operator; active ones have no end_time.",
    select: "*, operations(operation_name, parts(part_number, jobs(job_number)))",
    filters: { operation_id: s.id.optional(), operator_id: s.id.optional() },
    orderBy: { column: "start_time" }, softDelete: false,
  }),
  tool({
    name: "fetch_active_time_entries", title: "Active timers", description: "All running timers (end_time is null) with operation and part.",
    input: {}, output: { data: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler(_args, supabase) {
      const { data, error } = await supabase.from("time_entries")
        .select("id, operator_id, shop_floor_operator_id, start_time, is_paused, operations(id, operation_name, parts(part_number, jobs(job_number)))")
        .is("end_time", null).order("start_time");
      if (error) throw error;
      return { data };
    },
  }),
  timeEntry("stop_time_entry", "Stop time entry", "stop"),
  timeEntry("pause_time_entry", "Pause time entry", "pause"),
  timeEntry("resume_time_entry", "Resume time entry", "resume"),
  tool({
    name: "reschedule_operations",
    title: "Reschedule operations",
    description: "Set or shift planned dates for operations selected by job, part, cell, customer or explicit ids.",
    input: {
      scope: z.object({ job_id: s.id.optional(), job_number: z.string().optional(), part_id: s.id.optional(), cell_id: s.id.optional(), customer: z.string().optional(), operation_ids: z.array(s.id).optional() }),
      schedule: z.object({ planned_start: s.datetime.optional(), planned_end: s.datetime.optional(), shift_days: z.number().optional(), shift_hours: z.number().optional() }),
      include_completed: z.boolean().default(false),
    },
    output: { updated: z.number() },
    annotations: WRITE,
    async handler({ scope, schedule, include_completed }, supabase) {
      let ids = scope.operation_ids ?? [];
      if (ids.length === 0) {
        let query = supabase.from("operations").select("id, parts!inner(job_id, jobs!inner(customer, job_number))").is("deleted_at", null);
        if (scope.job_id) query = query.eq("parts.job_id", scope.job_id);
        if (scope.job_number) query = query.eq("parts.jobs.job_number", scope.job_number);
        if (scope.part_id) query = query.eq("part_id", scope.part_id);
        if (scope.cell_id) query = query.eq("cell_id", scope.cell_id);
        if (scope.customer) query = query.ilike("parts.jobs.customer", `%${scope.customer}%`);
        if (!include_completed) query = query.neq("status", "completed");
        const { data, error } = await query;
        if (error) throw error;
        ids = data.map((o) => o.id);
      }
      if (ids.length === 0) return { updated: 0 };
      const shiftMs = ((schedule.shift_days ?? 0) * 24 + (schedule.shift_hours ?? 0)) * 3600_000;
      if (shiftMs) {
        const { data: ops, error } = await supabase.from("operations").select("id, planned_start, planned_end").in("id", ids);
        if (error) throw error;
        const shift = (value: string | null) => (value ? new Date(new Date(value).getTime() + shiftMs).toISOString() : null);
        for (const op of ops) {
          const { error: updateError } = await supabase.from("operations")
            .update({ planned_start: shift(op.planned_start), planned_end: shift(op.planned_end) }).eq("id", op.id);
          if (updateError) throw updateError;
        }
        return { updated: ops.length, shifted_hours: shiftMs / 3600_000 };
      }
      const { data, error } = await supabase.from("operations")
        .update({ planned_start: schedule.planned_start, planned_end: schedule.planned_end }).in("id", ids).select("id, operation_name, planned_start, planned_end");
      if (error) throw error;
      return { updated: data.length, operations: data };
    },
  }),
  tool({
    name: "complete_operations",
    title: "Complete operations in bulk",
    description: "Complete every open operation of a job, part or cell (or explicit ids) through the production lifecycle, in sequence order. Each transition is its own transaction; on failure the result says how far it got.",
    input: {
      scope: z.object({ job_id: s.id.optional(), part_id: s.id.optional(), cell_id: s.id.optional(), operation_ids: z.array(s.id).optional() }),
      notes: z.string().optional(),
    },
    output: { completed: z.number() },
    annotations: WRITE,
    async handler({ scope, notes }, supabase) {
      let ids = scope.operation_ids ?? [];
      if (ids.length === 0) {
        let query = supabase.from("operations").select("id, parts!inner(job_id)").neq("status", "completed").is("deleted_at", null);
        if (scope.job_id) query = query.eq("parts.job_id", scope.job_id);
        if (scope.part_id) query = query.eq("part_id", scope.part_id);
        if (scope.cell_id) query = query.eq("cell_id", scope.cell_id);
        const { data, error } = await query;
        if (error) throw error;
        ids = data.map((o) => o.id);
      }
      if (ids.length === 0) return { completed: 0 };
      const { data: targets, error } = await supabase.from("operations").select("id, tenant_id, operation_name, status").in("id", ids).order("sequence");
      if (error) throw error;
      const completed: { id: string; operation_name: string }[] = [];
      for (const target of targets) {
        for (const action of target.status === "not_started" ? ["start", "finish"] : ["finish"]) {
          const { error: transitionError } = await supabase.rpc("transition_operation", { p_tenant_id: target.tenant_id, p_operation_id: target.id, p_action: action });
          if (transitionError) throw new Error(`${target.operation_name}: ${transitionError.message} (${completed.length} of ${targets.length} completed)`);
        }
        completed.push({ id: target.id, operation_name: target.operation_name });
      }
      if (notes) {
        const { error: noteError } = await supabase.from("operations").update({ notes }).in("id", completed.map((o) => o.id));
        if (noteError) throw noteError;
      }
      return { completed: completed.length, operations: completed };
    },
  }),
];
