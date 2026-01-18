/**
 * ERP Sync API - Unified endpoint for ERP integrations
 *
 * Provides optimized sync operations for jobs, parts, and resources:
 * - POST /diff - Check what would change without making changes
 * - POST /sync - Execute sync with optimized batch operations
 * - GET /status - Get sync status and history
 *
 * Features:
 * - Incremental sync support via sync_hash change detection
 * - Batch operations for improved performance
 * - Detailed status messages for each record
 * - Support for nested entities (jobs with parts, parts with operations)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  handleOptions,
  handleError,
  handleMethodNotAllowed,
  createSuccessResponse,
  BadRequestError,
} from "../_shared/validation/errorHandler.ts";
import { authenticateAndSetContext } from "../_shared/auth.ts";
import {
  generateSyncHash,
  hasChanged,
  prefetchExistingRecords,
  createExternalIdKey,
  resolveExternalIds,
  validateBulkSyncBody,
  batchUpsert,
  logSyncImport,
  type SyncOptions,
  type BulkSyncResult,
} from "../_shared/erp-sync.ts";
import {
  dispatchSyncCompleted,
  dispatchBatchSyncCompleted,
} from "../_shared/events.ts";

// ============================================================================
// Types
// ============================================================================

interface DiffResult {
  external_id: string;
  external_source: string;
  status: "create" | "update" | "unchanged" | "error";
  existing_id?: string;
  changes?: string[];
  error?: string;
}

interface DiffResponse {
  entity_type: string;
  total: number;
  to_create: number;
  to_update: number;
  unchanged: number;
  errors: number;
  records: DiffResult[];
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleOptions();
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Authenticate
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    // Parse URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const action = pathSegments[pathSegments.length - 1];

    // Route by action
    switch (action) {
      case "diff":
        if (req.method !== "POST") {
          return handleMethodNotAllowed(["POST"]);
        }
        return await handleDiff(req, supabase, tenantId);

      case "sync":
        if (req.method !== "POST") {
          return handleMethodNotAllowed(["POST"]);
        }
        return await handleSync(req, supabase, tenantId);

      case "status":
        if (req.method !== "GET") {
          return handleMethodNotAllowed(["GET"]);
        }
        return await handleStatus(req, supabase, tenantId);

      default:
        throw new BadRequestError(
          "Invalid endpoint. Use /diff, /sync, or /status",
        );
    }
  } catch (error) {
    return handleError(error);
  }
});

// ============================================================================
// POST /diff - Check what would change
// ============================================================================

async function handleDiff(
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

  const results: Record<string, DiffResponse> = {};

  // Process jobs if provided
  if (body.jobs && Array.isArray(body.jobs)) {
    results.jobs = await diffJobs(supabase, tenantId, body.jobs);
  }

  // Process parts if provided
  if (body.parts && Array.isArray(body.parts)) {
    results.parts = await diffParts(supabase, tenantId, body.parts);
  }

  // Process resources if provided
  if (body.resources && Array.isArray(body.resources)) {
    results.resources = await diffResources(supabase, tenantId, body.resources);
  }

  // Calculate summary
  const summary = {
    total_entities: Object.keys(results).length,
    total_records: Object.values(results).reduce((sum, r) => sum + r.total, 0),
    total_to_create: Object.values(results).reduce(
      (sum, r) => sum + r.to_create,
      0,
    ),
    total_to_update: Object.values(results).reduce(
      (sum, r) => sum + r.to_update,
      0,
    ),
    total_unchanged: Object.values(results).reduce(
      (sum, r) => sum + r.unchanged,
      0,
    ),
    total_errors: Object.values(results).reduce((sum, r) => sum + r.errors, 0),
  };

  return createSuccessResponse({
    summary,
    entities: results,
  });
}

/**
 * Diff jobs - check what would change
 */
async function diffJobs(
  supabase: any,
  tenantId: string,
  jobs: any[],
): Promise<DiffResponse> {
  const records: DiffResult[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let unchanged = 0;
  let errors = 0;

  // Pre-fetch existing jobs by external_id
  const lookups = jobs
    .filter((j) => j.external_id && j.external_source)
    .map((j) => ({
      external_id: j.external_id,
      external_source: j.external_source,
    }));

  const existingJobs = await prefetchExistingRecords<{
    id: string;
    external_id: string;
    external_source: string;
    sync_hash: string | null;
    job_number: string;
    customer: string;
    due_date: string;
    priority: number;
    status: string;
  }>(
    supabase,
    "jobs",
    tenantId,
    lookups,
    "id, external_id, external_source, sync_hash, job_number, customer, due_date, priority, status",
  );

  for (const job of jobs) {
    try {
      // Validate required fields
      if (!job.external_id || !job.external_source) {
        records.push({
          external_id: job.external_id || "unknown",
          external_source: job.external_source || "unknown",
          status: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!job.job_number) {
        records.push({
          external_id: job.external_id,
          external_source: job.external_source,
          status: "error",
          error: "job_number is required",
        });
        errors++;
        continue;
      }

      const key = createExternalIdKey(job.external_source, job.external_id);
      const existing = existingJobs.get(key);

      if (existing) {
        // Check if changed
        const newHash = await generateSyncHash(job);
        if (existing.sync_hash === newHash) {
          records.push({
            external_id: job.external_id,
            external_source: job.external_source,
            status: "unchanged",
            existing_id: existing.id,
          });
          unchanged++;
        } else {
          // Determine what changed
          const changes = detectJobChanges(existing, job);
          records.push({
            external_id: job.external_id,
            external_source: job.external_source,
            status: "update",
            existing_id: existing.id,
            changes,
          });
          toUpdate++;
        }
      } else {
        records.push({
          external_id: job.external_id,
          external_source: job.external_source,
          status: "create",
        });
        toCreate++;
      }
    } catch (err: any) {
      records.push({
        external_id: job.external_id || "unknown",
        external_source: job.external_source || "unknown",
        status: "error",
        error: err.message || "Unknown error",
      });
      errors++;
    }
  }

  return {
    entity_type: "jobs",
    total: jobs.length,
    to_create: toCreate,
    to_update: toUpdate,
    unchanged,
    errors,
    records,
  };
}

/**
 * Detect what fields changed in a job
 */
function detectJobChanges(existing: any, incoming: any): string[] {
  const changes: string[] = [];

  if (existing.job_number !== incoming.job_number) {
    changes.push(`job_number: "${existing.job_number}" -> "${incoming.job_number}"`);
  }
  if (existing.customer !== (incoming.customer_name || incoming.customer)) {
    changes.push(`customer: "${existing.customer}" -> "${incoming.customer_name || incoming.customer}"`);
  }
  if (existing.due_date !== incoming.due_date) {
    changes.push(`due_date: "${existing.due_date}" -> "${incoming.due_date}"`);
  }
  if (existing.priority !== incoming.priority && incoming.priority !== undefined) {
    changes.push(`priority: ${existing.priority} -> ${incoming.priority}`);
  }
  if (incoming.status && existing.status !== incoming.status) {
    changes.push(`status: "${existing.status}" -> "${incoming.status}"`);
  }
  if (incoming.notes || incoming.description) {
    changes.push("notes updated");
  }
  if (incoming.metadata) {
    changes.push("metadata updated");
  }

  return changes.length > 0 ? changes : ["data changed (hash mismatch)"];
}

/**
 * Diff parts - check what would change
 */
async function diffParts(
  supabase: any,
  tenantId: string,
  parts: any[],
): Promise<DiffResponse> {
  const records: DiffResult[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let unchanged = 0;
  let errors = 0;

  // Pre-fetch existing parts
  const lookups = parts
    .filter((p) => p.external_id && p.external_source)
    .map((p) => ({
      external_id: p.external_id,
      external_source: p.external_source,
    }));

  const existingParts = await prefetchExistingRecords<{
    id: string;
    external_id: string;
    external_source: string;
    sync_hash: string | null;
    part_number: string;
    material: string;
    quantity: number;
    status: string;
  }>(
    supabase,
    "parts",
    tenantId,
    lookups,
    "id, external_id, external_source, sync_hash, part_number, material, quantity, status",
  );

  // Pre-resolve job external IDs
  const jobExternalIds = [
    ...new Set(
      parts.filter((p) => p.job_external_id).map((p) => p.job_external_id),
    ),
  ];
  const jobIdMap = await resolveExternalIds(
    supabase,
    "jobs",
    tenantId,
    jobExternalIds,
    parts[0]?.external_source || "",
  );

  for (const part of parts) {
    try {
      // Validate required fields
      if (!part.external_id || !part.external_source) {
        records.push({
          external_id: part.external_id || "unknown",
          external_source: part.external_source || "unknown",
          status: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!part.part_number) {
        records.push({
          external_id: part.external_id,
          external_source: part.external_source,
          status: "error",
          error: "part_number is required",
        });
        errors++;
        continue;
      }

      // Resolve job_id
      let jobId = part.job_id;
      if (!jobId && part.job_external_id) {
        jobId = jobIdMap.get(part.job_external_id);
        if (!jobId) {
          records.push({
            external_id: part.external_id,
            external_source: part.external_source,
            status: "error",
            error: `Job with external_id "${part.job_external_id}" not found`,
          });
          errors++;
          continue;
        }
      }

      if (!jobId) {
        records.push({
          external_id: part.external_id,
          external_source: part.external_source,
          status: "error",
          error: "job_id or job_external_id is required",
        });
        errors++;
        continue;
      }

      const key = createExternalIdKey(part.external_source, part.external_id);
      const existing = existingParts.get(key);

      if (existing) {
        const newHash = await generateSyncHash(part);
        if (existing.sync_hash === newHash) {
          records.push({
            external_id: part.external_id,
            external_source: part.external_source,
            status: "unchanged",
            existing_id: existing.id,
          });
          unchanged++;
        } else {
          const changes = detectPartChanges(existing, part);
          records.push({
            external_id: part.external_id,
            external_source: part.external_source,
            status: "update",
            existing_id: existing.id,
            changes,
          });
          toUpdate++;
        }
      } else {
        records.push({
          external_id: part.external_id,
          external_source: part.external_source,
          status: "create",
        });
        toCreate++;
      }
    } catch (err: any) {
      records.push({
        external_id: part.external_id || "unknown",
        external_source: part.external_source || "unknown",
        status: "error",
        error: err.message || "Unknown error",
      });
      errors++;
    }
  }

  return {
    entity_type: "parts",
    total: parts.length,
    to_create: toCreate,
    to_update: toUpdate,
    unchanged,
    errors,
    records,
  };
}

/**
 * Detect what fields changed in a part
 */
function detectPartChanges(existing: any, incoming: any): string[] {
  const changes: string[] = [];

  if (existing.part_number !== incoming.part_number) {
    changes.push(`part_number: "${existing.part_number}" -> "${incoming.part_number}"`);
  }
  if (existing.material !== incoming.material && incoming.material) {
    changes.push(`material: "${existing.material}" -> "${incoming.material}"`);
  }
  if (existing.quantity !== incoming.quantity && incoming.quantity !== undefined) {
    changes.push(`quantity: ${existing.quantity} -> ${incoming.quantity}`);
  }
  if (incoming.status && existing.status !== incoming.status) {
    changes.push(`status: "${existing.status}" -> "${incoming.status}"`);
  }
  if (incoming.notes) {
    changes.push("notes updated");
  }
  if (incoming.metadata) {
    changes.push("metadata updated");
  }

  return changes.length > 0 ? changes : ["data changed (hash mismatch)"];
}

/**
 * Diff resources - check what would change
 */
async function diffResources(
  supabase: any,
  tenantId: string,
  resources: any[],
): Promise<DiffResponse> {
  const records: DiffResult[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let unchanged = 0;
  let errors = 0;

  // Pre-fetch existing resources
  const lookups = resources
    .filter((r) => r.external_id && r.external_source)
    .map((r) => ({
      external_id: r.external_id,
      external_source: r.external_source,
    }));

  const existingResources = await prefetchExistingRecords<{
    id: string;
    external_id: string;
    external_source: string;
    sync_hash: string | null;
    name: string;
    type: string;
    status: string;
  }>(
    supabase,
    "resources",
    tenantId,
    lookups,
    "id, external_id, external_source, sync_hash, name, type, status",
  );

  for (const resource of resources) {
    try {
      // Validate required fields
      if (!resource.external_id || !resource.external_source) {
        records.push({
          external_id: resource.external_id || "unknown",
          external_source: resource.external_source || "unknown",
          status: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!resource.name || !resource.type) {
        records.push({
          external_id: resource.external_id,
          external_source: resource.external_source,
          status: "error",
          error: "name and type are required",
        });
        errors++;
        continue;
      }

      const key = createExternalIdKey(
        resource.external_source,
        resource.external_id,
      );
      const existing = existingResources.get(key);

      if (existing) {
        const newHash = await generateSyncHash(resource);
        if (existing.sync_hash === newHash) {
          records.push({
            external_id: resource.external_id,
            external_source: resource.external_source,
            status: "unchanged",
            existing_id: existing.id,
          });
          unchanged++;
        } else {
          const changes = detectResourceChanges(existing, resource);
          records.push({
            external_id: resource.external_id,
            external_source: resource.external_source,
            status: "update",
            existing_id: existing.id,
            changes,
          });
          toUpdate++;
        }
      } else {
        records.push({
          external_id: resource.external_id,
          external_source: resource.external_source,
          status: "create",
        });
        toCreate++;
      }
    } catch (err: any) {
      records.push({
        external_id: resource.external_id || "unknown",
        external_source: resource.external_source || "unknown",
        status: "error",
        error: err.message || "Unknown error",
      });
      errors++;
    }
  }

  return {
    entity_type: "resources",
    total: resources.length,
    to_create: toCreate,
    to_update: toUpdate,
    unchanged,
    errors,
    records,
  };
}

/**
 * Detect what fields changed in a resource
 */
function detectResourceChanges(existing: any, incoming: any): string[] {
  const changes: string[] = [];

  if (existing.name !== incoming.name) {
    changes.push(`name: "${existing.name}" -> "${incoming.name}"`);
  }
  if (existing.type !== incoming.type) {
    changes.push(`type: "${existing.type}" -> "${incoming.type}"`);
  }
  if (incoming.status && existing.status !== incoming.status) {
    changes.push(`status: "${existing.status}" -> "${incoming.status}"`);
  }
  if (incoming.description) {
    changes.push("description updated");
  }
  if (incoming.metadata) {
    changes.push("metadata updated");
  }

  return changes.length > 0 ? changes : ["data changed (hash mismatch)"];
}

// ============================================================================
// POST /sync - Execute optimized sync
// ============================================================================

async function handleSync(
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

  const options: SyncOptions = {
    skipUnchanged: body.options?.skip_unchanged ?? true,
    batchSize: body.options?.batch_size ?? 100,
    continueOnError: body.options?.continue_on_error ?? true,
    recordSyncHistory: body.options?.record_history ?? true,
  };

  const results: Record<string, BulkSyncResult> = {};
  const startTime = Date.now();

  // Sync jobs if provided
  if (body.jobs && Array.isArray(body.jobs) && body.jobs.length > 0) {
    results.jobs = await syncJobs(supabase, tenantId, body.jobs, options);
  }

  // Sync parts if provided
  if (body.parts && Array.isArray(body.parts) && body.parts.length > 0) {
    results.parts = await syncParts(supabase, tenantId, body.parts, options);
  }

  // Sync resources if provided
  if (body.resources && Array.isArray(body.resources) && body.resources.length > 0) {
    results.resources = await syncResources(supabase, tenantId, body.resources, options);
  }

  // Calculate summary
  const totalDuration = Date.now() - startTime;
  const summary = {
    total_entities: Object.keys(results).length,
    total_records: Object.values(results).reduce((sum, r) => sum + r.total, 0),
    total_created: Object.values(results).reduce(
      (sum, r) => sum + r.created,
      0,
    ),
    total_updated: Object.values(results).reduce(
      (sum, r) => sum + r.updated,
      0,
    ),
    total_skipped: Object.values(results).reduce(
      (sum, r) => sum + r.skipped,
      0,
    ),
    total_errors: Object.values(results).reduce((sum, r) => sum + r.errors, 0),
    duration_ms: totalDuration,
  };

  // Dispatch webhook/MQTT events for completed syncs (non-blocking)
  const syncSource = body.source || "erp_api";

  // Dispatch per-entity events
  for (const [entityType, result] of Object.entries(results)) {
    if (result.created > 0 || result.updated > 0) {
      dispatchSyncCompleted(tenantId, entityType as "jobs" | "parts" | "resources", {
        entity_type: entityType,
        source: syncSource,
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        duration_ms: result.duration_ms,
        external_ids: result.results
          .filter((r: any) => r.action === "created" || r.action === "updated")
          .map((r: any) => r.external_id),
      });
    }
  }

  // Dispatch batch completion event if multiple entities were synced
  if (Object.keys(results).length > 1) {
    dispatchBatchSyncCompleted(tenantId, {
      entities: Object.keys(results),
      total_records: summary.total_records,
      total_created: summary.total_created,
      total_updated: summary.total_updated,
      total_skipped: summary.total_skipped,
      total_errors: summary.total_errors,
      duration_ms: totalDuration,
      source: syncSource,
    });
  }

  return createSuccessResponse({
    summary,
    entities: results,
  });
}

/**
 * Sync jobs with optimized batch operations
 */
async function syncJobs(
  supabase: any,
  tenantId: string,
  jobs: any[],
  options: SyncOptions,
): Promise<BulkSyncResult> {
  const startTime = Date.now();
  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Pre-fetch existing jobs
  const lookups = jobs
    .filter((j) => j.external_id && j.external_source)
    .map((j) => ({
      external_id: j.external_id,
      external_source: j.external_source,
    }));

  const existingJobs = await prefetchExistingRecords<{
    id: string;
    external_id: string;
    external_source: string;
    sync_hash: string | null;
  }>(supabase, "jobs", tenantId, lookups);

  const now = new Date().toISOString();

  // Separate into creates and updates
  const toCreate: any[] = [];
  const toUpdate: { id: string; data: any; external_id: string }[] = [];

  for (const job of jobs) {
    try {
      if (!job.external_id || !job.external_source || !job.job_number) {
        results.push({
          external_id: job.external_id || "unknown",
          action: "error",
          error: "Missing required fields",
        });
        errors++;
        continue;
      }

      const key = createExternalIdKey(job.external_source, job.external_id);
      const existing = existingJobs.get(key);
      const syncHash = await generateSyncHash(job);

      if (existing) {
        if (options.skipUnchanged && existing.sync_hash === syncHash) {
          results.push({
            external_id: job.external_id,
            id: existing.id,
            action: "skipped",
          });
          skipped++;
          continue;
        }

        toUpdate.push({
          id: existing.id,
          external_id: job.external_id,
          data: {
            job_number: job.job_number,
            customer: job.customer_name || job.customer,
            due_date: job.due_date,
            priority: job.priority,
            notes: job.notes || job.description,
            metadata: job.metadata,
            synced_at: now,
            sync_hash: syncHash,
            updated_at: now,
          },
        });
      } else {
        toCreate.push({
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
        });
      }
    } catch (err: any) {
      results.push({
        external_id: job.external_id || "unknown",
        action: "error",
        error: err.message,
      });
      errors++;
    }
  }

  // Batch insert new jobs
  if (toCreate.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from("jobs")
      .insert(toCreate)
      .select("id, external_id");

    if (insertError) {
      for (const item of toCreate) {
        results.push({
          external_id: item.external_id,
          action: "error",
          error: insertError.message,
        });
        errors++;
      }
    } else if (insertedData) {
      for (const inserted of insertedData) {
        results.push({
          external_id: inserted.external_id,
          id: inserted.id,
          action: "created",
        });
        created++;
      }
    }
  }

  // Process updates in parallel with concurrency limit
  const updatePromises = toUpdate.map(async (item) => {
    const { data, error } = await supabase
      .from("jobs")
      .update(item.data)
      .eq("id", item.id)
      .select("id, external_id")
      .single();

    if (error) {
      return { external_id: item.external_id, action: "error", error: error.message };
    }
    return { external_id: data.external_id, id: data.id, action: "updated" };
  });

  const updateResults = await Promise.all(updatePromises);
  for (const result of updateResults) {
    results.push(result);
    if (result.action === "updated") updated++;
    else if (result.action === "error") errors++;
  }

  const syncResult: BulkSyncResult = {
    total: jobs.length,
    created,
    updated,
    skipped,
    errors,
    results,
    duration_ms: Date.now() - startTime,
  };

  // Log sync history
  if (options.recordSyncHistory) {
    await logSyncImport(supabase, tenantId, {
      source: "api_erp_sync",
      entityType: "jobs",
      result: syncResult,
    });
  }

  return syncResult;
}

/**
 * Sync parts with optimized batch operations
 */
async function syncParts(
  supabase: any,
  tenantId: string,
  parts: any[],
  options: SyncOptions,
): Promise<BulkSyncResult> {
  const startTime = Date.now();
  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Pre-fetch existing parts
  const lookups = parts
    .filter((p) => p.external_id && p.external_source)
    .map((p) => ({
      external_id: p.external_id,
      external_source: p.external_source,
    }));

  const existingParts = await prefetchExistingRecords<{
    id: string;
    external_id: string;
    external_source: string;
    sync_hash: string | null;
  }>(supabase, "parts", tenantId, lookups);

  // Pre-resolve job external IDs
  const jobExternalIds = [...new Set(parts.filter((p) => p.job_external_id).map((p) => p.job_external_id))];
  const primarySource = parts[0]?.external_source || "";
  const jobIdMap = await resolveExternalIds(supabase, "jobs", tenantId, jobExternalIds, primarySource);

  const now = new Date().toISOString();
  const toCreate: any[] = [];
  const toUpdate: { id: string; data: any; external_id: string }[] = [];

  for (const part of parts) {
    try {
      if (!part.external_id || !part.external_source || !part.part_number) {
        results.push({
          external_id: part.external_id || "unknown",
          action: "error",
          error: "Missing required fields",
        });
        errors++;
        continue;
      }

      // Resolve job_id
      let jobId = part.job_id;
      if (!jobId && part.job_external_id) {
        jobId = jobIdMap.get(part.job_external_id);
      }

      if (!jobId) {
        results.push({
          external_id: part.external_id,
          action: "error",
          error: "job_id or valid job_external_id required",
        });
        errors++;
        continue;
      }

      const key = createExternalIdKey(part.external_source, part.external_id);
      const existing = existingParts.get(key);
      const syncHash = await generateSyncHash(part);

      if (existing) {
        if (options.skipUnchanged && existing.sync_hash === syncHash) {
          results.push({
            external_id: part.external_id,
            id: existing.id,
            action: "skipped",
          });
          skipped++;
          continue;
        }

        toUpdate.push({
          id: existing.id,
          external_id: part.external_id,
          data: {
            job_id: jobId,
            part_number: part.part_number,
            material: part.material || "Unknown",
            quantity: part.quantity || 1,
            notes: part.notes,
            metadata: part.metadata,
            synced_at: now,
            sync_hash: syncHash,
            updated_at: now,
          },
        });
      } else {
        toCreate.push({
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
        });
      }
    } catch (err: any) {
      results.push({
        external_id: part.external_id || "unknown",
        action: "error",
        error: err.message,
      });
      errors++;
    }
  }

  // Batch insert
  if (toCreate.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from("parts")
      .insert(toCreate)
      .select("id, external_id");

    if (insertError) {
      for (const item of toCreate) {
        results.push({ external_id: item.external_id, action: "error", error: insertError.message });
        errors++;
      }
    } else if (insertedData) {
      for (const inserted of insertedData) {
        results.push({ external_id: inserted.external_id, id: inserted.id, action: "created" });
        created++;
      }
    }
  }

  // Parallel updates
  const updatePromises = toUpdate.map(async (item) => {
    const { data, error } = await supabase
      .from("parts")
      .update(item.data)
      .eq("id", item.id)
      .select("id, external_id")
      .single();

    if (error) {
      return { external_id: item.external_id, action: "error", error: error.message };
    }
    return { external_id: data.external_id, id: data.id, action: "updated" };
  });

  const updateResults = await Promise.all(updatePromises);
  for (const result of updateResults) {
    results.push(result);
    if (result.action === "updated") updated++;
    else if (result.action === "error") errors++;
  }

  const syncResult: BulkSyncResult = {
    total: parts.length,
    created,
    updated,
    skipped,
    errors,
    results,
    duration_ms: Date.now() - startTime,
  };

  if (options.recordSyncHistory) {
    await logSyncImport(supabase, tenantId, {
      source: "api_erp_sync",
      entityType: "parts",
      result: syncResult,
    });
  }

  return syncResult;
}

/**
 * Sync resources with optimized batch operations
 */
async function syncResources(
  supabase: any,
  tenantId: string,
  resources: any[],
  options: SyncOptions,
): Promise<BulkSyncResult> {
  const startTime = Date.now();
  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Pre-fetch existing resources
  const lookups = resources
    .filter((r) => r.external_id && r.external_source)
    .map((r) => ({
      external_id: r.external_id,
      external_source: r.external_source,
    }));

  const existingResources = await prefetchExistingRecords<{
    id: string;
    external_id: string;
    external_source: string;
    sync_hash: string | null;
  }>(supabase, "resources", tenantId, lookups);

  const now = new Date().toISOString();
  const toCreate: any[] = [];
  const toUpdate: { id: string; data: any; external_id: string }[] = [];

  for (const resource of resources) {
    try {
      if (!resource.external_id || !resource.external_source || !resource.name || !resource.type) {
        results.push({
          external_id: resource.external_id || "unknown",
          action: "error",
          error: "Missing required fields (external_id, external_source, name, type)",
        });
        errors++;
        continue;
      }

      const key = createExternalIdKey(resource.external_source, resource.external_id);
      const existing = existingResources.get(key);
      const syncHash = await generateSyncHash(resource);

      if (existing) {
        if (options.skipUnchanged && existing.sync_hash === syncHash) {
          results.push({
            external_id: resource.external_id,
            id: existing.id,
            action: "skipped",
          });
          skipped++;
          continue;
        }

        toUpdate.push({
          id: existing.id,
          external_id: resource.external_id,
          data: {
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
          },
        });
      } else {
        toCreate.push({
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
        });
      }
    } catch (err: any) {
      results.push({
        external_id: resource.external_id || "unknown",
        action: "error",
        error: err.message,
      });
      errors++;
    }
  }

  // Batch insert
  if (toCreate.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from("resources")
      .insert(toCreate)
      .select("id, external_id");

    if (insertError) {
      for (const item of toCreate) {
        results.push({ external_id: item.external_id, action: "error", error: insertError.message });
        errors++;
      }
    } else if (insertedData) {
      for (const inserted of insertedData) {
        results.push({ external_id: inserted.external_id, id: inserted.id, action: "created" });
        created++;
      }
    }
  }

  // Parallel updates
  const updatePromises = toUpdate.map(async (item) => {
    const { data, error } = await supabase
      .from("resources")
      .update(item.data)
      .eq("id", item.id)
      .select("id, external_id")
      .single();

    if (error) {
      return { external_id: item.external_id, action: "error", error: error.message };
    }
    return { external_id: data.external_id, id: data.id, action: "updated" };
  });

  const updateResults = await Promise.all(updatePromises);
  for (const result of updateResults) {
    results.push(result);
    if (result.action === "updated") updated++;
    else if (result.action === "error") errors++;
  }

  const syncResult: BulkSyncResult = {
    total: resources.length,
    created,
    updated,
    skipped,
    errors,
    results,
    duration_ms: Date.now() - startTime,
  };

  if (options.recordSyncHistory) {
    await logSyncImport(supabase, tenantId, {
      source: "api_erp_sync",
      entityType: "resources",
      result: syncResult,
    });
  }

  return syncResult;
}

// ============================================================================
// GET /status - Get sync status and history
// ============================================================================

async function handleStatus(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const entityType = url.searchParams.get("entity_type");
  const source = url.searchParams.get("source");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

  let query = supabase
    .from("sync_imports")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sync status: ${error.message}`);
  }

  // Calculate summary statistics
  const stats = {
    total_syncs: data?.length || 0,
    successful: data?.filter((s: any) => s.status === "completed").length || 0,
    failed: data?.filter((s: any) => s.status === "failed").length || 0,
    total_created: data?.reduce((sum: number, s: any) => sum + (s.created_count || 0), 0) || 0,
    total_updated: data?.reduce((sum: number, s: any) => sum + (s.updated_count || 0), 0) || 0,
    total_errors: data?.reduce((sum: number, s: any) => sum + (s.error_count || 0), 0) || 0,
  };

  return createSuccessResponse({
    stats,
    history: data || [],
  });
}
