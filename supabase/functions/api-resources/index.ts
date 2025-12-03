import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
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
  BadRequestError,
} from "../_shared/validation/errorHandler.ts";

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

    // Route: PUT /api-resources/sync - Upsert by external_id
    if (lastSegment === "sync" && req.method === "PUT") {
      return await handleSyncResource(req, supabase, tenantId);
    }

    // Route: POST /api-resources/bulk-sync - Bulk upsert
    if (lastSegment === "bulk-sync" && req.method === "POST") {
      return await handleBulkSyncResources(req, supabase, tenantId);
    }

    // Route by HTTP method for standard CRUD
    switch (req.method) {
      case "GET":
        return await handleGetResources(req, supabase, tenantId);
      case "POST":
        return await handleCreateResource(req, supabase, tenantId);
      case "PATCH":
        return await handleUpdateResource(req, supabase, tenantId);
      case "DELETE":
        return await handleDeleteResource(req, supabase, tenantId);
      default:
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE", "PUT"]);
    }
  } catch (error) {
    return handleError(error);
  }
});

// GET /api-resources - List resources with filtering
async function handleGetResources(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);

  // Get single resource by ID
  const resourceId = url.searchParams.get("id");
  if (resourceId) {
    const { data: resource, error } = await supabase
      .from("resources")
      .select("*")
      .eq("id", resourceId)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch resource: ${error.message}`);
    }

    if (!resource) {
      throw new NotFoundError("resource", resourceId);
    }

    return createSuccessResponse({ resource });
  }

  // List resources with filters
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const active = url.searchParams.get("active");
  const search = url.searchParams.get("search");
  const externalSource = url.searchParams.get("external_source");
  const externalId = url.searchParams.get("external_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const includeCount = url.searchParams.get("include_count") === "true";

  let query = supabase
    .from("resources")
    .select("*", { count: includeCount ? "exact" : undefined })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name");

  if (type) {
    query = query.eq("type", type);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (active !== null && active !== undefined) {
    query = query.eq("active", active === "true");
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,identifier.ilike.%${search}%`);
  }

  if (externalSource) {
    query = query.eq("external_source", externalSource);
  }

  if (externalId) {
    query = query.eq("external_id", externalId);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: resources, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  const meta: any = {
    pagination: {
      limit,
      offset,
      has_more: resources.length === limit,
    },
  };

  if (includeCount && count !== null) {
    meta.pagination.total = count;
  }

  return createSuccessResponse({ resources }, 200, meta);
}

// POST /api-resources - Create new resource
async function handleCreateResource(
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

  // Validate required fields
  if (!body.name) {
    throw new ValidationException({
      valid: false,
      severity: "error" as any,
      httpStatus: 422,
      errors: [{ field: "name", message: "name is required", constraint: "NOT_NULL", entityType: "resource" }],
      warnings: [],
      summary: "Validation failed",
      technicalDetails: "Missing required field: name",
    });
  }

  if (!body.type) {
    throw new ValidationException({
      valid: false,
      severity: "error" as any,
      httpStatus: 422,
      errors: [{ field: "type", message: "type is required", constraint: "NOT_NULL", entityType: "resource" }],
      warnings: [],
      summary: "Validation failed",
      technicalDetails: "Missing required field: type",
    });
  }

  // Check for duplicate name
  const { data: existingResource } = await supabase
    .from("resources")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", body.name)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingResource) {
    throw new ConflictError("resource", "name", body.name);
  }

  // Create resource
  const { data: resource, error } = await supabase
    .from("resources")
    .insert({
      tenant_id: tenantId,
      name: body.name,
      type: body.type,
      description: body.description,
      identifier: body.identifier,
      location: body.location,
      status: body.status || "available",
      metadata: body.metadata,
      active: body.active ?? true,
      external_id: body.external_id,
      external_source: body.external_source,
      synced_at: body.external_id ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !resource) {
    throw new Error(`Failed to create resource: ${error?.message}`);
  }

  return createSuccessResponse({ resource }, 201);
}

// PATCH /api-resources?id={id} - Update resource
async function handleUpdateResource(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const resourceId = url.searchParams.get("id");

  if (!resourceId) {
    throw new BadRequestError("Resource ID is required in query string (?id=xxx)");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

  const allowedFields = [
    "name", "type", "description", "identifier", "location",
    "status", "metadata", "active", "external_id", "external_source"
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

  // Check for duplicate name if updating name
  if (updates.name) {
    const { data: existingResource } = await supabase
      .from("resources")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", updates.name)
      .neq("id", resourceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingResource) {
      throw new ConflictError("resource", "name", updates.name);
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: resource, error } = await supabase
    .from("resources")
    .update(updates)
    .eq("id", resourceId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`);
  }

  if (!resource) {
    throw new NotFoundError("resource", resourceId);
  }

  return createSuccessResponse({ resource });
}

// DELETE /api-resources?id={id} - Soft delete resource
async function handleDeleteResource(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const resourceId = url.searchParams.get("id");

  if (!resourceId) {
    throw new BadRequestError("Resource ID is required in query string (?id=xxx)");
  }

  // Check if resource exists
  const { data: existing } = await supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError("resource", resourceId);
  }

  // Check if resource is in use by any operations
  const { data: operationResources } = await supabase
    .from("operation_resources")
    .select("id")
    .eq("resource_id", resourceId)
    .limit(1);

  if (operationResources && operationResources.length > 0) {
    throw new ConflictError(
      "resource",
      "operation_resources",
      "Cannot delete resource that is assigned to operations"
    );
  }

  // Soft delete
  const { error } = await supabase
    .from("resources")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", resourceId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }

  return createSuccessResponse({ deleted: true, id: resourceId });
}

// PUT /api-resources/sync - Upsert by external_id
async function handleSyncResource(
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

  if (!body.name) {
    throw new BadRequestError("name is required");
  }

  if (!body.type) {
    throw new BadRequestError("type is required");
  }

  // Check if record exists by external_id
  const { data: existing } = await supabase
    .from("resources")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("external_source", body.external_source)
    .eq("external_id", body.external_id)
    .is("deleted_at", null)
    .maybeSingle();

  const syncHash = await generateSyncHash(body);
  const now = new Date().toISOString();

  if (existing) {
    // UPDATE existing record
    const { data: resource, error } = await supabase
      .from("resources")
      .update({
        name: body.name,
        type: body.type,
        description: body.description,
        identifier: body.identifier,
        location: body.location,
        status: body.status || "available",
        metadata: body.metadata,
        active: body.active ?? true,
        synced_at: now,
        sync_hash: syncHash,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update resource: ${error.message}`);
    }

    return createSuccessResponse({
      action: "updated",
      resource,
    });
  } else {
    // CREATE new record
    const { data: resource, error } = await supabase
      .from("resources")
      .insert({
        tenant_id: tenantId,
        name: body.name,
        type: body.type,
        description: body.description,
        identifier: body.identifier,
        location: body.location,
        status: body.status || "available",
        metadata: body.metadata,
        active: body.active ?? true,
        external_id: body.external_id,
        external_source: body.external_source,
        synced_at: now,
        sync_hash: syncHash,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create resource: ${error.message}`);
    }

    return createSuccessResponse({
      action: "created",
      resource,
    }, 201);
  }
}

// POST /api-resources/bulk-sync - Bulk upsert
async function handleBulkSyncResources(
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

  const { resources, options = {} } = body;

  if (!Array.isArray(resources)) {
    throw new BadRequestError("resources must be an array");
  }

  if (resources.length === 0) {
    return createSuccessResponse({
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      results: [],
    });
  }

  if (resources.length > 1000) {
    throw new BadRequestError("Maximum 1000 resources per bulk-sync request");
  }

  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const resource of resources) {
    try {
      // Validate required fields
      if (!resource.external_id || !resource.external_source) {
        results.push({
          external_id: resource.external_id,
          action: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!resource.name || !resource.type) {
        results.push({
          external_id: resource.external_id,
          action: "error",
          error: "name and type are required",
        });
        errors++;
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from("resources")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("external_source", resource.external_source)
        .eq("external_id", resource.external_id)
        .is("deleted_at", null)
        .maybeSingle();

      const syncHash = await generateSyncHash(resource);
      const now = new Date().toISOString();

      if (existing) {
        // Update
        const { data: updated_resource, error } = await supabase
          .from("resources")
          .update({
            name: resource.name,
            type: resource.type,
            description: resource.description,
            identifier: resource.identifier,
            location: resource.location,
            status: resource.status || "available",
            metadata: resource.metadata,
            active: resource.active ?? true,
            synced_at: now,
            sync_hash: syncHash,
            updated_at: now,
          })
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: resource.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: resource.external_id,
            id: updated_resource.id,
            action: "updated",
          });
          updated++;
        }
      } else {
        // Create
        const { data: new_resource, error } = await supabase
          .from("resources")
          .insert({
            tenant_id: tenantId,
            name: resource.name,
            type: resource.type,
            description: resource.description,
            identifier: resource.identifier,
            location: resource.location,
            status: resource.status || "available",
            metadata: resource.metadata,
            active: resource.active ?? true,
            external_id: resource.external_id,
            external_source: resource.external_source,
            synced_at: now,
            sync_hash: syncHash,
          })
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: resource.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: resource.external_id,
            id: new_resource.id,
            action: "created",
          });
          created++;
        }
      }
    } catch (err: any) {
      results.push({
        external_id: resource.external_id,
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
    entity_type: "resources",
    status: errors > 0 ? (created + updated > 0 ? "completed" : "failed") : "completed",
    total_records: resources.length,
    created_count: created,
    updated_count: updated,
    error_count: errors,
    errors: errors > 0 ? results.filter(r => r.action === "error") : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return createSuccessResponse({
    total: resources.length,
    created,
    updated,
    errors,
    results,
  });
}

// Helper function to generate sync hash (using SHA-256 for Web Crypto API compatibility)
async function generateSyncHash(payload: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 32 chars (128 bits) for brevity, similar to MD5 output length
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}
