import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
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
import { PartValidator } from "../_shared/validation/validators/PartValidator.ts";
import {
  collectPartForeignKeys,
  fetchValidIds,
} from "../_shared/validation/fkValidator.ts";
import type { ValidationContext } from "../_shared/validation/types.ts";

async function authenticateApiKey(
  authHeader: string | null,
  supabase: any,
): Promise<string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith("ery_live_") && !apiKey.startsWith("ery_test_")) {
    throw new UnauthorizedError("Invalid API key format");
  }

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, tenant_id")
    .eq("active", true);

  if (!keys || keys.length === 0) {
    throw new UnauthorizedError("No active API keys found");
  }

  for (const key of keys) {
    const { data: fullKey } = await supabase
      .from("api_keys")
      .select("key_hash, tenant_id")
      .eq("id", key.id)
      .single();

    if (fullKey && (await bcrypt.compare(apiKey, fullKey.key_hash))) {
      await supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id);

      return fullKey.tenant_id;
    }
  }

  throw new UnauthorizedError("Invalid API key");
}

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
    // Authenticate
    const tenantId = await authenticateApiKey(
      req.headers.get("authorization"),
      supabase,
    );

    // Set tenant context for RLS
    await supabase.rpc("set_active_tenant", { p_tenant_id: tenantId });

    // Route by HTTP method
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
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE"]);
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
