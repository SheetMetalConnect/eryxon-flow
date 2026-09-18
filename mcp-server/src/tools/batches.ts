import { z } from "zod";
import * as s from "../schemas.js";
import { WRITE, IDEMPOTENT_WRITE, ToolError, tool, tenantOf } from "../tool.js";
import { deleteTool, fetchTool, updateTool } from "./crud.js";

const fields = {
  material: z.string().optional(), thickness_mm: z.number().optional(), estimated_time: z.number().min(0).optional(),
  notes: z.string().optional(), parent_batch_id: s.id.optional(), nesting_image_url: z.string().optional(), layout_image_url: z.string().optional(),
};

const transition = (name: string, title: string, action: "start" | "stop") =>
  tool({
    name, title,
    description: `${title} (transition_batch): ${action === "start" ? "starts every member operation and opens the operator's batch timer" : "stops the batch timer and pauses its operations"}.`,
    input: { batch_id: s.id, operator_id: s.id.optional() },
    output: { changed: z.boolean() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ batch_id, operator_id }, supabase) {
      const { data, error } = await supabase.rpc("transition_batch", {
        p_tenant_id: await tenantOf(supabase, "operation_batches", batch_id), p_batch_id: batch_id, p_action: action, p_operator_id: operator_id ?? null,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

export const batchTools = [
  fetchTool({
    name: "fetch_batches", table: "operation_batches", title: "Fetch batches",
    description: "Operation batches (nestings, tube/saw/finishing batches) with their cell.",
    select: "*, cells(name)",
    filters: { status: s.batchStatus.optional(), batch_type: s.batchType.optional(), cell_id: s.id.optional() },
    orderBy: { column: "created_at" }, softDelete: false,
  }),
  tool({
    name: "create_batch",
    title: "Create batch",
    description: "Create a batch at a cell and optionally add operations to it (same rules as POST api-batches: automated mode only for laser_nesting).",
    input: { batch_number: z.string().min(1), batch_type: s.batchType, cell_id: s.id, production_mode: s.productionMode.default("manual"), operation_ids: z.array(s.id).default([]), ...fields },
    output: { id: z.string(), operations_added: z.number() },
    annotations: WRITE,
    async handler({ operation_ids, ...batch }, supabase) {
      if (batch.production_mode === "automated" && batch.batch_type !== "laser_nesting") {
        throw new ToolError("VALIDATION_ERROR", "production_mode 'automated' is only supported for laser_nesting batches");
      }
      const { data, error } = await supabase.from("operation_batches").insert({ ...batch, status: "draft" }).select().single();
      if (error) throw error;
      let operations_added = 0;
      if (operation_ids.length > 0) {
        const { data: result, error: addError } = await supabase.rpc("add_batch_operations", { p_tenant_id: data.tenant_id, p_batch_id: data.id, p_operation_ids: operation_ids });
        if (addError) throw addError;
        operations_added = Number((result as { operations_added?: number })?.operations_added ?? 0);
      }
      return { ...data, operations_added };
    },
  }),
  tool({
    name: "add_batch_operations",
    title: "Add operations to batch",
    description: "Append operations to a batch (add_batch_operations); already-member operations are ignored.",
    input: { batch_id: s.id, operation_ids: z.array(s.id).min(1) },
    output: { operations_added: z.number() },
    annotations: IDEMPOTENT_WRITE,
    async handler({ batch_id, operation_ids }, supabase) {
      const { data, error } = await supabase.rpc("add_batch_operations", { p_tenant_id: await tenantOf(supabase, "operation_batches", batch_id), p_batch_id: batch_id, p_operation_ids: operation_ids });
      if (error) throw error;
      return { operations_added: Number((data as { operations_added?: number })?.operations_added ?? 0), ...(data as Record<string, unknown>) };
    },
  }),
  transition("start_batch", "Start batch", "start"),
  transition("stop_batch", "Stop batch", "stop"),
  updateTool({
    table: "operation_batches", name: "update_batch", title: "Update batch",
    description: "Update batch details or mark it ready/cancelled. Membership changes go through add_batch_operations.",
    fields: { ...fields, status: z.enum(["draft", "ready", "cancelled"]).optional() },
  }),
  deleteTool({ table: "operation_batches", name: "delete_batch", title: "Delete batch", description: "Delete a batch and its memberships.", softDelete: false }),
];
