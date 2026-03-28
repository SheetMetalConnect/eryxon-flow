import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { createSuccessResponse, NotFoundError } from "@shared/validation/errorHandler.ts";

/**
 * Custom POST handler for batch creation with operation assignment.
 *
 * Accepts:
 * {
 *   batch_number: string,
 *   batch_type: "laser_nesting" | "tube_batch" | "saw_batch" | "finishing_batch" | "general",
 *   cell_id: string,
 *   material?: string,
 *   thickness_mm?: number,
 *   notes?: string,
 *   nesting_metadata?: object,
 *   nesting_image_url?: string,
 *   layout_image_url?: string,
 *   parent_batch_id?: string,
 *   operation_ids?: string[]
 * }
 */
async function handleCreateBatch(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, userId } = ctx;
  const body = await req.json();

  const { operation_ids, ...batchData } = body;

  // Create the batch
  const { data: batch, error: batchError } = await supabase
    .from("operation_batches")
    .insert({
      ...batchData,
      tenant_id: tenantId,
      created_by: userId,
      status: batchData.status || "draft",
    })
    .select()
    .single();

  if (batchError) {
    throw new Error(`Failed to create batch: ${batchError.message}`);
  }

  // Assign operations if provided
  let assignedOperations = 0;
  if (operation_ids && Array.isArray(operation_ids) && operation_ids.length > 0) {
    const batchOperations = operation_ids.map((opId: string, index: number) => ({
      tenant_id: tenantId,
      batch_id: batch.id,
      operation_id: opId,
      sequence_in_batch: index + 1,
    }));

    const { error: opsError } = await supabase
      .from("batch_operations")
      .insert(batchOperations);

    if (opsError) {
      // Batch created but ops failed — report it
      console.error("Failed to assign operations:", opsError);
      return createSuccessResponse({
        batch,
        warnings: {
          message: "Batch created but operation assignment failed",
          error: opsError.message,
        },
      }, 201);
    }
    assignedOperations = operation_ids.length;
  }

  return createSuccessResponse({
    batch: { ...batch, operations_assigned: assignedOperations },
  }, 201);
}

/**
 * Custom handler for batch lifecycle actions.
 * Routes: POST /api-batches/:id/start, /api-batches/:id/stop
 */
async function handleLifecycle(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, pathSegments } = ctx;

  // pathSegments: ["api-batches", ":id", "start"|"stop"|"operations"]
  const batchId = pathSegments[pathSegments.length - 2];
  const action = pathSegments[pathSegments.length - 1];
  const body = await req.json().catch(() => ({}));

  if (action === "start") {
    return await handleStart(supabase, tenantId, batchId, body.operator_id);
  } else if (action === "stop") {
    return await handleStop(supabase, tenantId, batchId, body.operator_id);
  } else if (action === "operations") {
    return await handleAddOperations(supabase, tenantId, batchId, body.operation_ids);
  }

  throw new NotFoundError("action", action);
}

async function handleStart(
  supabase: any, tenantId: string, batchId: string, operatorId?: string
): Promise<Response> {
  // Get batch
  const { data: batch, error: batchErr } = await supabase
    .from("operation_batches")
    .select("id, status")
    .eq("id", batchId)
    .eq("tenant_id", tenantId)
    .single();

  if (batchErr || !batch) throw new NotFoundError("batch", batchId);

  if (batch.status !== "draft" && batch.status !== "ready") {
    throw new Error(`Cannot start batch in status '${batch.status}'. Must be 'draft' or 'ready'.`);
  }

  // Get batch operations
  const { data: batchOps } = await supabase
    .from("batch_operations")
    .select("operation_id")
    .eq("batch_id", batchId)
    .eq("tenant_id", tenantId);

  if (!batchOps || batchOps.length === 0) {
    throw new Error("Cannot start batch with no operations");
  }

  const opIds = batchOps.map((bo: any) => bo.operation_id);

  // Create time entries for all operations
  const now = new Date().toISOString();
  const timeEntries = opIds.map((opId: string) => ({
    tenant_id: tenantId,
    operation_id: opId,
    operator_id: operatorId || null,
    start_time: now,
  }));

  const { error: timeErr } = await supabase
    .from("time_entries")
    .insert(timeEntries);

  if (timeErr) throw new Error(`Failed to create time entries: ${timeErr.message}`);

  // Set operations to in_progress
  await supabase
    .from("operations")
    .update({ status: "in_progress", started_at: now })
    .in("id", opIds)
    .eq("tenant_id", tenantId)
    .eq("status", "not_started");

  // Set batch to in_progress
  const { error: statusErr } = await supabase
    .from("operation_batches")
    .update({
      status: "in_progress",
      started_at: now,
      started_by: operatorId || null,
    })
    .eq("id", batchId)
    .eq("tenant_id", tenantId);

  if (statusErr) throw new Error(`Failed to update batch status: ${statusErr.message}`);

  return createSuccessResponse({
    batch_id: batchId,
    status: "in_progress",
    operations_started: opIds.length,
    started_at: now,
  });
}

async function handleStop(
  supabase: any, tenantId: string, batchId: string, operatorId?: string
): Promise<Response> {
  // Get batch operations with their estimated_time
  const { data: batchOps } = await supabase
    .from("batch_operations")
    .select("operation_id, operation:operations(id, estimated_time)")
    .eq("batch_id", batchId)
    .eq("tenant_id", tenantId);

  if (!batchOps || batchOps.length === 0) {
    throw new Error("No operations found for batch");
  }

  const opIds = batchOps.map((bo: any) => bo.operation_id);

  // Find active time entries
  const { data: activeEntries } = await supabase
    .from("time_entries")
    .select("id, operation_id, start_time")
    .in("operation_id", opIds)
    .eq("tenant_id", tenantId)
    .is("end_time", null);

  if (!activeEntries || activeEntries.length === 0) {
    throw new Error("No active time entries found for batch operations");
  }

  // Calculate total elapsed time from earliest start
  const now = new Date();
  const earliestStart = new Date(
    Math.min(...activeEntries.map((e: any) => new Date(e.start_time).getTime()))
  );
  const totalMinutes = Math.round((now.getTime() - earliestStart.getTime()) / 60000);

  // Distribute time — weighted by estimated_time if available
  const ops = batchOps.map((bo: any) => ({
    id: bo.operation_id,
    estimated_time: bo.operation?.estimated_time ?? 0,
  }));

  const totalEstimated = ops.reduce((sum: number, op: any) => sum + (op.estimated_time || 0), 0);
  const useWeighted = totalEstimated > 0 && ops.every((op: any) => op.estimated_time > 0);

  const distribution: { id: string; minutes: number }[] = [];

  if (useWeighted) {
    let allocated = 0;
    ops.forEach((op: any, i: number) => {
      const share = i === ops.length - 1
        ? totalMinutes - allocated  // last op gets remainder
        : Math.round((op.estimated_time / totalEstimated) * totalMinutes);
      distribution.push({ id: op.id, minutes: share });
      allocated += share;
    });
  } else {
    const base = Math.floor(totalMinutes / ops.length);
    const remainder = totalMinutes - base * ops.length;
    ops.forEach((op: any, i: number) => {
      distribution.push({ id: op.id, minutes: base + (i < remainder ? 1 : 0) });
    });
  }

  // Close time entries and update operations
  const nowStr = now.toISOString();
  for (const entry of activeEntries) {
    const alloc = distribution.find((d) => d.id === entry.operation_id);
    await supabase
      .from("time_entries")
      .update({ end_time: nowStr, duration_minutes: alloc?.minutes ?? 0 })
      .eq("id", entry.id);
  }

  for (const alloc of distribution) {
    // Add to existing actual_time
    const { data: op } = await supabase
      .from("operations")
      .select("actual_time")
      .eq("id", alloc.id)
      .single();

    await supabase
      .from("operations")
      .update({ actual_time: (op?.actual_time ?? 0) + alloc.minutes })
      .eq("id", alloc.id);
  }

  // Complete batch
  await supabase
    .from("operation_batches")
    .update({
      status: "completed",
      completed_at: nowStr,
      completed_by: operatorId || null,
      actual_time: totalMinutes,
    })
    .eq("id", batchId)
    .eq("tenant_id", tenantId);

  return createSuccessResponse({
    batch_id: batchId,
    status: "completed",
    total_minutes: totalMinutes,
    distribution_method: useWeighted ? "weighted" : "equal",
    operations: distribution,
  });
}

async function handleAddOperations(
  supabase: any, tenantId: string, batchId: string, operationIds?: string[]
): Promise<Response> {
  if (!operationIds || !Array.isArray(operationIds) || operationIds.length === 0) {
    throw new Error("operation_ids array is required");
  }

  // Get current max sequence
  const { data: existing } = await supabase
    .from("batch_operations")
    .select("sequence_in_batch")
    .eq("batch_id", batchId)
    .eq("tenant_id", tenantId)
    .order("sequence_in_batch", { ascending: false })
    .limit(1);

  const startSeq = (existing?.[0]?.sequence_in_batch ?? 0) + 1;

  const rows = operationIds.map((opId: string, i: number) => ({
    tenant_id: tenantId,
    batch_id: batchId,
    operation_id: opId,
    sequence_in_batch: startSeq + i,
  }));

  const { error } = await supabase.from("batch_operations").insert(rows);
  if (error) throw new Error(`Failed to add operations: ${error.message}`);

  return createSuccessResponse({
    batch_id: batchId,
    operations_added: operationIds.length,
  });
}

// Main CRUD handler
serveApi(
  createCrudHandler({
    table: "operation_batches",
    selectFields: `
      id,
      batch_number,
      batch_type,
      status,
      cell_id,
      material,
      thickness_mm,
      notes,
      nesting_metadata,
      nesting_image_url,
      layout_image_url,
      parent_batch_id,
      operations_count,
      estimated_time,
      actual_time,
      created_at,
      started_at,
      completed_at,
      updated_at,
      cell:cells(id, name),
      created_by_profile:profiles!operation_batches_created_by_fkey(full_name)
    `,
    searchFields: ["batch_number", "material"],
    allowedFilters: ["status", "batch_type", "cell_id", "material"],
    fuzzyFilters: ["batch_number", "material"],
    sortableFields: ["batch_number", "created_at", "status", "batch_type"],
    defaultSort: { field: "created_at", direction: "desc" },
    softDelete: false,
    customHandlers: {
      post: handleCreateBatch,
    },
  })
);
