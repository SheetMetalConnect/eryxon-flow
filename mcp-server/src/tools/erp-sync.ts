/**
 * ERP Sync Tools Module
 *
 * Provides MCP tools for ERP integration operations:
 * - Sync check/diff (preview what would change)
 * - Sync jobs, parts, resources from ERP
 * - Lookup entities by external_id
 * - Get sync status and history
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// ============================================================================
// Tool Definitions
// ============================================================================

const tools: Tool[] = [
  // Sync Check/Diff Tool
  {
    name: "erp_sync_diff",
    description:
      "Check what would change when syncing data from ERP. Returns status for each record (create/update/unchanged) without making changes. Use this for incremental sync preview.",
    inputSchema: {
      type: "object",
      properties: {
        jobs: {
          type: "array",
          description: "Array of jobs to check for sync",
          items: {
            type: "object",
            properties: {
              external_id: { type: "string", description: "ERP system ID" },
              external_source: { type: "string", description: "ERP system name (e.g., SAP, NetSuite)" },
              job_number: { type: "string" },
              customer_name: { type: "string" },
              due_date: { type: "string" },
              priority: { type: "number" },
            },
            required: ["external_id", "external_source", "job_number"],
          },
        },
        parts: {
          type: "array",
          description: "Array of parts to check for sync",
          items: {
            type: "object",
            properties: {
              external_id: { type: "string", description: "ERP system ID" },
              external_source: { type: "string", description: "ERP system name" },
              part_number: { type: "string" },
              job_external_id: { type: "string", description: "Parent job's external_id" },
              material: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["external_id", "external_source", "part_number"],
          },
        },
        resources: {
          type: "array",
          description: "Array of resources to check for sync",
          items: {
            type: "object",
            properties: {
              external_id: { type: "string", description: "ERP system ID" },
              external_source: { type: "string", description: "ERP system name" },
              name: { type: "string" },
              type: { type: "string", description: "Resource type (machine, tool, fixture)" },
            },
            required: ["external_id", "external_source", "name", "type"],
          },
        },
      },
    },
  },

  // Sync Execute Tool
  {
    name: "erp_sync_execute",
    description:
      "Execute sync from ERP data. Creates or updates jobs, parts, and resources. Skips unchanged records by default. Returns detailed results for each record.",
    inputSchema: {
      type: "object",
      properties: {
        jobs: {
          type: "array",
          description: "Array of jobs to sync",
          items: {
            type: "object",
            properties: {
              external_id: { type: "string" },
              external_source: { type: "string" },
              job_number: { type: "string" },
              customer_name: { type: "string" },
              due_date: { type: "string" },
              priority: { type: "number" },
              notes: { type: "string" },
              metadata: { type: "object" },
            },
            required: ["external_id", "external_source", "job_number"],
          },
        },
        parts: {
          type: "array",
          description: "Array of parts to sync",
          items: {
            type: "object",
            properties: {
              external_id: { type: "string" },
              external_source: { type: "string" },
              part_number: { type: "string" },
              job_id: { type: "string", description: "Internal job UUID" },
              job_external_id: { type: "string", description: "Parent job's external_id" },
              material: { type: "string" },
              quantity: { type: "number" },
              notes: { type: "string" },
              metadata: { type: "object" },
            },
            required: ["external_id", "external_source", "part_number"],
          },
        },
        resources: {
          type: "array",
          description: "Array of resources to sync",
          items: {
            type: "object",
            properties: {
              external_id: { type: "string" },
              external_source: { type: "string" },
              name: { type: "string" },
              type: { type: "string" },
              description: { type: "string" },
              identifier: { type: "string" },
              location: { type: "string" },
              metadata: { type: "object" },
            },
            required: ["external_id", "external_source", "name", "type"],
          },
        },
        options: {
          type: "object",
          description: "Sync options",
          properties: {
            skip_unchanged: {
              type: "boolean",
              description: "Skip records with unchanged sync_hash (default: true)",
            },
            continue_on_error: {
              type: "boolean",
              description: "Continue syncing if an error occurs (default: true)",
            },
            record_history: {
              type: "boolean",
              description: "Log sync to sync_imports table (default: true)",
            },
          },
        },
      },
    },
  },

  // Lookup by External ID Tool
  {
    name: "erp_lookup_external_id",
    description:
      "Find an entity by its external_id and external_source. Useful for checking if an ERP record exists in Eryxon.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["job", "part", "resource", "operation"],
          description: "Type of entity to look up",
        },
        external_id: {
          type: "string",
          description: "The external ID from ERP system",
        },
        external_source: {
          type: "string",
          description: "The ERP system name (e.g., SAP, NetSuite, Odoo)",
        },
      },
      required: ["entity_type", "external_id", "external_source"],
    },
  },

  // Get Sync Status/History Tool
  {
    name: "erp_sync_status",
    description:
      "Get sync status and history. Shows recent sync operations with their results.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["jobs", "parts", "resources", "operations"],
          description: "Filter by entity type (optional)",
        },
        source: {
          type: "string",
          description: "Filter by sync source (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum number of records to return (default: 10, max: 50)",
        },
      },
    },
  },

  // Batch Lookup Tool
  {
    name: "erp_batch_lookup",
    description:
      "Lookup multiple entities by their external_ids in a single request. More efficient than multiple individual lookups.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["jobs", "parts", "resources"],
          description: "Type of entities to look up",
        },
        external_source: {
          type: "string",
          description: "The ERP system name",
        },
        external_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of external IDs to look up",
        },
      },
      required: ["entity_type", "external_source", "external_ids"],
    },
  },

  // Resolve External IDs Tool
  {
    name: "erp_resolve_ids",
    description:
      "Convert external_ids to internal Eryxon UUIDs. Useful when syncing related entities.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["jobs", "parts", "resources"],
          description: "Type of entities to resolve",
        },
        external_source: {
          type: "string",
          description: "The ERP system name",
        },
        external_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of external IDs to resolve",
        },
      },
      required: ["entity_type", "external_source", "external_ids"],
    },
  },
];

// ============================================================================
// Handler Implementations
// ============================================================================

/**
 * Generate sync hash for change detection
 */
async function generateSyncHash(payload: any): Promise<string> {
  // Normalize payload (remove non-sync fields)
  const normalized = normalizePayload(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(normalized));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}

function normalizePayload(payload: any): any {
  if (payload === null || payload === undefined) return payload;
  if (Array.isArray(payload)) return payload.map(normalizePayload);
  if (typeof payload === "object") {
    const excludeFields = new Set([
      "id", "tenant_id", "created_at", "updated_at", "deleted_at",
      "synced_at", "sync_hash", "cached_at"
    ]);
    const normalized: any = {};
    const sortedKeys = Object.keys(payload).sort();
    for (const key of sortedKeys) {
      if (!excludeFields.has(key) && payload[key] !== undefined) {
        normalized[key] = normalizePayload(payload[key]);
      }
    }
    return normalized;
  }
  return payload;
}

/**
 * Prefetch existing records by external IDs
 */
async function prefetchExisting(
  supabase: any,
  tableName: string,
  items: any[],
): Promise<Map<string, any>> {
  if (items.length === 0) return new Map();

  // Group by external_source
  const bySource = new Map<string, string[]>();
  for (const item of items) {
    if (!item.external_id || !item.external_source) continue;
    const ids = bySource.get(item.external_source) || [];
    ids.push(item.external_id);
    bySource.set(item.external_source, ids);
  }

  const results = new Map<string, any>();

  for (const [source, externalIds] of bySource) {
    const { data, error } = await supabase
      .from(tableName)
      .select("id, external_id, external_source, sync_hash")
      .eq("external_source", source)
      .in("external_id", externalIds)
      .is("deleted_at", null);

    if (data) {
      for (const record of data) {
        results.set(`${record.external_source}:${record.external_id}`, record);
      }
    }
  }

  return results;
}

// ============================================================================
// ERP Sync Diff Handler
// ============================================================================

const erpSyncDiff: ToolHandler = async (args, supabase) => {
  try {
    const results: any = {};

    // Process jobs
    if (args.jobs && Array.isArray(args.jobs) && args.jobs.length > 0) {
      const existing = await prefetchExisting(supabase, "jobs", args.jobs);
      const jobResults = [];

      for (const job of args.jobs) {
        if (!job.external_id || !job.external_source || !job.job_number) {
          jobResults.push({
            external_id: job.external_id || "unknown",
            status: "error",
            error: "Missing required fields",
          });
          continue;
        }

        const key = `${job.external_source}:${job.external_id}`;
        const existingJob = existing.get(key);

        if (existingJob) {
          const newHash = await generateSyncHash(job);
          if (existingJob.sync_hash === newHash) {
            jobResults.push({
              external_id: job.external_id,
              status: "unchanged",
              existing_id: existingJob.id,
            });
          } else {
            jobResults.push({
              external_id: job.external_id,
              status: "update",
              existing_id: existingJob.id,
            });
          }
        } else {
          jobResults.push({
            external_id: job.external_id,
            status: "create",
          });
        }
      }

      results.jobs = {
        total: args.jobs.length,
        to_create: jobResults.filter((r: any) => r.status === "create").length,
        to_update: jobResults.filter((r: any) => r.status === "update").length,
        unchanged: jobResults.filter((r: any) => r.status === "unchanged").length,
        errors: jobResults.filter((r: any) => r.status === "error").length,
        records: jobResults,
      };
    }

    // Process parts
    if (args.parts && Array.isArray(args.parts) && args.parts.length > 0) {
      const existing = await prefetchExisting(supabase, "parts", args.parts);
      const partResults = [];

      for (const part of args.parts) {
        if (!part.external_id || !part.external_source || !part.part_number) {
          partResults.push({
            external_id: part.external_id || "unknown",
            status: "error",
            error: "Missing required fields",
          });
          continue;
        }

        const key = `${part.external_source}:${part.external_id}`;
        const existingPart = existing.get(key);

        if (existingPart) {
          const newHash = await generateSyncHash(part);
          if (existingPart.sync_hash === newHash) {
            partResults.push({
              external_id: part.external_id,
              status: "unchanged",
              existing_id: existingPart.id,
            });
          } else {
            partResults.push({
              external_id: part.external_id,
              status: "update",
              existing_id: existingPart.id,
            });
          }
        } else {
          partResults.push({
            external_id: part.external_id,
            status: "create",
          });
        }
      }

      results.parts = {
        total: args.parts.length,
        to_create: partResults.filter((r: any) => r.status === "create").length,
        to_update: partResults.filter((r: any) => r.status === "update").length,
        unchanged: partResults.filter((r: any) => r.status === "unchanged").length,
        errors: partResults.filter((r: any) => r.status === "error").length,
        records: partResults,
      };
    }

    // Process resources
    if (args.resources && Array.isArray(args.resources) && args.resources.length > 0) {
      const existing = await prefetchExisting(supabase, "resources", args.resources);
      const resourceResults = [];

      for (const resource of args.resources) {
        if (!resource.external_id || !resource.external_source || !resource.name || !resource.type) {
          resourceResults.push({
            external_id: resource.external_id || "unknown",
            status: "error",
            error: "Missing required fields",
          });
          continue;
        }

        const key = `${resource.external_source}:${resource.external_id}`;
        const existingResource = existing.get(key);

        if (existingResource) {
          const newHash = await generateSyncHash(resource);
          if (existingResource.sync_hash === newHash) {
            resourceResults.push({
              external_id: resource.external_id,
              status: "unchanged",
              existing_id: existingResource.id,
            });
          } else {
            resourceResults.push({
              external_id: resource.external_id,
              status: "update",
              existing_id: existingResource.id,
            });
          }
        } else {
          resourceResults.push({
            external_id: resource.external_id,
            status: "create",
          });
        }
      }

      results.resources = {
        total: args.resources.length,
        to_create: resourceResults.filter((r: any) => r.status === "create").length,
        to_update: resourceResults.filter((r: any) => r.status === "update").length,
        unchanged: resourceResults.filter((r: any) => r.status === "unchanged").length,
        errors: resourceResults.filter((r: any) => r.status === "error").length,
        records: resourceResults,
      };
    }

    return jsonResponse(results, "Sync diff completed");
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// ERP Sync Execute Handler
// ============================================================================

const erpSyncExecute: ToolHandler = async (args, supabase) => {
  try {
    const inputOptions = args.options as { skip_unchanged?: boolean; continue_on_error?: boolean; record_history?: boolean } | undefined;
    const options = {
      skip_unchanged: inputOptions?.skip_unchanged ?? true,
      continue_on_error: inputOptions?.continue_on_error ?? true,
      record_history: inputOptions?.record_history ?? true,
    };

    const results: any = {};
    const now = new Date().toISOString();

    // Sync jobs
    if (args.jobs && Array.isArray(args.jobs) && args.jobs.length > 0) {
      const existing = await prefetchExisting(supabase, "jobs", args.jobs);
      const jobResults = [];
      let created = 0, updated = 0, skipped = 0, errors = 0;

      for (const job of args.jobs) {
        try {
          if (!job.external_id || !job.external_source || !job.job_number) {
            jobResults.push({ external_id: job.external_id, action: "error", error: "Missing required fields" });
            errors++;
            continue;
          }

          const key = `${job.external_source}:${job.external_id}`;
          const existingJob = existing.get(key);
          const syncHash = await generateSyncHash(job);

          if (existingJob) {
            if (options.skip_unchanged && existingJob.sync_hash === syncHash) {
              jobResults.push({ external_id: job.external_id, id: existingJob.id, action: "skipped" });
              skipped++;
              continue;
            }

            const { data, error } = await supabase
              .from("jobs")
              .update({
                job_number: job.job_number,
                customer: job.customer_name || job.customer,
                due_date: job.due_date,
                priority: job.priority,
                notes: job.notes,
                metadata: job.metadata,
                synced_at: now,
                sync_hash: syncHash,
                updated_at: now,
              })
              .eq("id", existingJob.id)
              .select("id")
              .single();

            if (error) throw error;
            jobResults.push({ external_id: job.external_id, id: data.id, action: "updated" });
            updated++;
          } else {
            const { data, error } = await supabase
              .from("jobs")
              .insert({
                job_number: job.job_number,
                customer: job.customer_name || job.customer,
                due_date: job.due_date,
                priority: job.priority || 0,
                notes: job.notes,
                metadata: job.metadata,
                status: job.status || "not_started",
                external_id: job.external_id,
                external_source: job.external_source,
                synced_at: now,
                sync_hash: syncHash,
              })
              .select("id")
              .single();

            if (error) throw error;
            jobResults.push({ external_id: job.external_id, id: data.id, action: "created" });
            created++;
          }
        } catch (err: any) {
          jobResults.push({ external_id: job.external_id, action: "error", error: err.message });
          errors++;
          if (!options.continue_on_error) break;
        }
      }

      results.jobs = {
        total: args.jobs.length,
        created,
        updated,
        skipped,
        errors,
        results: jobResults,
      };
    }

    // Sync parts (similar pattern)
    if (args.parts && Array.isArray(args.parts) && args.parts.length > 0) {
      const existing = await prefetchExisting(supabase, "parts", args.parts);

      // Resolve job external IDs
      const jobExternalIds = [...new Set(args.parts.filter((p: any) => p.job_external_id).map((p: any) => p.job_external_id))];
      const jobIdMap = new Map<string, string>();
      if (jobExternalIds.length > 0) {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, external_id")
          .in("external_id", jobExternalIds)
          .is("deleted_at", null);
        if (jobs) {
          for (const j of jobs) {
            jobIdMap.set(j.external_id, j.id);
          }
        }
      }

      const partResults = [];
      let created = 0, updated = 0, skipped = 0, errors = 0;

      for (const part of args.parts) {
        try {
          if (!part.external_id || !part.external_source || !part.part_number) {
            partResults.push({ external_id: part.external_id, action: "error", error: "Missing required fields" });
            errors++;
            continue;
          }

          let jobId = part.job_id;
          if (!jobId && part.job_external_id) {
            jobId = jobIdMap.get(part.job_external_id);
          }
          if (!jobId) {
            partResults.push({ external_id: part.external_id, action: "error", error: "job_id or valid job_external_id required" });
            errors++;
            continue;
          }

          const key = `${part.external_source}:${part.external_id}`;
          const existingPart = existing.get(key);
          const syncHash = await generateSyncHash(part);

          if (existingPart) {
            if (options.skip_unchanged && existingPart.sync_hash === syncHash) {
              partResults.push({ external_id: part.external_id, id: existingPart.id, action: "skipped" });
              skipped++;
              continue;
            }

            const { data, error } = await supabase
              .from("parts")
              .update({
                job_id: jobId,
                part_number: part.part_number,
                material: part.material || "Unknown",
                quantity: part.quantity || 1,
                notes: part.notes,
                metadata: part.metadata,
                synced_at: now,
                sync_hash: syncHash,
                updated_at: now,
              })
              .eq("id", existingPart.id)
              .select("id")
              .single();

            if (error) throw error;
            partResults.push({ external_id: part.external_id, id: data.id, action: "updated" });
            updated++;
          } else {
            const { data, error } = await supabase
              .from("parts")
              .insert({
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
              })
              .select("id")
              .single();

            if (error) throw error;
            partResults.push({ external_id: part.external_id, id: data.id, action: "created" });
            created++;
          }
        } catch (err: any) {
          partResults.push({ external_id: part.external_id, action: "error", error: err.message });
          errors++;
          if (!options.continue_on_error) break;
        }
      }

      results.parts = {
        total: args.parts.length,
        created,
        updated,
        skipped,
        errors,
        results: partResults,
      };
    }

    // Sync resources
    if (args.resources && Array.isArray(args.resources) && args.resources.length > 0) {
      const existing = await prefetchExisting(supabase, "resources", args.resources);
      const resourceResults = [];
      let created = 0, updated = 0, skipped = 0, errors = 0;

      for (const resource of args.resources) {
        try {
          if (!resource.external_id || !resource.external_source || !resource.name || !resource.type) {
            resourceResults.push({ external_id: resource.external_id, action: "error", error: "Missing required fields" });
            errors++;
            continue;
          }

          const key = `${resource.external_source}:${resource.external_id}`;
          const existingResource = existing.get(key);
          const syncHash = await generateSyncHash(resource);

          if (existingResource) {
            if (options.skip_unchanged && existingResource.sync_hash === syncHash) {
              resourceResults.push({ external_id: resource.external_id, id: existingResource.id, action: "skipped" });
              skipped++;
              continue;
            }

            const { data, error } = await supabase
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
              .eq("id", existingResource.id)
              .select("id")
              .single();

            if (error) throw error;
            resourceResults.push({ external_id: resource.external_id, id: data.id, action: "updated" });
            updated++;
          } else {
            const { data, error } = await supabase
              .from("resources")
              .insert({
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

            if (error) throw error;
            resourceResults.push({ external_id: resource.external_id, id: data.id, action: "created" });
            created++;
          }
        } catch (err: any) {
          resourceResults.push({ external_id: resource.external_id, action: "error", error: err.message });
          errors++;
          if (!options.continue_on_error) break;
        }
      }

      results.resources = {
        total: args.resources.length,
        created,
        updated,
        skipped,
        errors,
        results: resourceResults,
      };
    }

    return jsonResponse(results, "Sync completed");
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// Lookup by External ID Handler
// ============================================================================

const erpLookupExternalId: ToolHandler = async (args, supabase) => {
  try {
    const { entity_type, external_id, external_source } = args as {
      entity_type: string;
      external_id: string;
      external_source: string;
    };

    const tableName = entity_type === "job" ? "jobs" : entity_type === "part" ? "parts" : entity_type === "operation" ? "operations" : "resources";

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("external_source", external_source)
      .eq("external_id", external_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return jsonResponse(
        { found: false, entity_type, external_id, external_source },
        `No ${entity_type} found with external_id "${external_id}" from ${external_source}`,
      );
    }

    return jsonResponse(
      { found: true, entity_type, entity: data },
      `Found ${entity_type} with ID ${data.id}`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// Sync Status Handler
// ============================================================================

const erpSyncStatus: ToolHandler = async (args, supabase) => {
  try {
    const limit = Math.min(typeof args.limit === "number" ? args.limit : 10, 50);

    let query = supabase
      .from("sync_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (args.entity_type) {
      query = query.eq("entity_type", args.entity_type);
    }

    if (args.source) {
      query = query.eq("source", args.source);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total_syncs: data?.length || 0,
      successful: data?.filter((s: any) => s.status === "completed").length || 0,
      failed: data?.filter((s: any) => s.status === "failed").length || 0,
      total_created: data?.reduce((sum: number, s: any) => sum + (s.created_count || 0), 0) || 0,
      total_updated: data?.reduce((sum: number, s: any) => sum + (s.updated_count || 0), 0) || 0,
    };

    return jsonResponse({ stats, history: data || [] }, "Sync status retrieved");
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// Batch Lookup Handler
// ============================================================================

const erpBatchLookup: ToolHandler = async (args, supabase) => {
  try {
    const { entity_type, external_source, external_ids } = args as {
      entity_type: string;
      external_source: string;
      external_ids: string[];
    };

    if (!external_ids || external_ids.length === 0) {
      return jsonResponse({ found: [], not_found: [] }, "No external IDs provided");
    }

    const { data, error } = await supabase
      .from(entity_type)
      .select("id, external_id, external_source")
      .eq("external_source", external_source)
      .in("external_id", external_ids)
      .is("deleted_at", null);

    if (error) throw error;

    const foundIds = new Set((data || []).map((r: any) => r.external_id));
    const notFound = external_ids.filter((id) => !foundIds.has(id));

    return jsonResponse(
      {
        found: data || [],
        not_found: notFound,
        summary: {
          requested: external_ids.length,
          found: data?.length || 0,
          not_found: notFound.length,
        },
      },
      `Found ${data?.length || 0} of ${external_ids.length} ${entity_type}`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// Resolve IDs Handler
// ============================================================================

const erpResolveIds: ToolHandler = async (args, supabase) => {
  try {
    const { entity_type, external_source, external_ids } = args as {
      entity_type: string;
      external_source: string;
      external_ids: string[];
    };

    if (!external_ids || external_ids.length === 0) {
      return jsonResponse({ mappings: {} }, "No external IDs provided");
    }

    const { data, error } = await supabase
      .from(entity_type)
      .select("id, external_id")
      .eq("external_source", external_source)
      .in("external_id", external_ids)
      .is("deleted_at", null);

    if (error) throw error;

    const mappings: Record<string, string> = {};
    for (const record of data || []) {
      mappings[record.external_id] = record.id;
    }

    const unmapped = external_ids.filter((id) => !mappings[id]);

    return jsonResponse(
      {
        mappings,
        unmapped,
        summary: {
          requested: external_ids.length,
          resolved: Object.keys(mappings).length,
          not_found: unmapped.length,
        },
      },
      `Resolved ${Object.keys(mappings).length} of ${external_ids.length} IDs`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// Module Export
// ============================================================================

const handlers = new Map<string, ToolHandler>([
  ["erp_sync_diff", erpSyncDiff],
  ["erp_sync_execute", erpSyncExecute],
  ["erp_lookup_external_id", erpLookupExternalId],
  ["erp_sync_status", erpSyncStatus],
  ["erp_batch_lookup", erpBatchLookup],
  ["erp_resolve_ids", erpResolveIds],
]);

export const erpSyncModule: ToolModule = {
  tools,
  handlers,
};
