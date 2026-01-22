import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";
import { OperationValidator } from "../_shared/validation/validators/OperationValidator.ts";
import type { HandlerContext } from "../_shared/handler.ts";
import {
  ConflictError,
  NotFoundError,
  ValidationException,
  BadRequestError,
  createSuccessResponse,
} from "../_shared/validation/errorHandler.ts";
import {
  collectOperationForeignKeys,
  fetchValidIds,
} from "../_shared/validation/fkValidator.ts";
import type { ValidationContext } from "../_shared/validation/types.ts";

// Custom POST handler with auto-sequence and validation
async function handleCreateWithSequence(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId } = ctx;

  // Parse body
  const body = await req.json();

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
  const validationResult = await validator.validate(body, context);

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
  const dataToInsert = {
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
  };

  const { data, error } = await supabase
    .from("operations")
    .insert(dataToInsert)
    .select(`
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
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create operation: ${error.message}`);
  }

  return createSuccessResponse(data, 201);
}

// Custom DELETE handler with time entry validation
async function handleDeleteWithValidation(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const operationId = url.searchParams.get("id");

  if (!operationId) {
    throw new BadRequestError("Operation ID is required in query string (?id=xxx)");
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

// Custom GET handler for complex filters (job_id, cell_name require joins)
async function handleGetOperationsWithFilters(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url } = ctx;

  const jobId = url.searchParams.get("job_id");
  const cellName = url.searchParams.get("cell_name");

  // Handle job_id filter (requires finding parts first)
  if (jobId) {
    const { data: parts } = await supabase
      .from("parts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("job_id", jobId);

    if (!parts || parts.length === 0) {
      return createSuccessResponse([], 200, {
        pagination: {
          limit: parseInt(url.searchParams.get("pageSize") || "100"),
          offset: 0,
          total: 0,
        },
      });
    }

    // Add part_id filter to URL params for crud-builder
    const partIds = parts.map((p: any) => p.id).join(",");
    url.searchParams.set("part_id", partIds);
    url.searchParams.delete("job_id");
  }

  // Handle cell_name filter (requires finding cells first)
  if (cellName) {
    const { data: cells } = await supabase
      .from("cells")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${cellName}%`);

    if (!cells || cells.length === 0) {
      return createSuccessResponse([], 200, {
        pagination: {
          limit: parseInt(url.searchParams.get("pageSize") || "100"),
          offset: 0,
          total: 0,
        },
      });
    }

    // Add cell_id filter to URL params for crud-builder
    const cellIds = cells.map((c: any) => c.id).join(",");
    url.searchParams.set("cell_id", cellIds);
    url.searchParams.delete("cell_name");
  }

  // Let crud-builder handle the rest
  return null as any;
}

// Custom PATCH handler with auto-complete timestamp
async function handleUpdateWithCompletion(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const operationId = url.searchParams.get("id");

  if (!operationId) {
    throw new BadRequestError("Operation ID is required in query string (?id=xxx)");
  }

  // Parse body
  const body = await req.json();

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
    .select(`
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
      )
    `)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update operation: ${error.message}`);
  }

  if (!operation) {
    throw new NotFoundError("Operation", operationId);
  }

  return createSuccessResponse(operation, 200);
}

// Configure CRUD handler for operations with validation and sync
export default serveApi(
  createCrudHandler({
    table: 'operations',
    selectFields: `
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
    searchFields: ['operation_name', 'notes'],
    allowedFilters: ['part_id', 'cell_id', 'status', 'assigned_operator_id', 'operation_name'],
    fuzzyFilters: ['operation_name'],
    sortableFields: ['sequence', 'created_at', 'estimated_time', 'actual_time', 'status', 'completion_percentage'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    validator: OperationValidator,
    enableSync: true,
    syncIdField: 'external_id',
    customHandlers: {
      get: handleGetOperationsWithFilters,
      post: handleCreateWithSequence,
      patch: handleUpdateWithCompletion,
      delete: handleDeleteWithValidation,
    },
  })
);
