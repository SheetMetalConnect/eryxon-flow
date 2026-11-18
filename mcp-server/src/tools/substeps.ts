import { z } from "zod";
import * as s from "../schemas.js";
import { WRITE, IDEMPOTENT_WRITE, DESTRUCTIVE, tool } from "../tool.js";
import { fetchTool, updateTool } from "./crud.js";

export const substepTools = [
  fetchTool({
    table: "substeps",
    title: "Fetch substeps",
    description: "List the substeps of an operation in sequence order.",
    filters: { operation_id: s.id, status: z.string().optional() },
    orderBy: { column: "sequence", ascending: true },
    softDelete: false,
  }),
  tool({
    name: "add_substep",
    title: "Add substep",
    description: "Add a substep to an operation; sequence defaults to the next free number.",
    input: { operation_id: s.id, name: z.string().min(1), sequence: z.number().int().min(1).optional() },
    output: s.ROW,
    annotations: WRITE,
    async handler({ operation_id, name, sequence }, supabase) {
      if (sequence === undefined) {
        const { data } = await supabase.from("substeps").select("sequence").eq("operation_id", operation_id)
          .order("sequence", { ascending: false }).limit(1).maybeSingle();
        sequence = (data?.sequence ?? 0) + 1;
      }
      const { data, error } = await supabase.from("substeps")
        .insert({ operation_id, name, sequence, status: "not_started" }).select().single();
      if (error) throw error;
      return data;
    },
  }),
  tool({
    name: "complete_substep",
    title: "Complete substep",
    description: "Mark a substep completed.",
    input: { id: s.id },
    output: s.ROW,
    annotations: IDEMPOTENT_WRITE,
    async handler({ id }, supabase) {
      const { data, error } = await supabase.from("substeps")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
  }),
  updateTool({
    table: "substeps",
    name: "update_substep",
    title: "Update substep",
    description: "Rename, reorder or annotate a substep.",
    fields: { name: z.string().optional(), sequence: z.number().int().min(1).optional(), status: z.string().optional(), notes: z.string().optional() },
  }),
  tool({
    name: "delete_substep",
    title: "Delete substep",
    description: "Delete a substep permanently.",
    input: { id: s.id },
    output: s.DELETED,
    annotations: DESTRUCTIVE,
    async handler({ id }, supabase) {
      const { error } = await supabase.from("substeps").delete().eq("id", id);
      if (error) throw error;
      return { id, deleted: true };
    },
  }),
  fetchTool({
    name: "fetch_substep_templates", table: "substep_templates", title: "Fetch substep templates",
    description: "Reusable substep checklists per operation type.", select: "*, substep_template_items(id, name, sequence, notes)",
    filters: { operation_type: z.string().optional() }, orderBy: { column: "name", ascending: true }, softDelete: false,
  }),
  tool({
    name: "apply_substep_template", title: "Apply substep template", description: "Copy a template's items onto an operation as substeps, after its existing ones.",
    input: { operation_id: s.id, template_id: s.id }, output: { added: z.number() }, annotations: WRITE,
    async handler({ operation_id, template_id }, supabase) {
      const [template, operation] = await Promise.all([
        supabase.from("substep_templates").select("id").eq("id", template_id).single(),
        supabase.from("operations").select("id").eq("id", operation_id).single(),
      ]);
      if (template.error) throw template.error;
      if (operation.error) throw operation.error;
      const { data: items, error } = await supabase.from("substep_template_items").select("name, sequence, notes").eq("template_id", template_id).order("sequence");
      if (error) throw error;
      const { data: last } = await supabase.from("substeps").select("sequence").eq("operation_id", operation_id).order("sequence", { ascending: false }).limit(1).maybeSingle();
      const start = last?.sequence ?? 0;
      const { data, error: insertError } = await supabase.from("substeps")
        .insert(items.map((item, index) => ({ operation_id, name: item.name, notes: item.notes, sequence: start + index + 1, status: "not_started" }))).select("id");
      if (insertError) throw insertError;
      return { added: data.length };
    },
  }),
];
