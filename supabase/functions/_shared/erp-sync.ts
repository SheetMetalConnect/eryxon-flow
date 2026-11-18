/**
 * ERP Sync Utilities
 *
 * Shared utilities for ERP integration sync operations.
 * Provides optimized sync hash generation, change detection,
 * and batch processing helpers.
 */

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  action: "created" | "updated" | "skipped" | "error";
  id?: string;
  external_id: string;
  external_source?: string;
  error?: string;
  skipped_reason?: string;
}

export interface BulkSyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: SyncResult[];
  duration_ms: number;
}

export interface SyncOptions {
  /** Skip records with unchanged sync_hash (default: true) */
  skipUnchanged?: boolean;
  /** Batch size for bulk operations (default: 100) */
  batchSize?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Record sync import history (default: true) */
  recordSyncHistory?: boolean;
  /** Update strategy for conflicts */
  updateStrategy?: "merge" | "replace";
}

export interface ExternalIdLookup {
  external_id: string;
  external_source: string;
}

// ============================================================================
// Sync Hash Generation
// ============================================================================

/**
 * Generate a sync hash for a payload using SHA-256
 *
 * Used for change detection - if the hash matches, the data hasn't changed.
 * Only hashes the sync-relevant fields (excludes timestamps, internal IDs).
 *
 * @param payload - The data to hash
 * @returns First 32 characters of SHA-256 hash (128 bits)
 */
export async function generateSyncHash(payload: any): Promise<string> {
  // Normalize payload: remove fields that shouldn't affect change detection
  const normalizedPayload = normalizeSyncPayload(payload);

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(normalizedPayload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Return first 32 chars (128 bits) for brevity
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}

/**
 * Normalize payload for consistent hashing
 * Removes fields that shouldn't trigger an update
 */
function normalizeSyncPayload(payload: any): any {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeSyncPayload);
  }

  if (typeof payload === "object") {
    const normalized: any = {};
    const excludeFields = new Set([
      // Internal fields
      "id",
      "tenant_id",
      "created_at",
      "updated_at",
      "deleted_at",
      "deleted_by",
      // Sync tracking fields
      "synced_at",
      "sync_hash",
      // Computed fields
      "cached_at",
    ]);

    // Sort keys for consistent ordering
    const sortedKeys = Object.keys(payload).sort();

    for (const key of sortedKeys) {
      if (!excludeFields.has(key) && payload[key] !== undefined) {
        normalized[key] = normalizeSyncPayload(payload[key]);
      }
    }

    return normalized;
  }

  return payload;
}

/**
 * Check if a record has changed by comparing sync hashes
 *
 * @param existingHash - The stored sync_hash
 * @param newPayload - The incoming data to compare
 * @returns true if data has changed
 */
export async function hasChanged(
  existingHash: string | null,
  newPayload: any,
): Promise<boolean> {
  if (!existingHash) {
    return true; // No existing hash means it's new or should be updated
  }

  const newHash = await generateSyncHash(newPayload);
  return existingHash !== newHash;
}

// ============================================================================
// Batch Processing Utilities
// ============================================================================

/**
 * Pre-fetch existing records by external IDs for efficient bulk operations
 *
 * Instead of checking existence one by one, fetch all at once.
 *
 * @returns Map of "external_source:external_id" -> existing record
 */
export async function prefetchExistingRecords<T extends { id: string }>(
  supabase: any,
  tableName: string,
  tenantId: string,
  lookups: ExternalIdLookup[],
  selectFields: string = "id, external_id, external_source, sync_hash",
): Promise<Map<string, T>> {
  if (lookups.length === 0) {
    return new Map();
  }

  // Group by external_source for efficient querying
  const bySource = new Map<string, string[]>();
  for (const lookup of lookups) {
    const ids = bySource.get(lookup.external_source) || [];
    ids.push(lookup.external_id);
    bySource.set(lookup.external_source, ids);
  }

  const results = new Map<string, T>();

  // Query for each source (typically there's only one source per sync)
  for (const [source, externalIds] of bySource) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq("tenant_id", tenantId)
      .eq("external_source", source)
      .in("external_id", externalIds)
      .is("deleted_at", null);

    if (error) {
      console.error(`[ERP Sync] Error prefetching ${tableName}:`, error);
      continue;
    }

    if (data) {
      for (const record of data) {
        const key = `${record.external_source}:${record.external_id}`;
        results.set(key, record as T);
      }
    }
  }

  return results;
}

/**
 * Create a lookup key for external ID mapping
 */
export function createExternalIdKey(
  externalSource: string,
  externalId: string,
): string {
  return `${externalSource}:${externalId}`;
}

/**
 * Split an array into batches of a specified size
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Process items in parallel with concurrency limit
 *
 * @param items - Items to process
 * @param processor - Async function to process each item
 * @param concurrency - Maximum concurrent operations (default: 10)
 */
export async function parallelProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 10,
): Promise<R[]> {
  const results: R[] = [];
  const batches = batchArray(items, concurrency);

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// Batch Insert/Update Operations
// ============================================================================

export interface BatchUpsertItem<T> {
  external_id: string;
  external_source: string;
  data: T;
  existingId?: string;
}

/**
 * Perform batched upsert operations
 *
 * Separates items into inserts and updates, then executes in batches.
 */
export async function batchUpsert<T>(
  supabase: any,
  tableName: string,
  tenantId: string,
  items: BatchUpsertItem<T>[],
  options: SyncOptions = {},
): Promise<BulkSyncResult> {
  const startTime = Date.now();
  const {
    skipUnchanged = true,
    batchSize = 100,
    continueOnError = true,
  } = options;

  const results: SyncResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Separate into inserts and updates
  const toInsert: any[] = [];
  const toUpdate: { id: string; data: any }[] = [];

  // Pre-fetch existing records
  const lookups = items.map((item) => ({
    external_id: item.external_id,
    external_source: item.external_source,
  }));

  const existingRecords = await prefetchExistingRecords<{
    id: string;
    sync_hash: string | null;
    external_id: string;
    external_source: string;
  }>(supabase, tableName, tenantId, lookups);

  const now = new Date().toISOString();

  for (const item of items) {
    try {
      const key = createExternalIdKey(item.external_source, item.external_id);
      const existing = existingRecords.get(key);

      const syncHash = await generateSyncHash(item.data);

      if (existing) {
        // Check if unchanged
        if (skipUnchanged && existing.sync_hash === syncHash) {
          results.push({
            action: "skipped",
            id: existing.id,
            external_id: item.external_id,
            skipped_reason: "unchanged",
          });
          skipped++;
          continue;
        }

        // Queue for update
        toUpdate.push({
          id: existing.id,
          data: {
            ...item.data,
            synced_at: now,
            sync_hash: syncHash,
            updated_at: now,
          },
        });
      } else {
        // Queue for insert
        toInsert.push({
          tenant_id: tenantId,
          ...item.data,
          external_id: item.external_id,
          external_source: item.external_source,
          synced_at: now,
          sync_hash: syncHash,
        });
      }
    } catch (err: any) {
      results.push({
        action: "error",
        external_id: item.external_id,
        error: err.message || "Unknown error",
      });
      errors++;

      if (!continueOnError) {
        break;
      }
    }
  }

  // Execute batch inserts
  if (toInsert.length > 0) {
    const insertBatches = batchArray(toInsert, batchSize);

    for (const batch of insertBatches) {
      const { data: insertedData, error: insertError } = await supabase
        .from(tableName)
        .insert(batch)
        .select("id, external_id");

      if (insertError) {
        // Handle batch insert error - mark all as errors
        for (const item of batch) {
          results.push({
            action: "error",
            external_id: item.external_id,
            error: insertError.message,
          });
          errors++;
        }
      } else if (insertedData) {
        for (const inserted of insertedData) {
          results.push({
            action: "created",
            id: inserted.id,
            external_id: inserted.external_id,
          });
          created++;
        }
      }
    }
  }

  // Execute batch updates (updates must be done individually due to different IDs)
  // But we can process them in parallel with concurrency control
  if (toUpdate.length > 0) {
    const updateResults = await parallelProcess(
      toUpdate,
      async (item) => {
        const { data, error } = await supabase
          .from(tableName)
          .update(item.data)
          .eq("id", item.id)
          .select("id, external_id")
          .single();

        if (error) {
          return {
            action: "error" as const,
            external_id: item.data.external_id || item.id,
            error: error.message,
          };
        }

        return {
          action: "updated" as const,
          id: data.id,
          external_id: data.external_id,
        };
      },
      10, // Concurrency limit
    );

    for (const result of updateResults) {
      results.push(result as SyncResult);
      if (result.action === "updated") {
        updated++;
      } else if (result.action === "error") {
        errors++;
      }
    }
  }

  return {
    total: items.length,
    created,
    updated,
    skipped,
    errors,
    results,
    duration_ms: Date.now() - startTime,
  };
}

// ============================================================================
// Sync History Logging
// ============================================================================

/**
 * Log a sync import operation to the sync_imports table
 */
export async function logSyncImport(
  supabase: any,
  tenantId: string,
  params: {
    source: string;
    entityType: string;
    result: BulkSyncResult;
  },
): Promise<void> {
  const { source, entityType, result } = params;

  const status =
    result.errors > 0
      ? result.created + result.updated > 0
        ? "completed"
        : "failed"
      : "completed";

  await supabase.from("sync_imports").insert({
    tenant_id: tenantId,
    source,
    entity_type: entityType,
    status,
    total_records: result.total,
    created_count: result.created,
    updated_count: result.updated,
    skipped_count: result.skipped,
    error_count: result.errors,
    errors:
      result.errors > 0
        ? result.results.filter((r) => r.action === "error")
        : null,
    started_at: new Date(Date.now() - result.duration_ms).toISOString(),
    completed_at: new Date().toISOString(),
  });
}

// ============================================================================
// External ID Resolution
// ============================================================================

/**
 * Resolve external IDs to internal IDs
 *
 * Useful when syncing related entities (e.g., parts need job_id)
 *
 * @returns Map of "external_source:external_id" -> internal UUID
 */
export async function resolveExternalIds(
  supabase: any,
  tableName: string,
  tenantId: string,
  externalIds: string[],
  externalSource: string,
): Promise<Map<string, string>> {
  if (externalIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(tableName)
    .select("id, external_id")
    .eq("tenant_id", tenantId)
    .eq("external_source", externalSource)
    .in("external_id", externalIds)
    .is("deleted_at", null);

  if (error) {
    console.error(
      `[ERP Sync] Error resolving external IDs from ${tableName}:`,
      error,
    );
    return new Map();
  }

  const result = new Map<string, string>();
  if (data) {
    for (const record of data) {
      result.set(record.external_id, record.id);
    }
  }

  return result;
}

/**
 * Resolve a single external ID to internal ID
 */
export async function resolveExternalId(
  supabase: any,
  tableName: string,
  tenantId: string,
  externalId: string,
  externalSource: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(tableName)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("external_source", externalSource)
    .eq("external_id", externalId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required sync fields
 */
export function validateSyncFields(
  body: any,
  requiredFields: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Always require external_id and external_source for sync
  if (!body.external_id) {
    errors.push("external_id is required for sync operations");
  }

  if (!body.external_source) {
    errors.push("external_source is required for sync operations");
  }

  // Check additional required fields
  for (const field of requiredFields) {
    if (!body[field]) {
      errors.push(`${field} is required`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate bulk sync request body
 */
export function validateBulkSyncBody(
  body: any,
  entityKey: string,
  maxItems: number = 1000,
): { valid: boolean; error?: string; items?: any[] } {
  if (!body[entityKey]) {
    return { valid: false, error: `${entityKey} is required` };
  }

  if (!Array.isArray(body[entityKey])) {
    return { valid: false, error: `${entityKey} must be an array` };
  }

  if (body[entityKey].length === 0) {
    return { valid: true, items: [] };
  }

  if (body[entityKey].length > maxItems) {
    return {
      valid: false,
      error: `Maximum ${maxItems} ${entityKey} per bulk-sync request`,
    };
  }

  return { valid: true, items: body[entityKey] };
}
