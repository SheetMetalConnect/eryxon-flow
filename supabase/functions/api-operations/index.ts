/**
 * Operations API Endpoint
 *
 * RESTful API for managing manufacturing operations with comprehensive validation.
 *
 * Supported Methods:
 * - GET: Retrieve operations with filtering, sorting, and pagination
 * - POST: Create new operations
 * - PATCH: Update operation fields
 * - DELETE: Delete operations (with safety checks)
 *
 * Query Parameters (GET):
 * - part_id, job_id, cell_id, cell_name, status, assigned_operator_id, search
 * - sort_by, sort_order, limit, offset, include_count
 *
 * Authentication:
 * - Requires API key: "Bearer ery_live_xxx" or "Bearer ery_test_xxx"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
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
  BadRequestError,
} from "../_shared/validation/errorHandler.ts";
import { OperationValidator } from "../_shared/validation/validators/OperationValidator.ts";
import {
  collectOperationForeignKeys,
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

    // Check for sync endpoints
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Route: PUT /api-operations/sync - Upsert by external_id
    if (lastSegment === "sync" && req.method === "PUT") {
      return await handleSyncOperation(req, supabase, tenantId);
    }

    // Route: POST /api-operations/bulk-sync - Bulk upsert
    if (lastSegment === "bulk-sync" && req.method === "POST") {
      return await handleBulkSyncOperations(req, supabase, tenantId);
    }

    // Route by HTTP method for standard CRUD
    switch (req.method) {
      case "GET":
        return await handleGetOperations(req, supabase, tenantId);
      case "POST":
        return await handleCreateOperation(req, supabase, tenantId);
      case "PATCH":
        return await handleUpdateOperation(req, supabase, tenantId);
      case "DELETE":
        return await handleDeleteOperation(req, supabase, tenantId);
      default:
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE", "PUT"]);
    }
  } catch (error) {
    return handleError(error);
  }
});

/**
 * GET /api-operations - List operations with filtering and pagination
 */
async function handleGetOperations(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);

  // Query parameters
  const partId = url.searchParams.get("part_id");
  const jobId = url.searchParams.get("job_id");
  const cellId = url.searchParams.get("cell_id");
  const cellName = url.searchParams.get("cell_name");
  const status = url.searchParams.get("status");
  const assignedOperatorId = url.searchParams.get("assigned_operator_id");
  const search = url.searchParams.get("search");
  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") || "desc";
  const includeCount = url.searchParams.get("include_count") === "true";

  // Pagination (with limits)
  let limit = parseInt(url.searchParams.get("limit") || "100");
  if (limit < 1) limit = 100;
  if (limit > 1000) limit = 1000;

  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Validate sort parameters
  const validSortFields = [
    "sequence",
    "created_at",
    "estimated_time",
    "actual_time",
    "status",
    "completion_percentage",
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";
  const ascending = sortOrder === "asc";

  // Build query
  let query = supabase
    .from("operations")
    .select(
      `
      id,
      operation_name,
      sequence,
      estimated_time,
      actual_time,
      status,
      completion_percentage,
      notes,
      completed_at,
      created_at,
      updated_at,
      part:parts (
        id,
        part_number,
        material,
        job:jobs (
          id,
          job_number,
          customer
        )
      ),
      cell:cells (
        id,
        name,
        color,
        sequence
      ),
      assigned_operator:profiles (
        id,
        username,
        full_name
      ),
      time_entries (
        id,
        start_time,
        end_time,
        duration
      )
    `,
      { count: includeCount ? "exact" : undefined },
    )
    .eq("tenant_id", tenantId)
    .order(sortField, { ascending })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (partId) {
    query = query.eq("part_id", partId);
  }
  if (cellId) {
    query = query.eq("cell_id", cellId);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (assignedOperatorId) {
    query = query.eq("assigned_operator_id", assignedOperatorId);
  }
  if (search) {
    query = query.ilike("operation_name", `%${search}%`);
  }

  // Filter by job_id (requires finding parts first)
  if (jobId) {
    const { data: parts } = await supabase
      .from("parts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("job_id", jobId);

    if (parts && parts.length > 0) {
      query = query.in("part_id", parts.map((p: any) => p.id));
    } else {
      return createSuccessResponse([], 200, {
        pagination: { limit, offset, total: 0, has_more: false },
        filters_applied: { job_id: jobId },
      });
    }
  }

  // Filter by cell_name (requires finding cell first)
  if (cellName) {
    const { data: cells } = await supabase
      .from("cells")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${cellName}%`);

    if (cells && cells.length > 0) {
      query = query.in("cell_id", cells.map((c: any) => c.id));
    } else {
      return createSuccessResponse([], 200, {
        pagination: { limit, offset, total: 0, has_more: false },
        filters_applied: { cell_name: cellName },
      });
    }
  }

  const { data: operations, error, count } = await query;

  if (error) {
    console.error("Operations query error:", error);
    throw new Error(`Failed to fetch operations: ${error.message}`);
  }

  // Add cache headers for performance
  const response = createSuccessResponse(
    operations || [],
    200,
    {
      pagination: {
        limit,
        offset,
        total: count !== null ? count : (operations?.length || 0),
        has_more: operations && operations.length === limit,
      },
      filters_applied: {
        part_id: partId,
        job_id: jobId,
        cell_id: cellId,
        cell_name: cellName,
        status,
        assigned_operator_id: assignedOperatorId,
        search,
      },
      sort: { field: sortField, order: sortOrder },
    },
  );

  // Add cache-control header
  response.headers.set(
    "Cache-Control",
    "public, max-age=5, stale-while-revalidate=10",
  );

  return response;
}

/**
 * POST /api-operations - Create new operation
 */
async function handleCreateOperation(
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

  // Collect foreign key IDs
  const fkIds = collectOperationForeignKeys(body);

  // Batch fetch valid IDs
  const [validPartIds, validCellIds, validOperatorIds] = await Promise.all([
    fetchValidIds(supabase, "parts", fkIds.partIds, tenantId),
    fetchValidIds(supabase, "cells", fkIds.cellIds, tenantId),
    fetchValidIds(supabase, "profiles", fkIds.operatorIds, tenantId),
  ]);

  // Build validation context
  const context: ValidationContext = {
    validPartIds,
    validCellIds,
    validOperatorIds,
    tenantId,
  };

  // Validate request
  const validator = new OperationValidator();
  const validationResult = validator.validate(body, context);

  if (!validationResult.valid) {
    throw new ValidationException(validationResult);
  }

  // Get the next sequence number if not provided
  let sequence = body.sequence;
  if (sequence === undefined) {
    const { data: maxSeqOp } = await supabase
      .from("operations")
      .select("sequence")
      .eq("part_id", body.part_id)
      .eq("tenant_id", tenantId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    sequence = (maxSeqOp?.sequence ?? 0) + 1;
  }

  // Create operation
  const { data: operation, error: operationError } = await supabase
    .from("operations")
    .insert({
      tenant_id: tenantId,
      part_id: body.part_id,
      cell_id: body.cell_id,
      operation_name: body.operation_name,
      sequence,
      estimated_time: body.estimated_time_minutes,
      setup_time: body.setup_time_minutes,
      notes: body.instructions || body.notes,
      assigned_operator_id: body.assigned_operator_id,
      status: body.status || "not_started",
    })
    .select()
    .single();

  if (operationError || !operation) {
    throw new Error(`Failed to create operation: ${operationError?.message}`);
  }

  return createSuccessResponse(operation, 201);
}

/**
 * PATCH /api-operations?id={operationId} - Update operation
 */
async function handleUpdateOperation(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const operationId = url.searchParams.get("id");

  if (!operationId) {
    throw new BadRequestError(
      "Operation ID is required in query string (?id=xxx)",
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
    "completion_percentage",
    "notes",
    "assigned_operator_id",
    "actual_time",
    "cell_id",
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
  if (updates.assigned_operator_id !== undefined || updates.cell_id !== undefined) {
    const operatorIds = updates.assigned_operator_id ? [updates.assigned_operator_id] : [];
    const cellIds = updates.cell_id ? [updates.cell_id] : [];

    const [validOperatorIds, validCellIds] = await Promise.all([
      operatorIds.length > 0
        ? fetchValidIds(supabase, "profiles", operatorIds, tenantId)
        : Promise.resolve([]),
      cellIds.length > 0
        ? fetchValidIds(supabase, "cells", cellIds, tenantId)
        : Promise.resolve([]),
    ]);

    if (
      updates.assigned_operator_id &&
      updates.assigned_operator_id !== null &&
      !validOperatorIds.includes(updates.assigned_operator_id)
    ) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "assigned_operator_id",
          message: "Invalid operator ID",
          constraint: "FK_CONSTRAINT",
          entityType: "operation",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "assigned_operator_id references non-existent operator",
      });
    }

    if (updates.cell_id && !validCellIds.includes(updates.cell_id)) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "cell_id",
          message: "Invalid cell ID",
          constraint: "FK_CONSTRAINT",
          entityType: "operation",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "cell_id references non-existent cell",
      });
    }
  }

  // Auto-set completed_at if status changes to completed
  if (updates.status === "completed" && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  updates.updated_at = new Date().toISOString();

  // Update operation
  const { data: operation, error } = await supabase
    .from("operations")
    .update(updates)
    .eq("id", operationId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update operation: ${error.message}`);
  }

  if (!operation) {
    throw new NotFoundError("Operation", operationId);
  }

  return createSuccessResponse(operation, 200);
}

/**
 * DELETE /api-operations?id={operationId} - Delete operation
 */
async function handleDeleteOperation(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const operationId = url.searchParams.get("id");

  if (!operationId) {
    throw new BadRequestError(
      "Operation ID is required in query string (?id=xxx)",
    );
  }

  // Check if operation has time entries
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("id")
    .eq("operation_id", operationId)
    .limit(1);

  if (timeEntries && timeEntries.length > 0) {
    throw new ConflictError(
      "operation",
      "time_entries",
      "Cannot delete operation with time entries",
    );
  }

  // Verify operation exists
  const { data: operation } = await supabase
    .from("operations")
    .select("id")
    .eq("id", operationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!operation) {
    throw new NotFoundError("Operation", operationId);
  }

  // Delete operation
  const { error } = await supabase
    .from("operations")
    .delete()
    .eq("id", operationId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to delete operation: ${error.message}`);
  }

  return createSuccessResponse(
    { message: "Operation deleted successfully", operation_id: operationId },
    200,
  );
}

/**
 * PUT /api-operations/sync - Upsert operation by external_id
 */
async function handleSyncOperation(
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

  if (!body.operation_name) {
    throw new BadRequestError("operation_name is required");
  }

  // Resolve part_id - either by ID or by external_id
  let partId = body.part_id;
  if (!partId && body.part_external_id) {
    const { data: part } = await supabase
      .from("parts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("external_source", body.external_source)
      .eq("external_id", body.part_external_id)
      .is("deleted_at", null)
      .maybeSingle();
    partId = part?.id;
  }

  if (!partId) {
    throw new BadRequestError("part_id or part_external_id is required");
  }

  // Resolve cell_id - either by ID or by name
  let cellId = body.cell_id;
  if (!cellId && body.cell_name) {
    const { data: cell } = await supabase
      .from("cells")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", body.cell_name)
      .maybeSingle();
    cellId = cell?.id;
  }

  if (!cellId) {
    throw new BadRequestError("cell_id or cell_name is required");
  }

  // Check if record exists by external_id
  const { data: existing } = await supabase
    .from("operations")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("external_source", body.external_source)
    .eq("external_id", body.external_id)
    .is("deleted_at", null)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    // UPDATE existing record
    const updates: any = {
      part_id: partId,
      cell_id: cellId,
      operation_name: body.operation_name,
      sequence: body.sequence || 1,
      estimated_time: body.estimated_time_minutes || body.estimated_time || 0,
      notes: body.notes,
      synced_at: now,
      updated_at: now,
    };

    // Only update status if explicitly provided
    if (body.status && body.status !== existing.status) {
      updates.status = body.status;
    }

    // Handle optional operator assignment
    if (body.assigned_operator_id) {
      updates.assigned_operator_id = body.assigned_operator_id;
    }

    const { data: operation, error } = await supabase
      .from("operations")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update operation: ${error.message}`);
    }

    return createSuccessResponse({
      action: "updated",
      operation,
    });
  } else {
    // CREATE new record
    const { data: operation, error } = await supabase
      .from("operations")
      .insert({
        tenant_id: tenantId,
        part_id: partId,
        cell_id: cellId,
        operation_name: body.operation_name,
        sequence: body.sequence || 1,
        estimated_time: body.estimated_time_minutes || body.estimated_time || 0,
        notes: body.notes,
        status: body.status || "not_started",
        assigned_operator_id: body.assigned_operator_id,
        external_id: body.external_id,
        external_source: body.external_source,
        synced_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create operation: ${error.message}`);
    }

    return createSuccessResponse({
      action: "created",
      operation,
    }, 201);
  }
}

/**
 * POST /api-operations/bulk-sync - Bulk upsert operations
 */
async function handleBulkSyncOperations(
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

  const { operations, options = {} } = body;

  if (!Array.isArray(operations)) {
    throw new BadRequestError("operations must be an array");
  }

  if (operations.length === 0) {
    return createSuccessResponse({
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      results: [],
    });
  }

  if (operations.length > 1000) {
    throw new BadRequestError("Maximum 1000 operations per bulk-sync request");
  }

  // Pre-fetch part mappings for external IDs
  const partExternalIds = [...new Set(operations.filter(o => o.part_external_id).map(o => o.part_external_id))];
  const partMap = new Map<string, string>();

  if (partExternalIds.length > 0) {
    const { data: parts } = await supabase
      .from("parts")
      .select("id, external_id")
      .eq("tenant_id", tenantId)
      .in("external_id", partExternalIds)
      .is("deleted_at", null);

    if (parts) {
      for (const part of parts) {
        partMap.set(part.external_id, part.id);
      }
    }
  }

  // Pre-fetch cell mappings for names
  const cellNames = [...new Set(operations.filter(o => o.cell_name).map(o => o.cell_name))];
  const cellMap = new Map<string, string>();

  if (cellNames.length > 0) {
    const { data: cells } = await supabase
      .from("cells")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("name", cellNames);

    if (cells) {
      for (const cell of cells) {
        cellMap.set(cell.name, cell.id);
      }
    }
  }

  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const op of operations) {
    try {
      // Validate required fields
      if (!op.external_id || !op.external_source) {
        results.push({
          external_id: op.external_id,
          action: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!op.operation_name) {
        results.push({
          external_id: op.external_id,
          action: "error",
          error: "operation_name is required",
        });
        errors++;
        continue;
      }

      // Resolve part_id
      let partId = op.part_id;
      if (!partId && op.part_external_id) {
        partId = partMap.get(op.part_external_id);
      }

      if (!partId) {
        results.push({
          external_id: op.external_id,
          action: "error",
          error: "part_id or valid part_external_id is required",
        });
        errors++;
        continue;
      }

      // Resolve cell_id
      let cellId = op.cell_id;
      if (!cellId && op.cell_name) {
        cellId = cellMap.get(op.cell_name);
      }

      if (!cellId) {
        results.push({
          external_id: op.external_id,
          action: "error",
          error: "cell_id or valid cell_name is required",
        });
        errors++;
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from("operations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("external_source", op.external_source)
        .eq("external_id", op.external_id)
        .is("deleted_at", null)
        .maybeSingle();

      const now = new Date().toISOString();

      if (existing) {
        // Update
        const { data: updated_op, error } = await supabase
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
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: op.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: op.external_id,
            id: updated_op.id,
            action: "updated",
          });
          updated++;
        }
      } else {
        // Create
        const { data: new_op, error } = await supabase
          .from("operations")
          .insert({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellId,
            operation_name: op.operation_name,
            sequence: op.sequence || 1,
            estimated_time: op.estimated_time_minutes || op.estimated_time || 0,
            notes: op.notes,
            status: op.status || "not_started",
            assigned_operator_id: op.assigned_operator_id,
            external_id: op.external_id,
            external_source: op.external_source,
            synced_at: now,
          })
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: op.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: op.external_id,
            id: new_op.id,
            action: "created",
          });
          created++;
        }
      }
    } catch (err: any) {
      results.push({
        external_id: op.external_id,
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
    entity_type: "operations",
    status: errors > 0 ? (created + updated > 0 ? "completed" : "failed") : "completed",
    total_records: operations.length,
    created_count: created,
    updated_count: updated,
    error_count: errors,
    errors: errors > 0 ? results.filter(r => r.action === "error") : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return createSuccessResponse({
    total: operations.length,
    created,
    updated,
    errors,
    results,
  });
}
