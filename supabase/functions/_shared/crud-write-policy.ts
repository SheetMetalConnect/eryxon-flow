import type { SupabaseClient } from "@supabase/supabase-js";
import { BadRequestError } from "./validation/errorHandler.ts";

// Service-role CRUD must restrict columns and references independently of RLS.
const writableFields: Record<string, string> = {
  jobs: 'actual_duration completed_at current_cell_id customer delivery_address delivery_city delivery_country delivery_lat delivery_lng delivery_postal_code due_date due_date_override external_id external_source job_number metadata notes package_count paused_at resumed_at started_at status total_volume_m3 total_weight_kg',
  parts: 'cnc_program_name current_cell_id drawing_no external_id external_source file_paths height_mm image_paths is_bullet_card job_id length_mm material material_cert_number material_lot material_supplier metadata notes parent_part_id part_number quantity status weight_kg width_mm',
  // Lifecycle state (status, timestamps, actual_time) changes only through the lifecycle endpoints.
  operations: 'assigned_operator_id cell_id changeover_time estimated_time external_id external_source icon_name metadata notes operation_name part_id planned_end planned_start run_time_per_unit sequence setup_time wait_time',
  assignments: 'assigned_by job_id operator_id part_id shop_floor_operator_id status',
  substeps: 'completed_at completed_by icon_name name notes operation_id sequence status',
  resources: 'active description external_id external_source identifier location metadata name status type',
  cells: 'active capacity_hours_per_day color description enforce_wip_limit external_id external_source icon_name image_url name sequence show_capacity_warning wip_limit wip_warning_threshold',
  time_entries: 'duration end_time is_paused notes operation_id operator_id start_time time_type',
  operation_quantities: 'material_cert_number material_lot material_supplier metadata notes operation_id quantity_good quantity_produced quantity_rework quantity_scrap recorded_at recorded_by scrap_reason_id',
  scrap_reasons: 'active category code description metadata',
  substep_templates: 'created_by description name operation_type',
  webhooks: 'active events name secret_key url',
  issues: 'affected_quantity corrective_action created_by current_cell_id description disposition image_paths intended_next_cell_id issue_type ncr_category operation_id preventive_action reported_by_id resolution_notes reviewed_at reviewed_by root_cause severity status title verification_required',
  operation_batches: 'batch_number batch_type cell_id estimated_time external_id external_source layout_image_url material material_requirement_metadata material_requirement_raised nesting_image_url nesting_metadata notes parent_batch_id production_mode thickness_mm',
};

const tenantReferences: Record<string, Record<string, string>> = {
  "jobs": {
    "current_cell_id": "cells"
  },
  "parts": {
    "job_id": "jobs",
    "parent_part_id": "parts",
    "current_cell_id": "cells"
  },
  "operations": {
    "part_id": "parts",
    "cell_id": "cells",
    "assigned_operator_id": "profiles"
  },
  "assignments": {
    "job_id": "jobs",
    "part_id": "parts",
    "operator_id": "profiles",
    "shop_floor_operator_id": "operators",
    "assigned_by": "profiles"
  },
  "substeps": {
    "operation_id": "operations",
    "completed_by": "profiles"
  },
  "time_entries": {
    "operation_id": "operations",
    "operator_id": "profiles"
  },
  "operation_quantities": {
    "operation_id": "operations",
    "recorded_by": "profiles",
    "scrap_reason_id": "scrap_reasons"
  },
  "substep_templates": {
    "created_by": "profiles"
  },
  "issues": {
    "operation_id": "operations",
    "created_by": "profiles",
    "reviewed_by": "profiles",
    "reported_by_id": "profiles",
    "current_cell_id": "cells",
    "intended_next_cell_id": "cells"
  },
  "operation_batches": {
    "cell_id": "cells",
    "parent_batch_id": "operation_batches",
    "created_by": "profiles",
    "started_by": "profiles",
    "completed_by": "profiles"
  }
};

export async function validateCrudWrite(
  table: string,
  value: unknown,
  tenantId: string,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("Request body must be an object");
  }
  const allowed = writableFields[table];
  if (!allowed) throw new BadRequestError(`Writes to ${table} are not supported`);
  const body = value as Record<string, unknown>;
  const fields = new Set(allowed.split(" "));
  for (const field of Object.keys(body)) {
    if (!fields.has(field)) throw new BadRequestError(`Field ${field} is not writable`);
  }
  for (const [field, target] of Object.entries(tenantReferences[table] ?? {})) {
    const id = body[field];
    if (id === undefined || id === null) continue;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestError(`${field} must be a UUID`);
    }
    const { data, error } = await supabase.from(target).select("id")
      .eq("id", id).eq("tenant_id", tenantId).maybeSingle();
    if (error) throw new Error(`Failed to validate ${field}: ${error.message}`);
    if (!data) throw new BadRequestError(`${field} does not reference a record in this tenant`);
  }
  return body;
}
