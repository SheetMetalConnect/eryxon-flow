import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";
import { canCreateParts } from "../_shared/plan-limits.ts";
import { PartValidator } from "../_shared/validation/validators/PartValidator.ts";
import type { HandlerContext } from "../_shared/handler.ts";
import {
  PaymentRequiredError,
  ConflictError,
  NotFoundError,
  ValidationException,
  BadRequestError,
  createSuccessResponse,
} from "../_shared/validation/errorHandler.ts";
import {
  collectPartForeignKeys,
  fetchValidIds,
} from "../_shared/validation/fkValidator.ts";
import type { ValidationContext } from "../_shared/validation/types.ts";

// Custom POST handler with plan limits and validation
async function handleCreateWithLimits(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId } = ctx;

  // Parse body
  const body = await req.json();

  // Check plan limits BEFORE validation
  const quantity = body.quantity || 1;
  const quotaCheck = await canCreateParts(supabase, tenantId, quantity);
  if (!quotaCheck.allowed) {
    throw new PaymentRequiredError(
      "part",
      quotaCheck.current || 0,
      quotaCheck.limit || 0,
    );
  }

  // Collect foreign key IDs
  const fkIds = collectPartForeignKeys(body);

  // Batch fetch valid IDs
  const [validJobIds, validCellIds, validMaterialIds, validPartIds] = await Promise.all([
    fetchValidIds(supabase, "jobs", fkIds.jobIds, tenantId),
    fetchValidIds(supabase, "cells", fkIds.cellIds, tenantId),
    fetchValidIds(supabase, "materials", fkIds.materialIds, tenantId),
    fetchValidIds(supabase, "parts", fkIds.parentPartIds, tenantId),
  ]);

  // Build validation context
  const context: ValidationContext = {
    validJobIds,
    validCellIds,
    validMaterialIds,
    validPartIds,
    tenantId,
  };

  // Validate request
  const partWithJobId = { ...body, job_id: body.job_id };
  const validator = new PartValidator();
  const validationResult = await validator.validate(partWithJobId, context);

  if (!validationResult.valid) {
    throw new ValidationException(validationResult);
  }

  // Check for duplicate part number in same job
  const { data: existingPart } = await supabase
    .from("parts")
    .select("id")
    .eq("job_id", body.job_id)
    .eq("part_number", body.part_number)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (existingPart) {
    throw new ConflictError(
      "part",
      "part_number",
      `${body.part_number} in job ${body.job_id}`,
    );
  }

  // Verify parent_part belongs to same job if provided
  if (body.parent_part_id) {
    const { data: parentPart } = await supabase
      .from("parts")
      .select("id, job_id")
      .eq("id", body.parent_part_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!parentPart) {
      throw new NotFoundError("Parent part", body.parent_part_id);
    }

    if (parentPart.job_id !== body.job_id) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "parent_part_id",
          message: "Parent part must belong to the same job",
          constraint: "FK_CONSTRAINT",
          entityType: "part",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "Parent part belongs to different job",
      });
    }
  }

  // Create the part
  const dataToInsert = {
    tenant_id: tenantId,
    job_id: body.job_id,
    part_number: body.part_number,
    material: body.material,
    material_lot: body.material_lot,
    material_supplier: body.material_supplier,
    material_cert_number: body.material_cert_number,
    quantity: body.quantity || 1,
    parent_part_id: body.parent_part_id,
    current_cell_id: body.current_cell_id,
    material_id: body.material_id,
    file_paths: body.file_paths,
    notes: body.notes || body.description,
    metadata: body.metadata,
    drawing_no: body.drawing_no,
    cnc_program_name: body.cnc_program_name,
    is_bullet_card: body.is_bullet_card ?? false,
    status: "not_started",
  };

  const { data, error } = await supabase
    .from("parts")
    .insert(dataToInsert)
    .select(`
      id,
      part_number,
      material,
      quantity,
      status,
      file_paths,
      notes,
      metadata,
      created_at,
      updated_at,
      parent_part_id,
      material_lot,
      material_supplier,
      material_cert_number,
      drawing_no,
      cnc_program_name,
      is_bullet_card,
      job:jobs (
        id,
        job_number,
        customer
      ),
      operations (
        id,
        operation_name,
        status,
        completion_percentage,
        cell:cells (
          id,
          name,
          color
        )
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create part: ${error.message}`);
  }

  return createSuccessResponse(data, 201);
}

// Custom DELETE handler with child part validation
async function handleDeleteWithValidation(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const partId = url.searchParams.get("id");

  if (!partId) {
    throw new BadRequestError("Part ID is required in query string (?id=xxx)");
  }

  // Check if part has child parts
  const { data: childParts } = await supabase
    .from("parts")
    .select("id")
    .eq("parent_part_id", partId)
    .eq("tenant_id", tenantId)
    .limit(1);

  if (childParts && childParts.length > 0) {
    throw new ConflictError(
      "part",
      "child_parts",
      "Cannot delete part with child parts",
    );
  }

  // Verify part exists
  const { data: part } = await supabase
    .from("parts")
    .select("id")
    .eq("id", partId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!part) {
    throw new NotFoundError("Part", partId);
  }

  // Delete part (cascade will delete operations)
  const { error } = await supabase
    .from("parts")
    .delete()
    .eq("id", partId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to delete part: ${error.message}`);
  }

  return createSuccessResponse(
    { message: "Part deleted successfully", part_id: partId },
    200,
  );
}

// Custom handler for complex GET filters (job_number requires join)
async function handleGetPartsWithFilters(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url } = ctx;

  const jobNumber = url.searchParams.get("job_number");

  // If job_number filter is present, pre-fetch matching job IDs
  if (jobNumber) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("job_number", `%${jobNumber}%`);

    if (!jobs || jobs.length === 0) {
      // No matching jobs, return empty result
      return createSuccessResponse([], 200, {
        pagination: {
          limit: parseInt(url.searchParams.get("pageSize") || "100"),
          offset: 0,
          total: 0,
        },
      });
    }

    // Add job_id filter to URL params for crud-builder
    const jobIds = jobs.map((j: any) => j.id).join(",");
    url.searchParams.set("job_id", jobIds);
    url.searchParams.delete("job_number");
  }

  // Let crud-builder handle the rest
  return null as any; // Will be handled by default GET
}

// Configure CRUD handler for parts with validation and sync
export default serveApi(
  createCrudHandler({
    table: 'parts',
    selectFields: `
      id,
      part_number,
      material,
      quantity,
      status,
      file_paths,
      notes,
      metadata,
      created_at,
      updated_at,
      parent_part_id,
      material_lot,
      material_supplier,
      material_cert_number,
      drawing_no,
      cnc_program_name,
      is_bullet_card,
      job:jobs (
        id,
        job_number,
        customer
      ),
      operations (
        id,
        operation_name,
        status,
        completion_percentage,
        cell:cells (
          id,
          name,
          color
        )
      )
    `,
    searchFields: ['part_number', 'notes'],
    allowedFilters: ['job_id', 'material', 'status', 'part_number', 'material_lot'],
    sortableFields: ['part_number', 'material', 'status', 'created_at', 'quantity'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    validator: PartValidator,
    enableSync: true,
    syncIdField: 'external_id',
    customHandlers: {
      get: handleGetPartsWithFilters,
      post: handleCreateWithLimits,
      delete: handleDeleteWithValidation,
    },
  })
);
