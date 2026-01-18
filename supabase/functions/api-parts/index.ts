import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  canCreateParts,
  createLimitErrorResponse,
} from "../_shared/plan-limits.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSuccessResponse,
  handleError,
  handleMethodNotAllowed,
  handleOptions,
  NotFoundError,
  ConflictError,
  ValidationException,
  UnauthorizedError,
  PaymentRequiredError,
  BadRequestError,
} from "../_shared/validation/errorHandler.ts";
import { authenticateAndSetContext } from "../_shared/auth.ts";
import { PartValidator } from "../_shared/validation/validators/PartValidator.ts";
import {
  collectPartForeignKeys,
  fetchValidIds,
} from "../_shared/validation/fkValidator.ts";
import type { ValidationContext } from "../_shared/validation/types.ts";

serve(async (req) => {
  // Handle OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return handleOptions();
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Authenticate and set tenant context for RLS
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    // Check for sync endpoints
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Route: PUT /api-parts/sync - Upsert by external_id
    if (lastSegment === "sync" && req.method === "PUT") {
      return await handleSyncPart(req, supabase, tenantId);
    }

    // Route: POST /api-parts/bulk-sync - Bulk upsert
    if (lastSegment === "bulk-sync" && req.method === "POST") {
      return await handleBulkSyncParts(req, supabase, tenantId);
    }

    // Route by HTTP method for standard CRUD
    switch (req.method) {
      case "GET":
        return await handleGetParts(req, supabase, tenantId);
      case "POST":
        return await handleCreatePart(req, supabase, tenantId);
      case "PATCH":
        return await handleUpdatePart(req, supabase, tenantId);
      case "DELETE":
        return await handleDeletePart(req, supabase, tenantId);
      default:
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE", "PUT"]);
    }
  } catch (error) {
    return handleError(error);
  }
});

/**
 * GET /api-parts - List parts with filtering and pagination
 */
async function handleGetParts(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);

  // Query parameters
  const jobId = url.searchParams.get("job_id");
  const jobNumber = url.searchParams.get("job_number");
  const material = url.searchParams.get("material");
  const status = url.searchParams.get("status");
  const partNumber = url.searchParams.get("part_number");
  const materialLot = url.searchParams.get("material_lot");

  // Pagination (with limits)
  let limit = parseInt(url.searchParams.get("limit") || "100");
  if (limit < 1) limit = 100;
  if (limit > 1000) limit = 1000;

  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Build query
  let query = supabase
    .from("parts")
    .select(
      `
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
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (jobId) {
    query = query.eq("job_id", jobId);
  }
  if (material) {
    query = query.ilike("material", `%${material}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (partNumber) {
    query = query.ilike("part_number", `%${partNumber}%`);
  }
  if (materialLot) {
    query = query.ilike("material_lot", `%${materialLot}%`);
  }

  // Filter by job_number if provided (requires join)
  if (jobNumber) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("job_number", `%${jobNumber}%`);

    if (jobs && jobs.length > 0) {
      query = query.in("job_id", jobs.map((j: any) => j.id));
    } else {
      // No matching jobs, return empty result
      return createSuccessResponse([], 200, {
        pagination: { limit, offset, total: 0 },
      });
    }
  }

  const { data: parts, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch parts: ${error.message}`);
  }

  return createSuccessResponse(
    parts || [],
    200,
    {
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    },
  );
}

/**
 * POST /api-parts - Create new part
 */
async function handleCreatePart(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

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
  const [
    validJobIds,
    validCellIds,
    validMaterialIds,
    validPartIds,
  ] = await Promise.all([
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

  // Validate request (for creation, job_id is required)
  const partWithJobId = { ...body, job_id: body.job_id };
  const validator = new PartValidator();
  const validationResult = validator.validate(partWithJobId, context);

  if (!validationResult.valid) {
    throw new ValidationException(validationResult);
  }

  // Additional business validations

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

  // Verify parent_part belongs to same job
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

  // Create part
  const { data: part, error: partError } = await supabase
    .from("parts")
    .insert({
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
    })
    .select()
    .single();

  if (partError || !part) {
    throw new Error(`Failed to create part: ${partError?.message}`);
  }

  return createSuccessResponse(part, 201);
}

/**
 * PATCH /api-parts?id={partId} - Update part
 */
async function handleUpdatePart(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const partId = url.searchParams.get("id");

  if (!partId) {
    throw new BadRequestError("Part ID is required in query string (?id=xxx)");
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

  // Validate allowed fields
  const allowedFields = [
    "status",
    "quantity",
    "notes",
    "metadata",
    "file_paths",
    "material_lot",
    "material_supplier",
    "material_cert_number",
    "current_cell_id",
    "material_id",
    "drawing_no",
    "cnc_program_name",
    "is_bullet_card",
  ];
  const updates: any = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No valid fields to update");
  }

  // Validate FKs if provided
  if (updates.current_cell_id || updates.material_id) {
    const cellIds = updates.current_cell_id ? [updates.current_cell_id] : [];
    const materialIds = updates.material_id ? [updates.material_id] : [];

    const [validCellIds, validMaterialIds] = await Promise.all([
      cellIds.length > 0
        ? fetchValidIds(supabase, "cells", cellIds, tenantId)
        : Promise.resolve([]),
      materialIds.length > 0
        ? fetchValidIds(supabase, "materials", materialIds, tenantId)
        : Promise.resolve([]),
    ]);

    if (
      updates.current_cell_id && !validCellIds.includes(updates.current_cell_id)
    ) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "current_cell_id",
          message: "Invalid cell ID",
          constraint: "FK_CONSTRAINT",
          entityType: "part",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "current_cell_id references non-existent cell",
      });
    }

    if (updates.material_id && !validMaterialIds.includes(updates.material_id)) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "material_id",
          message: "Invalid material ID",
          constraint: "FK_CONSTRAINT",
          entityType: "part",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "material_id references non-existent material",
      });
    }
  }

  updates.updated_at = new Date().toISOString();

  // Update part
  const { data: part, error } = await supabase
    .from("parts")
    .update(updates)
    .eq("id", partId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update part: ${error.message}`);
  }

  if (!part) {
    throw new NotFoundError("Part", partId);
  }

  return createSuccessResponse(part, 200);
}

/**
 * DELETE /api-parts?id={partId} - Delete part
 */
async function handleDeletePart(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
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

/**
 * PUT /api-parts/sync - Upsert part by external_id
 */
async function handleSyncPart(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

  // Validate required sync fields
  if (!body.external_id) {
    throw new BadRequestError("external_id is required for sync operations");
  }

  if (!body.external_source) {
    throw new BadRequestError("external_source is required for sync operations");
  }

  if (!body.part_number) {
    throw new BadRequestError("part_number is required");
  }

  // Resolve job_id - either by ID or by external_id
  let jobId = body.job_id;
  if (!jobId && body.job_external_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("external_source", body.external_source)
      .eq("external_id", body.job_external_id)
      .is("deleted_at", null)
      .maybeSingle();
    jobId = job?.id;
  }

  if (!jobId) {
    throw new BadRequestError("job_id or job_external_id is required");
  }

  // Check if record exists by external_id
  const { data: existing } = await supabase
    .from("parts")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("external_source", body.external_source)
    .eq("external_id", body.external_id)
    .is("deleted_at", null)
    .maybeSingle();

  const syncHash = await generateSyncHash(body);
  const now = new Date().toISOString();

  if (existing) {
    // UPDATE existing record
    const updates: any = {
      job_id: jobId,
      part_number: body.part_number,
      material: body.material || "Unknown",
      quantity: body.quantity || 1,
      notes: body.notes,
      metadata: body.metadata,
      file_paths: body.file_paths,
      synced_at: now,
      sync_hash: syncHash,
      updated_at: now,
    };

    // Only update status if explicitly provided
    if (body.status && body.status !== existing.status) {
      updates.status = body.status;
    }

    const { data: part, error } = await supabase
      .from("parts")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update part: ${error.message}`);
    }

    return createSuccessResponse({
      action: "updated",
      part,
    });
  } else {
    // Check plan limits
    const partsQuotaCheck = await canCreateParts(supabase, tenantId, 1);
    if (!partsQuotaCheck.allowed) {
      throw new PaymentRequiredError(
        "part",
        partsQuotaCheck.current || 0,
        partsQuotaCheck.limit || 0,
      );
    }

    // CREATE new record
    const { data: part, error } = await supabase
      .from("parts")
      .insert({
        tenant_id: tenantId,
        job_id: jobId,
        part_number: body.part_number,
        material: body.material || "Unknown",
        quantity: body.quantity || 1,
        notes: body.notes,
        metadata: body.metadata,
        file_paths: body.file_paths,
        status: body.status || "not_started",
        external_id: body.external_id,
        external_source: body.external_source,
        synced_at: now,
        sync_hash: syncHash,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create part: ${error.message}`);
    }

    return createSuccessResponse({
      action: "created",
      part,
    }, 201);
  }
}

/**
 * POST /api-parts/bulk-sync - Bulk upsert parts
 */
async function handleBulkSyncParts(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

  const { parts, options = {} } = body;

  if (!Array.isArray(parts)) {
    throw new BadRequestError("parts must be an array");
  }

  if (parts.length === 0) {
    return createSuccessResponse({
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      results: [],
    });
  }

  if (parts.length > 1000) {
    throw new BadRequestError("Maximum 1000 parts per bulk-sync request");
  }

  // Pre-fetch job mappings for external IDs
  const jobExternalIds = [...new Set(parts.filter(p => p.job_external_id).map(p => p.job_external_id))];
  const jobMap = new Map<string, string>();

  if (jobExternalIds.length > 0) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, external_id")
      .eq("tenant_id", tenantId)
      .in("external_id", jobExternalIds)
      .is("deleted_at", null);

    if (jobs) {
      for (const job of jobs) {
        jobMap.set(job.external_id, job.id);
      }
    }
  }

  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const part of parts) {
    try {
      // Validate required fields
      if (!part.external_id || !part.external_source) {
        results.push({
          external_id: part.external_id,
          action: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!part.part_number) {
        results.push({
          external_id: part.external_id,
          action: "error",
          error: "part_number is required",
        });
        errors++;
        continue;
      }

      // Resolve job_id
      let jobId = part.job_id;
      if (!jobId && part.job_external_id) {
        jobId = jobMap.get(part.job_external_id);
      }

      if (!jobId) {
        results.push({
          external_id: part.external_id,
          action: "error",
          error: "job_id or valid job_external_id is required",
        });
        errors++;
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from("parts")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("external_source", part.external_source)
        .eq("external_id", part.external_id)
        .is("deleted_at", null)
        .maybeSingle();

      const syncHash = await generateSyncHash(part);
      const now = new Date().toISOString();

      if (existing) {
        // Update
        const { data: updated_part, error } = await supabase
          .from("parts")
          .update({
            job_id: jobId,
            part_number: part.part_number,
            material: part.material || "Unknown",
            quantity: part.quantity || 1,
            notes: part.notes,
            metadata: part.metadata,
            synced_at: now,
            sync_hash: syncHash,
            updated_at: now,
          })
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: part.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: part.external_id,
            id: updated_part.id,
            action: "updated",
          });
          updated++;
        }
      } else {
        // Create
        const { data: new_part, error } = await supabase
          .from("parts")
          .insert({
            tenant_id: tenantId,
            job_id: jobId,
            part_number: part.part_number,
            material: part.material || "Unknown",
            quantity: part.quantity || 1,
            notes: part.notes,
            metadata: part.metadata,
            status: part.status || "not_started",
            external_id: part.external_id,
            external_source: part.external_source,
            synced_at: now,
            sync_hash: syncHash,
          })
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: part.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: part.external_id,
            id: new_part.id,
            action: "created",
          });
          created++;
        }
      }
    } catch (err: any) {
      results.push({
        external_id: part.external_id,
        action: "error",
        error: err.message || "Unknown error",
      });
      errors++;
    }
  }

  // Log the import
  await supabase.from("sync_imports").insert({
    tenant_id: tenantId,
    source: "api",
    entity_type: "parts",
    status: errors > 0 ? (created + updated > 0 ? "completed" : "failed") : "completed",
    total_records: parts.length,
    created_count: created,
    updated_count: updated,
    error_count: errors,
    errors: errors > 0 ? results.filter(r => r.action === "error") : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return createSuccessResponse({
    total: parts.length,
    created,
    updated,
    errors,
    results,
  });
}

/**
 * Helper function to generate sync hash (using SHA-256 for Web Crypto API compatibility)
 */
async function generateSyncHash(payload: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 32 chars (128 bits) for brevity, similar to MD5 output length
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}
