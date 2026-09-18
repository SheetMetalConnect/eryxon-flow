import { internalEventHeaders } from "./event-auth.ts";
import { getRuntimeEnv } from "./runtime-env.ts";

// Row-level events (job.*, operation.*, ...) are emitted by database triggers.
// Only ERP sync summaries, which have no table of their own, are dispatched here.
export type SyncEventType = "sync.jobs.completed" | "sync.parts.completed" | "sync.resources.completed" | "sync.batch.completed";

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

async function post(tenantId: string, event: SyncEventType, data: unknown): Promise<void> {
  const supabaseUrl = getRuntimeEnv("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL is required for event dispatch");
  const response = await fetch(`${supabaseUrl}/functions/v1/webhook-dispatch`, {
    method: "POST",
    headers: internalEventHeaders(),
    body: JSON.stringify({ tenant_id: tenantId, event, data }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`webhook-dispatch returned HTTP ${response.status}`);
}

// A failed notification must not read as a failed sync.
function dispatch(tenantId: string, event: SyncEventType, data: unknown): void {
  const pending = post(tenantId, event, data).catch((reason) => console.error("[Events] Dispatch failed", reason));
  (globalThis as { EdgeRuntime?: { waitUntil(task: Promise<void>): void } }).EdgeRuntime?.waitUntil(pending);
}

export function dispatchSyncCompleted(tenantId: string, entityType: "jobs" | "parts" | "resources", data: SyncEventData): void {
  dispatch(tenantId, `sync.${entityType}.completed`, {
    entity_type: entityType, source: data.source,
    summary: { total: data.total, created: data.created, updated: data.updated, skipped: data.skipped, errors: data.errors },
    duration_ms: data.duration_ms, external_ids: data.external_ids, synced_at: new Date().toISOString(),
  });
}

export function dispatchBatchSyncCompleted(tenantId: string, data: {
  entities: string[]; total_records: number; total_created: number; total_updated: number;
  total_skipped: number; total_errors: number; duration_ms: number; source: string;
}): void {
  dispatch(tenantId, "sync.batch.completed", { ...data, synced_at: new Date().toISOString() });
}
