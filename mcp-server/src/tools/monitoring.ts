import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, IDEMPOTENT_WRITE, tool } from "../tool.js";
import { fetchTool } from "./crud.js";

export const monitoringTools = [
  fetchTool({
    table: "activity_log", title: "Fetch activity log", description: "Audit trail of actions with actor and entity.",
    filters: { action: z.string().optional(), entity_type: z.string().optional(), entity_id: s.id.optional() }, orderBy: { column: "created_at" }, softDelete: false,
  }),
  fetchTool({
    table: "notifications", title: "Fetch notifications", description: "In-app notifications.",
    filters: { read: z.boolean().optional(), user_id: s.id.optional(), type: z.string().optional() }, orderBy: { column: "created_at" }, softDelete: false,
  }),
  tool({
    name: "create_notification", title: "Create notification", description: "Post an in-app notification to a user (create_notification).",
    input: { tenant_id: s.id, user_id: s.id, type: z.string().min(1), severity: z.enum(["info", "warning", "error", "success"]).default("info"), title: z.string().min(1), message: z.string().min(1), link: z.string().optional(), reference_type: z.string().optional(), reference_id: s.id.optional() },
    output: { id: z.string() }, annotations: WRITE,
    async handler(args, supabase) {
      const { data, error } = await supabase.rpc("create_notification", { p_tenant_id: args.tenant_id, p_user_id: args.user_id, p_type: args.type, p_severity: args.severity, p_title: args.title, p_message: args.message, p_link: args.link ?? null, p_reference_type: args.reference_type ?? null, p_reference_id: args.reference_id ?? null });
      if (error) throw error;
      return { id: String(data) };
    },
  }),
  tool({
    name: "mark_notification_read", title: "Mark notification read", description: "Mark one notification as read (mark_notification_read).",
    input: { notification_id: s.id }, output: { ok: z.boolean() }, annotations: IDEMPOTENT_WRITE,
    async handler({ notification_id }, supabase) {
      const { error } = await supabase.rpc("mark_notification_read", { p_notification_id: notification_id });
      if (error) throw error;
      return { ok: true };
    },
  }),
  tool({
    name: "get_cell_wip", title: "Cell WIP metrics", description: "QRM metrics for one cell: current WIP against its limit and the next-cell capacity signal the terminal shows (get_cell_qrm_metrics, check_next_cell_capacity).",
    input: { cell_id: s.id, tenant_id: s.id }, output: { metrics: z.unknown(), next_cell: z.unknown() }, annotations: READ,
    async handler({ cell_id, tenant_id }, supabase) {
      const [metrics, next] = await Promise.all([
        supabase.rpc("get_cell_qrm_metrics", { cell_id_param: cell_id, tenant_id_param: tenant_id }),
        supabase.rpc("check_next_cell_capacity", { current_cell_id: cell_id, tenant_id_param: tenant_id }),
      ]);
      if (metrics.error) throw metrics.error;
      if (next.error) throw next.error;
      return { metrics: metrics.data, next_cell: next.data };
    },
  }),
  fetchTool({
    table: "storage_locations", title: "Fetch storage locations", description: "Physical locations (racks, carts, shelves) used for part placement.",
    filters: { cell_id: s.id.optional(), active: z.boolean().optional() }, orderBy: { column: "sort_order", ascending: true }, softDelete: false,
  }),
  tool({
    name: "place_part", title: "Place part", description: "Record where a part physically is (part_placements). Closes any open placement of that part first.",
    input: { part_id: s.id, location_id: s.id, operation_id: s.id.optional(), placed_by: s.id.optional() },
    output: s.ROW, annotations: WRITE,
    async handler({ part_id, location_id, operation_id, placed_by }, supabase) {
      const now = new Date().toISOString();
      const { error: closeError } = await supabase.from("part_placements").update({ removed_at: now }).eq("part_id", part_id).is("removed_at", null);
      if (closeError) throw closeError;
      const { data, error } = await supabase.from("part_placements").insert({ part_id, location_id, operation_id: operation_id ?? null, placed_by: placed_by ?? process.env.MCP_ACTOR_ID ?? null, placed_at: now }).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  }),
  tool({
    name: "remove_part_placement", title: "Remove part placement", description: "Close the open placement of a part (it left the location).",
    input: { part_id: s.id }, output: { closed: z.number() }, annotations: IDEMPOTENT_WRITE,
    async handler({ part_id }, supabase) {
      const { data, error } = await supabase.from("part_placements").update({ removed_at: new Date().toISOString() }).eq("part_id", part_id).is("removed_at", null).select("id");
      if (error) throw error;
      return { closed: data.length };
    },
  }),
];
