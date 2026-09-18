import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, tool } from "../tool.js";
import { createTool, deleteTool, fetchTool, updateTool } from "./crud.js";

const fields = {
  material: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  drawing_no: z.string().optional(),
  cnc_program_name: z.string().optional(),
  is_bullet_card: z.boolean().optional(),
  parent_part_id: s.id.optional(),
  length_mm: z.number().optional(), width_mm: z.number().optional(), height_mm: z.number().optional(), weight_kg: z.number().optional(),
  material_lot: z.string().optional(), material_supplier: z.string().optional(), material_cert_number: z.string().optional(),
  external_id: z.string().optional(), external_source: z.string().optional(),
};

const operationInput = z.object({
  operation_name: z.string().min(1),
  cell_id: s.id,
  sequence: z.number().int().min(1).optional(),
  estimated_time: z.number().min(0).default(0),
  setup_time: z.number().min(0).optional(),
  run_time_per_unit: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const partTools = [
  fetchTool({
    table: "parts", title: "Fetch parts", description: "List parts with job number and customer.",
    select: "*, jobs(job_number, customer)",
    filters: { job_id: s.id.optional(), status: s.productionStatus.optional(), part_number: z.string().optional() },
    orderBy: { column: "created_at" },
  }),
  tool({
    name: "create_part",
    title: "Create part",
    description: "Create a part on a job, optionally with its routing (operations in sequence). Same contract as POST api-parts.",
    input: { ...fields, job_id: s.id, part_number: z.string().min(1), material: z.string().min(1), quantity: z.number().int().min(1).default(1), operations: z.array(operationInput).optional() },
    output: { id: z.string(), operations: z.array(z.record(z.string(), z.unknown())) },
    annotations: WRITE,
    async handler({ operations, ...part }, supabase) {
      const { data, error } = await supabase.from("parts").insert({ ...part, status: "not_started" }).select().single();
      if (error) throw error;
      const created: Record<string, unknown>[] = [];
      for (const [index, op] of (operations ?? []).entries()) {
        const { data: row, error: opError } = await supabase.from("operations")
          .insert({ ...op, part_id: data.id, sequence: op.sequence ?? index + 1, status: "not_started" }).select().single();
        if (opError) throw opError;
        created.push(row);
      }
      return { ...data, operations: created };
    },
  }),
  updateTool({
    table: "parts", name: "update_part", title: "Update part",
    description: "Update part details. Status and current cell follow the part's operations.",
    fields: { part_number: z.string().min(1).optional(), ...fields },
  }),
  deleteTool({ table: "parts", name: "delete_part", title: "Delete part", description: "Soft-delete a part.", softDelete: "deleted_at" }),
  tool({
    name: "get_part_routing",
    title: "Part routing",
    description: "The operations of a part in sequence with cell, status and hours (get_part_routing).",
    input: { part_id: s.id },
    output: { routing: z.array(z.record(z.string(), z.unknown())) },
    annotations: READ,
    async handler({ part_id }, supabase) {
      const { data, error } = await supabase.rpc("get_part_routing", { p_part_id: part_id });
      if (error) throw error;
      return { routing: data ?? [] };
    },
  }),
  tool({
    name: "request_part_file_upload",
    title: "Part file upload URL",
    description: "Signed upload URL (15 min) for a drawing/CAD file in the parts-cad bucket. PUT the file there, then call attach_part_file.",
    input: { part_id: s.id, filename: z.string().min(1).max(255).regex(/^[^/\\]+$/, "no path separators") },
    output: { upload_url: z.string(), file_path: z.string() },
    annotations: WRITE,
    async handler({ part_id, filename }, supabase) {
      const { data: part, error: lookup } = await supabase.from("parts").select("tenant_id, job_id").eq("id", part_id).single();
      if (lookup) throw lookup;
      const file_path = `${part.tenant_id}/${part.job_id}/${part_id}/${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage.from("parts-cad").createSignedUploadUrl(file_path);
      if (error) throw error;
      return { upload_url: data.signedUrl, file_path };
    },
  }),
  tool({
    name: "attach_part_file",
    title: "Attach part file",
    description: "Register an uploaded file path on a part so the terminal shows it (PDF → drawing, STEP/STP → 3D model).",
    input: { part_id: s.id, file_path: z.string().min(1) },
    output: { id: z.string(), file_paths: z.array(z.string()) },
    annotations: WRITE,
    async handler({ part_id, file_path }, supabase) {
      const { data: part, error: lookup } = await supabase.from("parts").select("file_paths").eq("id", part_id).single();
      if (lookup) throw lookup;
      const file_paths = [...new Set([...(part.file_paths ?? []), file_path])];
      const { error } = await supabase.from("parts").update({ file_paths }).eq("id", part_id);
      if (error) throw error;
      return { id: part_id, file_paths };
    },
  }),
];
