import { z } from "zod";
import * as s from "../schemas.js";
import { createTool, deleteTool, fetchTool, updateTool } from "./crud.js";

// Job status and current cell are derived from operations (refresh_production_job).
const fields = {
  customer: z.string().optional(),
  notes: z.string().optional(),
  due_date: s.datetime.optional(),
  due_date_override: s.datetime.optional(),
  delivery_address: z.string().optional(),
  delivery_city: z.string().optional(),
  delivery_postal_code: z.string().optional(),
  delivery_country: z.string().optional(),
  package_count: z.number().int().min(0).optional(),
  total_weight_kg: z.number().min(0).optional(),
  external_id: z.string().optional(),
  external_source: z.string().optional(),
};

export const jobTools = [
  fetchTool({
    table: "jobs", title: "Fetch jobs", description: "List jobs; status and current cell follow their operations.",
    filters: { status: s.productionStatus.optional(), customer: z.string().optional(), job_number: z.string().optional() },
    orderBy: { column: "created_at" },
  }),
  createTool({
    table: "jobs", name: "create_job", title: "Create job",
    description: "Create a job. Add parts with create_part (optionally with their operations) afterwards.",
    fields: { job_number: z.string().min(1), ...fields },
  }),
  updateTool({
    table: "jobs", name: "update_job", title: "Update job",
    description: "Update job details. Status cannot be set; it follows the operations.",
    fields,
  }),
  deleteTool({ table: "jobs", name: "delete_job", title: "Delete job", description: "Soft-delete a job (deleted_at).", softDelete: "deleted_at" }),
];
