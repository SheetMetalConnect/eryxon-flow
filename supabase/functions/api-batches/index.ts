import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import type { HandlerContext } from "@shared/handler.ts";
import {
  BadRequestError,
  createSuccessResponse,
  NotFoundError,
} from "@shared/validation/errorHandler.ts";
import {
  isTenantScopedObjectPath,
  normalizePrivateObjectPath,
  PRIVATE_SIGNED_URL_TTL_SECONDS,
  resolveAuthorizedPrivateObjectPath,
} from "@shared/private-storage.ts";

function normalizeOperationIds(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new BadRequestError("operation_ids must be an array");
  }

  const ids = value.map((id) => {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new BadRequestError("operation_ids must contain non-empty strings");
    }
    return id.trim();
  });

  if (new Set(ids).size !== ids.length) {
    throw new BadRequestError("operation_ids must not contain duplicates");
  }

  return ids;
}

function normalizeProductionMode(
  value: unknown,
  batchType: unknown,
): "manual" | "automated" | undefined {
  if (value === undefined) return undefined;
  if (value !== "manual" && value !== "automated") {
    throw new BadRequestError(
      "production_mode must be either 'manual' or 'automated'",
    );
  }
  if (value === "automated" && batchType !== "laser_nesting") {
    throw new BadRequestError(
      "production_mode 'automated' is only supported for laser_nesting batches",
    );
  }
  return value;
}

async function assertTenantRecord(
  supabase: any,
  table: string,
  id: string,
  tenantId: string,
  label: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate ${label}: ${error.message}`);
  }

  if (!data) {
    throw new BadRequestError(
      `${label} must belong to the authenticated tenant`,
    );
  }
}

async function validateBatchReferences(
  supabase: any,
  tenantId: string,
  batchData: Record<string, unknown>,
  batchId?: string,
): Promise<void> {
  if (
    typeof batchData.cell_id === "string" && batchData.cell_id.trim().length > 0
  ) {
    await assertTenantRecord(
      supabase,
      "cells",
      batchData.cell_id.trim(),
      tenantId,
      "cell_id",
    );
  }

  if (
    typeof batchData.parent_batch_id === "string" &&
    batchData.parent_batch_id.trim().length > 0
  ) {
    const parentBatchId = batchData.parent_batch_id.trim();
    if (batchId && parentBatchId === batchId) {
      throw new BadRequestError(
        "parent_batch_id cannot reference the same batch",
      );
    }
    await assertTenantRecord(
      supabase,
      "operation_batches",
      parentBatchId,
      tenantId,
      "parent_batch_id",
    );
  }
}

function normalizeBatchImageField(
  value: unknown,
  tenantId: string,
  fieldName: "nesting_image_url" | "layout_image_url",
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string`);
  }

  const normalizedPath = normalizePrivateObjectPath(value, "batch-images");
  if (!normalizedPath || !isTenantScopedObjectPath(normalizedPath, tenantId)) {
    throw new BadRequestError(
      `${fieldName} must be a tenant-scoped batch-images object path`,
    );
  }

  return normalizedPath;
}

function normalizeBatchImageFields(
  batchData: Record<string, unknown>,
  tenantId: string,
): Record<string, unknown> {
  const normalized = { ...batchData };
  const productionMode = normalizeProductionMode(
    batchData.production_mode,
    batchData.batch_type,
  );
  if (productionMode !== undefined) {
    normalized.production_mode = productionMode;
  }

  const nestingImagePath = normalizeBatchImageField(
    batchData.nesting_image_url,
    tenantId,
    "nesting_image_url",
  );
  if (nestingImagePath !== undefined) {
    normalized.nesting_image_url = nestingImagePath;
  }

  const layoutImagePath = normalizeBatchImageField(
    batchData.layout_image_url,
    tenantId,
    "layout_image_url",
  );
  if (layoutImagePath !== undefined) {
    normalized.layout_image_url = layoutImagePath;
  }

  return normalized;
}

async function assertOperationsBelongToTenant(
  supabase: any,
  tenantId: string,
  operationIds: string[],
): Promise<void> {
  if (operationIds.length === 0) return;

  const { data, error } = await supabase
    .from("operations")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", operationIds);

  if (error) {
    throw new Error(`Failed to validate operation_ids: ${error.message}`);
  }

  const foundIds = new Set(
    (data || []).map((operation: { id: string }) => operation.id),
  );
  const missingIds = operationIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new BadRequestError(
      "operation_ids must reference operations in the authenticated tenant",
    );
  }
}

async function assertOperationsUnassigned(
  supabase: any,
  tenantId: string,
  operationIds: string[],
): Promise<void> {
  if (operationIds.length === 0) return;

  const { data, error } = await supabase
    .from("batch_operations")
    .select("operation_id")
    .eq("tenant_id", tenantId)
    .in("operation_id", operationIds);

  if (error) {
    throw new Error(
      `Failed to validate batch operation assignments: ${error.message}`,
    );
  }

  if ((data || []).length > 0) {
    throw new BadRequestError(
      "operation_ids must not already be assigned to another batch",
    );
  }
}

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
async function handleCreateBatch(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const { supabase, tenantId } = ctx;
  const body = await req.json();

  const { operation_ids, ...batchData } = body;
  const normalizedBatchData = normalizeBatchImageFields(batchData, tenantId);
  const operationIds = normalizeOperationIds(operation_ids);

  await validateBatchReferences(supabase, tenantId, normalizedBatchData);
  await assertOperationsBelongToTenant(supabase, tenantId, operationIds);
  await assertOperationsUnassigned(supabase, tenantId, operationIds);

  // Create the batch
  const { data: batch, error: batchError } = await supabase
    .from("operation_batches")
    .insert({
      ...normalizedBatchData,
      tenant_id: tenantId,
      status: normalizedBatchData.status || "draft",
    })
    .select()
    .single();

  if (batchError) {
    throw new Error(`Failed to create batch: ${batchError.message}`);
  }

  // Assign operations if provided
  let assignedOperations = 0;
  if (operationIds.length > 0) {
    const batchOperations = operationIds.map((opId: string, index: number) => ({
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
    assignedOperations = operationIds.length;
  }

  return createSuccessResponse({
    batch: { ...batch, operations_assigned: assignedOperations },
  }, 201);
}

async function handleUpdateBatch(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const batchId = url.searchParams.get("id");
  if (!batchId) {
    throw new BadRequestError("ID parameter is required for updates");
  }

  const body = await req.json();
  if (body.operation_ids !== undefined) {
    throw new BadRequestError(
      "operation_ids cannot be changed with PATCH; use api-batch-lifecycle/add-operations",
    );
  }

  const normalizedBody = normalizeBatchImageFields(body, tenantId);

  await validateBatchReferences(supabase, tenantId, normalizedBody, batchId);

  const updateData = { ...normalizedBody };
  delete updateData.id;
  delete updateData.tenant_id;
  delete updateData.created_at;
  delete updateData.created_by;
  delete updateData.started_at;
  delete updateData.started_by;
  delete updateData.completed_at;
  delete updateData.completed_by;
  delete updateData.operation_ids;

  const { data, error } = await supabase
    .from("operation_batches")
    .update(updateData)
    .eq("id", batchId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new NotFoundError("batch", batchId);
    }
    throw new Error(`Failed to update batch: ${error.message}`);
  }

  return createSuccessResponse({ batch: data });
}

async function handleGetBatch(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  if (ctx.lastSegment !== "image-url") {
    return defaultBatchHandler(req, ctx);
  }

  const batchId = ctx.pathSegments[ctx.pathSegments.length - 2];
  if (!batchId || batchId === "api-batches") {
    throw new BadRequestError("Batch ID is required");
  }

  const requestedPath = ctx.url.searchParams.get("path");
  if (!requestedPath) {
    throw new BadRequestError("path is required");
  }

  const { supabase, tenantId } = ctx;
  const { data: batch, error: batchError } = await supabase
    .from("operation_batches")
    .select("nesting_image_url, layout_image_url")
    .eq("id", batchId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (batchError) {
    throw new Error(
      `Failed to validate batch image access: ${batchError.message}`,
    );
  }

  if (!batch) {
    throw new NotFoundError("batch", batchId);
  }

  const authorizedPath = resolveAuthorizedPrivateObjectPath(
    [batch.nesting_image_url, batch.layout_image_url],
    requestedPath,
    tenantId,
    "batch-images",
  );

  if (!authorizedPath) {
    throw new NotFoundError("Batch image not found");
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("batch-images")
    .createSignedUrl(authorizedPath, PRIVATE_SIGNED_URL_TTL_SECONDS);

  if (signedUrlError) {
    throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
  }

  return createSuccessResponse({
    path: authorizedPath,
    url: signedUrlData?.signedUrl || null,
    expires_in: PRIVATE_SIGNED_URL_TTL_SECONDS,
  });
}

const batchesCrudConfig = {
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
      production_mode,
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
  defaultSort: { field: "created_at", direction: "desc" as const },
  softDelete: false,
};

const defaultBatchHandler = createCrudHandler(batchesCrudConfig);

// Main CRUD handler
serveApi(
  createCrudHandler({
    ...batchesCrudConfig,
    customHandlers: {
      get: handleGetBatch,
      post: handleCreateBatch,
      patch: handleUpdateBatch,
    },
  }),
);
