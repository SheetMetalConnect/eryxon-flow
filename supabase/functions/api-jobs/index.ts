import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import {
  canCreateJob,
  canCreateParts,
  createLimitErrorResponse,
} from "../_shared/plan-limits.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createErrorResponse,
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
import { JobValidator } from "../_shared/validation/validators/JobValidator.ts";
import {
  collectJobForeignKeys,
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
        return await handleGetJobs(req, supabase, tenantId);
      case "POST":
        return await handleCreateJob(req, supabase, tenantId);
      case "PATCH":
        return await handleUpdateJob(req, supabase, tenantId);
      case "DELETE":
        return await handleDeleteJob(req, supabase, tenantId);
      default:
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE"]);
    }
  } catch (error) {
    return handleError(error);
  }
});

/**
 * GET /api-jobs - List jobs with filtering and pagination
 */
async function handleGetJobs(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);

  // Query parameters
  const status = url.searchParams.get("status");
  const customer = url.searchParams.get("customer");
  const jobNumber = url.searchParams.get("job_number");

  // Pagination (with limits)
  let limit = parseInt(url.searchParams.get("limit") || "100");
  if (limit < 1) limit = 100;
  if (limit > 1000) limit = 1000;

  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Build query
  let query = supabase
    .from("jobs")
    .select(
      `
      id,
      job_number,
      customer,
      due_date,
      due_date_override,
      status,
      priority,
      notes,
      metadata,
      created_at,
      updated_at,
      parts (
        id,
        part_number,
        material,
        quantity,
        status,
        file_paths,
        notes,
        metadata
      )
    `,
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) {
    query = query.eq("status", status);
  }
  if (customer) {
    query = query.ilike("customer", `%${customer}%`);
  }
  if (jobNumber) {
    query = query.ilike("job_number", `%${jobNumber}%`);
  }

  const { data: jobs, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  return createSuccessResponse(
    jobs || [],
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
 * POST /api-jobs - Create new job with parts and operations
 */
async function handleCreateJob(
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
  const jobQuotaCheck = await canCreateJob(supabase, tenantId);
  if (!jobQuotaCheck.allowed) {
    throw new PaymentRequiredError(
      "job",
      jobQuotaCheck.current || 0,
      jobQuotaCheck.limit || 0,
    );
  }

  // Check parts quota
  const totalPartsQuantity = body.parts?.reduce(
    (sum: number, part: any) => sum + (part.quantity || 1),
    0,
  ) || 0;
  const partsQuotaCheck = await canCreateParts(
    supabase,
    tenantId,
    totalPartsQuantity,
  );
  if (!partsQuotaCheck.allowed) {
    throw new PaymentRequiredError(
      "part",
      partsQuotaCheck.current || 0,
      partsQuotaCheck.limit || 0,
    );
  }

  // Collect foreign key IDs from request
  const fkIds = collectJobForeignKeys(body);

  // Batch fetch valid IDs
  const [validCellIds, validOperatorIds, validMaterialIds, validResourceIds] =
    await Promise.all([
      fetchValidIds(supabase, "cells", fkIds.cellIds, tenantId),
      fetchValidIds(supabase, "profiles", fkIds.operatorIds, tenantId),
      fetchValidIds(supabase, "materials", fkIds.materialIds, tenantId),
      fetchValidIds(supabase, "resources", fkIds.resourceIds, tenantId),
    ]);

  // Build validation context
  const context: ValidationContext = {
    validCellIds,
    validOperatorIds,
    validMaterialIds,
    validResourceIds,
    tenantId,
  };

  // Validate request
  const validator = new JobValidator();
  const validationResult = validator.validate(body, context);

  if (!validationResult.valid) {
    throw new ValidationException(validationResult);
  }

  // Check for duplicate job number
  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("job_number", body.job_number)
    .maybeSingle();

  if (existingJob) {
    throw new ConflictError("job", "job_number", body.job_number);
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      tenant_id: tenantId,
      job_number: body.job_number,
      customer: body.customer_name,
      due_date: body.due_date,
      priority: body.priority || 0,
      notes: body.description,
      metadata: body.metadata,
      current_cell_id: body.current_cell_id,
      status: body.status || "not_started",
    })
    .select()
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create job: ${jobError?.message}`);
  }

  // Create parts
  const partsToCreate = body.parts.map((p: any) => ({
    tenant_id: tenantId,
    job_id: job.id,
    part_number: p.part_number,
    material: p.material,
    quantity: p.quantity || 1,
    file_paths: p.file_paths,
    notes: p.notes || p.description,
    metadata: p.metadata,
    current_cell_id: p.current_cell_id,
    material_id: p.material_id,
    status: "not_started",
  }));

  const { data: createdParts, error: partsError } = await supabase
    .from("parts")
    .insert(partsToCreate)
    .select();

  if (partsError || !createdParts) {
    throw new Error(`Failed to create parts: ${partsError?.message}`);
  }

  // Map part numbers to IDs
  const partMap = new Map(createdParts.map((p: any) => [p.part_number, p.id]));

  // Update parent_part_id for parts with parent_part_number
  for (const part of body.parts) {
    if (part.parent_part_number) {
      const parentId = partMap.get(part.parent_part_number);
      const childId = partMap.get(part.part_number);
      if (parentId && childId) {
        // Check for circular reference
        if (parentId === childId) {
          throw new ValidationException({
            valid: false,
            severity: "error" as any,
            httpStatus: 422,
            errors: [{
              field: "parent_part_id",
              message: "Part cannot be its own parent",
              constraint: "CIRCULAR_REFERENCE",
              entityType: "part",
            }],
            warnings: [],
            summary: "Circular reference detected",
            technicalDetails: "Part cannot reference itself as parent",
          });
        }

        await supabase
          .from("parts")
          .update({ parent_part_id: parentId })
          .eq("id", childId);
      }
    }
  }

  // Create operations
  const operationsToCreate = [];
  for (const part of body.parts) {
    const partId = partMap.get(part.part_number);
    if (!partId) continue;

    for (const operation of part.operations) {
      operationsToCreate.push({
        tenant_id: tenantId,
        part_id: partId,
        cell_id: operation.cell_id,
        assigned_operator_id: operation.assigned_operator_id,
        operation_name: operation.operation_name,
        sequence: operation.sequence,
        estimated_time: operation.estimated_time_minutes,
        setup_time: operation.setup_time_minutes,
        notes: operation.instructions,
        status: "not_started",
      });
    }
  }

  const { data: createdOperations, error: operationsError } = await supabase
    .from("operations")
    .insert(operationsToCreate)
    .select();

  if (operationsError) {
    throw new Error(`Failed to create operations: ${operationsError?.message}`);
  }

  // Create operation resources (if specified)
  if (createdOperations && createdOperations.length > 0) {
    const resourceMappings = [];
    for (const part of body.parts) {
      for (const operation of part.operations) {
        if (operation.resources && Array.isArray(operation.resources)) {
          const createdOp = createdOperations.find(
            (op: any) =>
              op.part_id === partMap.get(part.part_number) &&
              op.sequence === operation.sequence,
          );
          if (createdOp) {
            for (const resource of operation.resources) {
              resourceMappings.push({
                operation_id: createdOp.id,
                resource_id: resource.resource_id,
                quantity: resource.quantity || 1,
              });
            }
          }
        }
      }
    }

    if (resourceMappings.length > 0) {
      await supabase
        .from("operation_resources")
        .insert(resourceMappings);
    }
  }

  // Trigger webhook for job created
  try {
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-dispatch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
          }`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          event_type: "job.created",
          data: {
            job_id: job.id,
            job_number: job.job_number,
            customer: job.customer || "",
            parts_count: createdParts.length,
            operations_count: createdOperations?.length || 0,
            created_at: job.created_at,
          },
        }),
      },
    );
  } catch (webhookError) {
    console.error("Failed to trigger job.created webhook:", webhookError);
    // Don't fail the job creation if webhook fails
  }

  // Build response
  const responseData = {
    job_id: job.id,
    job_number: job.job_number,
    status: job.status,
    created_at: job.created_at,
    parts: createdParts.map((p: any) => ({
      part_id: p.id,
      part_number: p.part_number,
      operations: createdOperations
        ?.filter((o: any) => o.part_id === p.id)
        .map((o: any) => ({
          operation_id: o.id,
          operation_name: o.operation_name,
          sequence: o.sequence,
        })) || [],
    })),
  };

  return createSuccessResponse(responseData, 201);
}

/**
 * PATCH /api-jobs?id={jobId} - Update job
 */
async function handleUpdateJob(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("id");

  if (!jobId) {
    throw new BadRequestError(
      "Job ID is required in query string (?id=xxx)",
    );
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
    "customer",
    "due_date",
    "due_date_override",
    "priority",
    "notes",
    "metadata",
    "current_cell_id",
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

  // Validate current_cell_id if provided
  if (updates.current_cell_id) {
    const validCellIds = await fetchValidIds(
      supabase,
      "cells",
      [updates.current_cell_id],
      tenantId,
    );
    if (!validCellIds.includes(updates.current_cell_id)) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "current_cell_id",
          message: "Invalid cell ID",
          constraint: "FK_CONSTRAINT",
          entityType: "job",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "current_cell_id references non-existent cell",
      });
    }
  }

  updates.updated_at = new Date().toISOString();

  // Update job
  const { data: job, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", jobId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }

  if (!job) {
    throw new NotFoundError("Job", jobId);
  }

  return createSuccessResponse(job, 200);
}

/**
 * DELETE /api-jobs?id={jobId} - Delete job
 */
async function handleDeleteJob(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("id");

  if (!jobId) {
    throw new BadRequestError(
      "Job ID is required in query string (?id=xxx)",
    );
  }

  // Verify job exists and belongs to tenant
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!job) {
    throw new NotFoundError("Job", jobId);
  }

  // Delete job (cascade will delete parts and operations)
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to delete job: ${error.message}`);
  }

  return createSuccessResponse(
    { message: "Job deleted successfully", job_id: jobId },
    200,
  );
}
