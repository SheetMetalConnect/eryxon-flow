import { z } from "zod";
import * as s from "../schemas.js";
import { READ, IDEMPOTENT_WRITE, WRITE, DESTRUCTIVE, actor, tool } from "../tool.js";
import { createTool, deleteTool, fetchTool, updateTool } from "./crud.js";

const cellFields = {
  name: z.string().min(1).optional(), sequence: z.number().int().min(0).optional(), color: z.string().optional(), description: z.string().optional(),
  wip_limit: z.number().int().min(0).optional(), wip_warning_threshold: z.number().int().min(0).optional(), enforce_wip_limit: z.boolean().optional(),
  show_capacity_warning: z.boolean().optional(), capacity_hours_per_day: z.number().min(0).optional(), icon_name: z.string().optional(), active: z.boolean().optional(),
};
const resourceFields = {
  name: z.string().min(1).optional(), type: z.string().min(1).optional(), identifier: z.string().optional(), description: z.string().optional(),
  location: z.string().optional(), status: z.enum(["available", "in_use", "maintenance", "unavailable"]).optional(), active: z.boolean().optional(),
};
const materialFields = { name: z.string().min(1).optional(), description: z.string().optional(), color: z.string().optional(), active: z.boolean().optional() };

export const configTools = [
  fetchTool({ table: "cells", title: "Fetch cells", description: "Production cells (stages) in routing order with WIP limits.", filters: { active: z.boolean().optional() }, orderBy: { column: "sequence", ascending: true } }),
  createTool({ table: "cells", name: "create_cell", title: "Create cell", description: "Add a production cell/stage.", fields: { ...cellFields, name: z.string().min(1), sequence: z.number().int().min(0) } }),
  updateTool({ table: "cells", name: "update_cell", title: "Update cell", description: "Rename, reorder or change WIP limits of a cell.", fields: cellFields }),
  deleteTool({ table: "cells", name: "delete_cell", title: "Delete cell", description: "Soft-delete a cell; operations routed through it keep their history.", softDelete: "deleted_at" }),

  fetchTool({ table: "resources", title: "Fetch resources", description: "Machines, tools and fixtures.", filters: { type: z.string().optional(), status: z.string().optional(), active: z.boolean().optional() }, orderBy: { column: "name", ascending: true } }),
  createTool({ table: "resources", name: "create_resource", title: "Create resource", description: "Add a machine, tool or fixture.", fields: { ...resourceFields, name: z.string().min(1), type: z.string().min(1) }, defaults: { status: "available", active: true } }),
  updateTool({ table: "resources", name: "update_resource", title: "Update resource", description: "Change a resource's status, location or details.", fields: resourceFields }),
  deleteTool({ table: "resources", name: "delete_resource", title: "Delete resource", description: "Soft-delete a resource.", softDelete: "deleted_at" }),
  tool({
    name: "unassign_resource", title: "Unassign resource", description: "Remove a resource assignment from an operation.",
    input: { resource_id: s.id, operation_id: s.id }, output: { removed: z.boolean() }, annotations: DESTRUCTIVE,
    async handler({ resource_id, operation_id }, supabase) {
      const { error } = await supabase.from("operation_resources").delete().eq("resource_id", resource_id).eq("operation_id", operation_id);
      if (error) throw error;
      return { removed: true };
    },
  }),

  fetchTool({ table: "materials", title: "Fetch materials", description: "Material catalogue.", filters: { active: z.boolean().optional() }, orderBy: { column: "name", ascending: true }, softDelete: false }),
  createTool({ table: "materials", name: "create_material", title: "Create material", description: "Add a material to the catalogue.", fields: { ...materialFields, name: z.string().min(1) } }),
  updateTool({ table: "materials", name: "update_material", title: "Update material", description: "Edit a material.", fields: materialFields }),
  deleteTool({ table: "materials", name: "delete_material", title: "Delete material", description: "Remove a material from the catalogue.", softDelete: false }),

  tool({
    name: "list_operators", title: "List operators", description: "Shop-floor operators (PIN accounts) with lock state (list_operators).",
    input: {}, output: { data: z.array(z.record(z.string(), z.unknown())) }, annotations: READ,
    async handler(_args, supabase) {
      const { data, error } = await supabase.rpc("list_operators");
      if (error) throw error;
      return { data: data ?? [] };
    },
  }),
  tool({
    name: "create_operator", title: "Create operator", description: "Create a shop-floor operator with a PIN (create_operator_with_pin).",
    input: { tenant_id: s.id, employee_id: z.string().min(1), full_name: z.string().min(1), pin: z.string().min(4).max(8), role: z.enum(["operator", "admin"]).default("operator") },
    output: { id: z.string() }, annotations: WRITE,
    async handler({ tenant_id, employee_id, full_name, pin, role }, supabase) {
      const { data, error } = await supabase.rpc("create_operator_with_pin", { p_tenant_id: tenant_id, p_employee_id: employee_id, p_full_name: full_name, p_pin: pin, p_role: role });
      if (error) throw error;
      return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : { id: String(data) };
    },
  }),
  tool({
    name: "reset_operator_pin", title: "Reset operator PIN", description: "Set a new PIN for an operator (reset_operator_pin).",
    input: { operator_id: s.id, pin: z.string().min(4).max(8) }, output: { ok: z.boolean() }, annotations: IDEMPOTENT_WRITE,
    async handler({ operator_id, pin }, supabase) {
      const { data, error } = await supabase.rpc("reset_operator_pin", { p_operator_id: operator_id, p_new_pin: pin });
      if (error) throw error;
      return { ok: Boolean(data) };
    },
  }),
  tool({
    name: "unlock_operator", title: "Unlock operator", description: "Clear a PIN lockout (unlock_operator).",
    input: { operator_id: s.id }, output: { ok: z.boolean() }, annotations: IDEMPOTENT_WRITE,
    async handler({ operator_id }, supabase) {
      const { data, error } = await supabase.rpc("unlock_operator", { p_operator_id: operator_id });
      if (error) throw error;
      return { ok: Boolean(data) };
    },
  }),
  updateTool({ table: "operators", name: "update_operator", title: "Update operator", description: "Rename or deactivate an operator.", fields: { full_name: z.string().optional(), employee_id: z.string().optional(), active: z.boolean().optional() } }),

  fetchTool({
    table: "assignments", title: "Fetch assignments", description: "Operator assignments to jobs or parts.",
    select: "*, jobs(job_number), parts(part_number)", filters: { operator_id: s.id.optional(), shop_floor_operator_id: s.id.optional(), job_id: s.id.optional(), part_id: s.id.optional(), status: z.enum(["assigned", "accepted", "in_progress", "completed"]).optional() },
    orderBy: { column: "created_at" }, softDelete: false,
  }),
  tool({
    name: "create_assignment", title: "Assign work", description: "Assign a job or part to an operator (profile) or shop-floor operator.",
    input: { job_id: s.id.optional(), part_id: s.id.optional(), operator_id: s.id.optional(), shop_floor_operator_id: s.id.optional(), assigned_by: s.id.optional() },
    output: s.ROW, annotations: WRITE,
    async handler({ assigned_by, ...assignment }, supabase) {
      if (!assignment.job_id && !assignment.part_id) throw new Error("Specify job_id or part_id");
      if (!assignment.operator_id && !assignment.shop_floor_operator_id) throw new Error("Specify operator_id or shop_floor_operator_id");
      const { data, error } = await supabase.from("assignments").insert({ ...assignment, assigned_by: actor(assigned_by, "assigned_by"), status: "assigned" }).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  }),
  deleteTool({ table: "assignments", name: "delete_assignment", title: "Remove assignment", description: "Remove an operator assignment.", softDelete: false }),

  fetchTool({ table: "factory_calendar", title: "Fetch factory calendar", description: "Calendar exceptions: holidays, closures, half days and special working days.", filters: { day_type: s.dayType.optional() }, orderBy: { column: "date", ascending: true }, softDelete: false }),
  tool({
    name: "set_calendar_day", title: "Set calendar day", description: "Create or replace the calendar entry for a date (holiday, closure, half day or working day with custom hours).",
    input: { tenant_id: s.id, date: s.date, day_type: s.dayType, name: z.string().optional(), opening_time: z.string().optional(), closing_time: z.string().optional(), capacity_multiplier: z.number().min(0).max(2).optional(), notes: z.string().optional() },
    output: s.ROW, annotations: IDEMPOTENT_WRITE,
    async handler(args, supabase) {
      const { data, error } = await supabase.from("factory_calendar").upsert(args, { onConflict: "tenant_id,date" }).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  }),
  deleteTool({ table: "factory_calendar", name: "delete_calendar_day", title: "Delete calendar day", description: "Remove a calendar exception.", softDelete: false }),

  fetchTool({ table: "webhooks", title: "Fetch webhooks", description: "Outbound webhook subscriptions.", filters: { active: z.boolean().optional() }, orderBy: { column: "created_at" }, softDelete: false }),
  createTool({ table: "webhooks", name: "create_webhook", title: "Create webhook", description: "Subscribe an HTTPS URL to events. Every delivery is signed with the secret (X-Eryxon-Signature: t=<unix>,v1=<hmac>).",
    fields: { name: z.string().min(1), url: z.string().url(), events: z.array(s.webhookEvent).min(1), secret_key: z.string().min(16), active: z.boolean().default(true) } }),
  updateTool({ table: "webhooks", name: "update_webhook", title: "Update webhook", description: "Change name, URL, events, secret or activation.", fields: { name: z.string().min(1).optional(), url: z.string().url().optional(), events: z.array(s.webhookEvent).min(1).optional(), secret_key: z.string().min(16).optional(), active: z.boolean().optional() } }),
  deleteTool({ table: "webhooks", name: "delete_webhook", title: "Delete webhook", description: "Remove a webhook subscription.", softDelete: false }),
  fetchTool({ table: "webhook_deliveries", title: "Fetch webhook deliveries", description: "Delivery records per webhook: event, outcome, status code, attempts, latency and error.", filters: { webhook_id: s.id.optional(), status: z.enum(["delivered", "failed"]).optional(), event: s.webhookEvent.optional() }, orderBy: { column: "created_at" }, softDelete: false }),
  tool({
    name: "send_test_webhook", title: "Send test webhook", description: "Deliver a signed test event to a webhook (webhook_send_test); the result shows up in fetch_webhook_deliveries.",
    input: { webhook_id: s.id }, output: { sent: z.boolean() }, annotations: WRITE,
    async handler({ webhook_id }, supabase) {
      const { error } = await supabase.rpc("webhook_send_test", { p_webhook_id: webhook_id });
      if (error) throw error;
      return { sent: true };
    },
  }),
  tool({
    name: "redeliver_webhook", title: "Redeliver webhook event", description: "Deliver a failed or past delivery again (webhook_redeliver).",
    input: { delivery_id: s.id }, output: { redelivered: z.boolean() }, annotations: IDEMPOTENT_WRITE,
    async handler({ delivery_id }, supabase) {
      const { error } = await supabase.rpc("webhook_redeliver", { p_delivery_id: delivery_id });
      if (error) throw error;
      return { redelivered: true };
    },
  }),

  tool({
    name: "get_workshop_settings", title: "Workshop settings", description: "Feature flags (sequentialRelease, operatorTerminalWorkModes, …), factory hours, timezone and location tracking of the workshop.",
    input: { tenant_id: s.id }, output: { id: z.string(), feature_flags: z.record(z.string(), z.unknown()) }, annotations: READ,
    async handler({ tenant_id }, supabase) {
      const { data, error } = await supabase.from("tenants").select("id, name, timezone, factory_opening_time, factory_closing_time, working_days_mask, auto_stop_tracking, location_tracking_enabled, feature_flags").eq("id", tenant_id).single();
      if (error) throw error;
      return { ...data, feature_flags: data.feature_flags ?? {} };
    },
  }),
  tool({
    name: "update_workshop_settings", title: "Update workshop settings",
    description: "Merge feature flags (e.g. {\"sequentialRelease\": true} to block starting an operation before its predecessor is completed) and change factory hours or location tracking.",
    input: { tenant_id: s.id, feature_flags: z.record(z.string(), z.unknown()).optional(), timezone: z.string().optional(), factory_opening_time: z.string().optional(), factory_closing_time: z.string().optional(), working_days_mask: z.number().int().optional(), auto_stop_tracking: z.boolean().optional(), location_tracking_enabled: z.boolean().optional() },
    output: { id: z.string(), feature_flags: z.record(z.string(), z.unknown()) }, annotations: IDEMPOTENT_WRITE,
    async handler({ tenant_id, feature_flags, ...settings }, supabase) {
      const { data: current, error: lookup } = await supabase.from("tenants").select("feature_flags").eq("id", tenant_id).single();
      if (lookup) throw lookup;
      const merged = { ...(current.feature_flags ?? {}), ...feature_flags };
      const { data, error } = await supabase.from("tenants").update({ ...settings, ...(feature_flags ? { feature_flags: merged } : {}) }).eq("id", tenant_id)
        .select("id, name, timezone, factory_opening_time, factory_closing_time, working_days_mask, auto_stop_tracking, location_tracking_enabled, feature_flags").single();
      if (error) throw error;
      return { ...data, feature_flags: data.feature_flags ?? {} };
    },
  }),
];
