import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
import { authenticateAndSetContext } from "../_shared/auth.ts";
import { JobValidator } from "../_shared/validation/validators/JobValidator.ts";
import {
  collectJobForeignKeys,
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

    // Route: PUT /api-jobs/sync - Upsert by external_id
    if (lastSegment === "sync" && req.method === "PUT") {
      return await handleSyncJob(req, supabase, tenantId);
    }

    // Route: POST /api-jobs/bulk-sync - Bulk upsert
    if (lastSegment === "bulk-sync" && req.method === "POST") {
      return await handleBulkSyncJobs(req, supabase, tenantId);
    }

    // Route by HTTP method for standard CRUD
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
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE", "PUT"]);
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

/**
 * PUT /api-jobs/sync - Upsert job by external_id
 * Creates or updates a job based on external_id from ERP system
 */
async function handleSyncJob(
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

  if (!body.job_number) {
    throw new BadRequestError("job_number is required");
  }

  // Check if record exists by external_id
  const { data: existing } = await supabase
    .from("jobs")
    .select("id, job_number, status")
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
      job_number: body.job_number,
      customer: body.customer_name || body.customer,
      due_date: body.due_date,
      priority: body.priority,
      notes: body.notes || body.description,
      metadata: body.metadata,
      synced_at: now,
      sync_hash: syncHash,
      updated_at: now,
    };

    // Only update status if explicitly provided and different
    if (body.status && body.status !== existing.status) {
      updates.status = body.status;
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update job: ${error.message}`);
    }

    // Sync nested parts if provided
    if (body.parts && Array.isArray(body.parts)) {
      await syncNestedParts(supabase, tenantId, job.id, body.parts, body.external_source);
    }

    return createSuccessResponse({
      action: "updated",
      job,
    });
  } else {
    // Check plan limits
    const jobQuotaCheck = await canCreateJob(supabase, tenantId);
    if (!jobQuotaCheck.allowed) {
      throw new PaymentRequiredError(
        "job",
        jobQuotaCheck.current || 0,
        jobQuotaCheck.limit || 0,
      );
    }

    // CREATE new record
    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        tenant_id: tenantId,
        job_number: body.job_number,
        customer: body.customer_name || body.customer,
        due_date: body.due_date,
        priority: body.priority || 0,
        notes: body.notes || body.description,
        metadata: body.metadata,
        status: body.status || "not_started",
        external_id: body.external_id,
        external_source: body.external_source,
        synced_at: now,
        sync_hash: syncHash,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    // Create nested parts if provided
    if (body.parts && Array.isArray(body.parts)) {
      await syncNestedParts(supabase, tenantId, job.id, body.parts, body.external_source);
    }

    return createSuccessResponse({
      action: "created",
      job,
    }, 201);
  }
}

/**
 * Sync nested parts for a job
 */
async function syncNestedParts(
  supabase: any,
  tenantId: string,
  jobId: string,
  parts: any[],
  externalSource: string,
): Promise<void> {
  for (const part of parts) {
    if (!part.external_id || !part.part_number) {
      continue; // Skip parts without required fields
    }

    // Check if part exists
    const { data: existingPart } = await supabase
      .from("parts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("external_source", externalSource)
      .eq("external_id", part.external_id)
      .is("deleted_at", null)
      .maybeSingle();

    const now = new Date().toISOString();
    let partId: string;

    if (existingPart) {
      // Update part
      const { data: updatedPart } = await supabase
        .from("parts")
        .update({
          job_id: jobId,
          part_number: part.part_number,
          material: part.material || "Unknown",
          quantity: part.quantity || 1,
          notes: part.notes,
          metadata: part.metadata,
          synced_at: now,
          updated_at: now,
        })
        .eq("id", existingPart.id)
        .select("id")
        .single();
      partId = updatedPart?.id;
    } else {
      // Create part
      const { data: newPart } = await supabase
        .from("parts")
        .insert({
          tenant_id: tenantId,
          job_id: jobId,
          part_number: part.part_number,
          material: part.material || "Unknown",
          quantity: part.quantity || 1,
          notes: part.notes,
          metadata: part.metadata,
          status: "not_started",
          external_id: part.external_id,
          external_source: externalSource,
          synced_at: now,
        })
        .select("id")
        .single();
      partId = newPart?.id;
    }

    // Sync nested operations if provided
    if (partId && part.operations && Array.isArray(part.operations)) {
      await syncNestedOperations(supabase, tenantId, partId, part.operations, externalSource);
    }
  }
}

/**
 * Sync nested operations for a part
 */
async function syncNestedOperations(
  supabase: any,
  tenantId: string,
  partId: string,
  operations: any[],
  externalSource: string,
): Promise<void> {
  for (const op of operations) {
    if (!op.external_id || !op.operation_name) {
      continue; // Skip operations without required fields
    }

    // Lookup cell by name if provided
    let cellId = op.cell_id;
    if (!cellId && op.cell_name) {
      const { data: cell } = await supabase
        .from("cells")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", op.cell_name)
        .maybeSingle();
      cellId = cell?.id;
    }

    if (!cellId) {
      continue; // Skip if no valid cell
    }

    // Check if operation exists
    const { data: existingOp } = await supabase
      .from("operations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("external_source", externalSource)
      .eq("external_id", op.external_id)
      .is("deleted_at", null)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existingOp) {
      // Update operation
      await supabase
        .from("operations")
        .update({
          part_id: partId,
          cell_id: cellId,
          operation_name: op.operation_name,
          sequence: op.sequence || 1,
          estimated_time: op.estimated_time_minutes || op.estimated_time || 0,
          notes: op.notes,
          synced_at: now,
          updated_at: now,
        })
        .eq("id", existingOp.id);
    } else {
      // Create operation
      await supabase
        .from("operations")
        .insert({
          tenant_id: tenantId,
          part_id: partId,
          cell_id: cellId,
          operation_name: op.operation_name,
          sequence: op.sequence || 1,
          estimated_time: op.estimated_time_minutes || op.estimated_time || 0,
          notes: op.notes,
          status: "not_started",
          external_id: op.external_id,
          external_source: externalSource,
          synced_at: now,
        });
    }
  }
}

/**
 * POST /api-jobs/bulk-sync - Bulk upsert jobs
 */
async function handleBulkSyncJobs(
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

  const { jobs, options = {} } = body;

  if (!Array.isArray(jobs)) {
    throw new BadRequestError("jobs must be an array");
  }

  if (jobs.length === 0) {
    return createSuccessResponse({
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      results: [],
    });
  }

  if (jobs.length > 1000) {
    throw new BadRequestError("Maximum 1000 jobs per bulk-sync request");
  }

  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const job of jobs) {
    try {
      // Validate required fields
      if (!job.external_id || !job.external_source) {
        results.push({
          external_id: job.external_id,
          action: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!job.job_number) {
        results.push({
          external_id: job.external_id,
          action: "error",
          error: "job_number is required",
        });
        errors++;
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from("jobs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("external_source", job.external_source)
        .eq("external_id", job.external_id)
        .is("deleted_at", null)
        .maybeSingle();

      const syncHash = await generateSyncHash(job);
      const now = new Date().toISOString();

      if (existing) {
        // Update
        const { data: updated_job, error } = await supabase
          .from("jobs")
          .update({
            job_number: job.job_number,
            customer: job.customer_name || job.customer,
            due_date: job.due_date,
            priority: job.priority,
            notes: job.notes || job.description,
            metadata: job.metadata,
            synced_at: now,
            sync_hash: syncHash,
            updated_at: now,
          })
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: job.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          // Sync nested parts if provided
          if (job.parts && Array.isArray(job.parts)) {
            await syncNestedParts(supabase, tenantId, updated_job.id, job.parts, job.external_source);
          }
          results.push({
            external_id: job.external_id,
            id: updated_job.id,
            action: "updated",
          });
          updated++;
        }
      } else {
        // Create
        const { data: new_job, error } = await supabase
          .from("jobs")
          .insert({
            tenant_id: tenantId,
            job_number: job.job_number,
            customer: job.customer_name || job.customer,
            due_date: job.due_date,
            priority: job.priority || 0,
            notes: job.notes || job.description,
            metadata: job.metadata,
            status: job.status || "not_started",
            external_id: job.external_id,
            external_source: job.external_source,
            synced_at: now,
            sync_hash: syncHash,
          })
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: job.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          // Create nested parts if provided
          if (job.parts && Array.isArray(job.parts)) {
            await syncNestedParts(supabase, tenantId, new_job.id, job.parts, job.external_source);
          }
          results.push({
            external_id: job.external_id,
            id: new_job.id,
            action: "created",
          });
          created++;
        }
      }
    } catch (err: any) {
      results.push({
        external_id: job.external_id,
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
    entity_type: "jobs",
    status: errors > 0 ? (created + updated > 0 ? "completed" : "failed") : "completed",
    total_records: jobs.length,
    created_count: created,
    updated_count: updated,
    error_count: errors,
    errors: errors > 0 ? results.filter(r => r.action === "error") : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return createSuccessResponse({
    total: jobs.length,
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
