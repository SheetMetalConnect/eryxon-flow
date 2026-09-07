import { internalEventHeaders } from "./event-auth.ts";
import { getRuntimeEnv } from "./runtime-env.ts";

export type SyncEventType =
  | "sync.jobs.completed"
  | "sync.parts.completed"
  | "sync.resources.completed"
  | "sync.batch.completed";

export type EntityEventType =
  | "batch.started"
  | "batch.completed"
  | "job.created"
  | "job.updated"
  | "job.started"
  | "job.stopped"
  | "job.completed"
  | "job.resumed"
  | "part.created"
  | "part.updated"
  | "operation.started"
  | "operation.paused"
  | "operation.resumed"
  | "operation.completed"
  | "resource.created"
  | "resource.updated"
  | "issue.created";

export type EventType = SyncEventType | EntityEventType;

export interface EventPayload {
  event: EventType;
  tenant_id: string;
  timestamp: string;
  data: unknown;
}

export interface SyncEventData {
  entity_type: string;
  source: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
  external_ids?: string[];
}

async function dispatchToChannel(
  channel: "webhook-dispatch" | "mqtt-publish",
  tenantId: string,
  eventType: EventType,
  data: unknown,
  requestId?: string,
): Promise<void> {
  const supabaseUrl = getRuntimeEnv("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL is required for event dispatch");
  const response = await fetch(`${supabaseUrl}/functions/v1/${channel}`, {
    method: "POST",
    headers: internalEventHeaders(requestId),
    body: JSON.stringify({ tenant_id: tenantId, event_type: eventType, data }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${channel} returned HTTP ${response.status}`);
  const result = await response.json();
  if (result.success !== true || (result.failed ?? 0) > 0) {
    throw new Error(`${channel} reported unsuccessful delivery`);
  }
}

export function dispatchWebhookEvent(
  tenantId: string,
  eventType: EventType,
  data: unknown,
  requestId?: string,
): Promise<void> {
  return dispatchToChannel("webhook-dispatch", tenantId, eventType, data, requestId);
}

export function dispatchMqttEvent(
  tenantId: string,
  eventType: EventType,
  data: unknown,
): Promise<void> {
  return dispatchToChannel("mqtt-publish", tenantId, eventType, data);
}

// Event failure must not disguise a committed domain mutation as a failed mutation.
export function dispatchEvent(
  tenantId: string,
  eventType: EventType,
  data: unknown,
): Promise<void> {
  const pending = Promise.allSettled([
    dispatchWebhookEvent(tenantId, eventType, data),
    dispatchMqttEvent(tenantId, eventType, data),
  ]).then(results => {
    for (const result of results) {
      if (result.status === "rejected") console.error("[Events] Dispatch failed", result.reason);
    }
  });
  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil(task: Promise<void>): void };
  };
  runtime.EdgeRuntime?.waitUntil(pending);
  return pending;
}

// ============================================================================
// Sync Event Helpers
// ============================================================================

/**
 * Dispatch sync completion event
 *
 * Sends a standardized sync completion event with summary data.
 */
export function dispatchSyncCompleted(
  tenantId: string,
  entityType: "jobs" | "parts" | "resources",
  data: SyncEventData,
): void {
  const eventType = `sync.${entityType}.completed` as SyncEventType;

  dispatchEvent(tenantId, eventType, {
    entity_type: entityType,
    source: data.source,
    summary: {
      total: data.total,
      created: data.created,
      updated: data.updated,
      skipped: data.skipped,
      errors: data.errors,
    },
    duration_ms: data.duration_ms,
    external_ids: data.external_ids,
    synced_at: new Date().toISOString(),
  });
}

/**
 * Dispatch batch sync completion event
 *
 * Sends when a multi-entity sync batch completes.
 */
export function dispatchBatchSyncCompleted(
  tenantId: string,
  data: {
    entities: string[];
    total_records: number;
    total_created: number;
    total_updated: number;
    total_skipped: number;
    total_errors: number;
    duration_ms: number;
    source: string;
  },
): void {
  dispatchEvent(tenantId, "sync.batch.completed", {
    ...data,
    synced_at: new Date().toISOString(),
  });
}

// ============================================================================
// Entity Event Helpers
// ============================================================================

/**
 * Dispatch job created event
 */
export function dispatchJobCreated(
  tenantId: string,
  data: {
    job_id: string;
    job_number: string;
    customer?: string;
    external_id?: string;
    external_source?: string;
  },
): void {
  dispatchEvent(tenantId, "job.created", {
    ...data,
    created_at: new Date().toISOString(),
  });
}

/**
 * Dispatch job updated event
 */
export function dispatchJobUpdated(
  tenantId: string,
  data: {
    job_id: string;
    job_number: string;
    changes?: string[];
    external_id?: string;
  },
): void {
  dispatchEvent(tenantId, "job.updated", {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Dispatch part created event
 */
export function dispatchPartCreated(
  tenantId: string,
  data: {
    part_id: string;
    part_number: string;
    job_id: string;
    external_id?: string;
    external_source?: string;
  },
): void {
  dispatchEvent(tenantId, "part.created", {
    ...data,
    created_at: new Date().toISOString(),
  });
}

/**
 * Dispatch part updated event
 */
export function dispatchPartUpdated(
  tenantId: string,
  data: {
    part_id: string;
    part_number: string;
    changes?: string[];
    external_id?: string;
  },
): void {
  dispatchEvent(tenantId, "part.updated", {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Dispatch resource created event
 */
export function dispatchResourceCreated(
  tenantId: string,
  data: {
    resource_id: string;
    name: string;
    type: string;
    external_id?: string;
    external_source?: string;
  },
): void {
  dispatchEvent(tenantId, "resource.created", {
    ...data,
    created_at: new Date().toISOString(),
  });
}

/**
 * Dispatch resource updated event
 */
export function dispatchResourceUpdated(
  tenantId: string,
  data: {
    resource_id: string;
    name: string;
    changes?: string[];
    external_id?: string;
  },
): void {
  dispatchEvent(tenantId, "resource.updated", {
    ...data,
    updated_at: new Date().toISOString(),
  });
}
