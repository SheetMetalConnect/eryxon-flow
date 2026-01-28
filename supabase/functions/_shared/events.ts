/**
 * Event Dispatch Module
 *
 * Provides a unified interface for dispatching events via webhooks and MQTT.
 * Used by sync operations and other event-producing components.
 */

// ============================================================================
// Types
// ============================================================================

export type SyncEventType =
  | "sync.jobs.completed"
  | "sync.parts.completed"
  | "sync.resources.completed"
  | "sync.batch.completed";

export type EntityEventType =
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
  data: any;
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

// ============================================================================
// Event Dispatch Functions
// ============================================================================

/**
 * Dispatch event to webhooks (non-blocking)
 *
 * Fires webhook dispatch asynchronously without waiting for completion.
 * Errors are logged but don't affect the calling operation.
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: EventType,
  data: any,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[Events] Missing Supabase config for webhook dispatch");
    return;
  }

  // Fire and forget - don't await
  fetch(`${supabaseUrl}/functions/v1/webhook-dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      event_type: eventType,
      data,
    }),
  }).catch((err) => {
    console.error("[Events] Failed to dispatch webhook:", err);
  });
}

/**
 * Dispatch event to MQTT (non-blocking)
 *
 * Fires MQTT publish asynchronously without waiting for completion.
 */
export async function dispatchMqttEvent(
  tenantId: string,
  eventType: EventType,
  data: any,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[Events] Missing Supabase config for MQTT dispatch");
    return;
  }

  // Fire and forget - don't await
  fetch(`${supabaseUrl}/functions/v1/mqtt-publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      event_type: eventType,
      data,
    }),
  }).catch((err) => {
    console.error("[Events] Failed to dispatch MQTT event:", err);
  });
}

/**
 * Dispatch event to all configured channels (webhooks + MQTT)
 *
 * Non-blocking - fires both dispatchers without waiting.
 */
export function dispatchEvent(
  tenantId: string,
  eventType: EventType,
  data: any,
): void {
  // Dispatch to webhooks
  dispatchWebhookEvent(tenantId, eventType, data);

  // Dispatch to MQTT
  dispatchMqttEvent(tenantId, eventType, data);
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
