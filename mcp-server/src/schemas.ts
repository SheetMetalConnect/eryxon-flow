import { z } from "zod";

export const id = z.string().uuid();
export const limit = z.number().int().min(1).max(1000).default(50);
export const offset = z.number().int().min(0).default(0);
export const days = z.number().int().min(1).max(365).default(30);
export const productionStatus = z.enum(["not_started", "in_progress", "completed", "on_hold"]);
export const issueStatus = z.enum(["pending", "approved", "rejected", "closed"]);
export const issueSeverity = z.enum(["low", "medium", "high", "critical"]);
export const issueType = z.enum(["general", "ncr"]);
export const ncrCategory = z.enum(["material_defect", "dimensional", "surface_finish", "process_error", "other"]);
export const ncrDisposition = z.enum(["scrap", "rework", "use_as_is", "return_to_supplier"]);
export const batchType = z.enum(["laser_nesting", "tube_batch", "saw_batch", "finishing_batch", "general"]);
export const batchStatus = z.enum(["draft", "ready", "in_progress", "completed", "cancelled", "blocked"]);
export const productionMode = z.enum(["manual", "automated"]);
export const dayType = z.enum(["working", "half_day", "holiday", "closure"]);
export const datetime = z.string().datetime({ offset: true });
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const ROW = { id: z.string() };
export const LIST = {
  data: z.array(z.record(z.string(), z.unknown())),
  pagination: z.object({ offset: z.number(), limit: z.number(), total: z.number(), has_more: z.boolean() }),
};
export const DELETED = { id: z.string(), deleted: z.boolean() };
export const TRANSITION = { operation_id: z.string(), status: z.string(), previous_status: z.string(), changed: z.boolean() };

// Mirrors src/lib/webhookEvents.ts (the database trigger is the source of truth); schemas.test.ts keeps them equal.
export const WEBHOOK_EVENTS = [
  "job.created", "job.updated", "job.started", "job.paused", "job.resumed", "job.completed", "job.deleted",
  "part.created", "part.updated", "part.started", "part.paused", "part.resumed", "part.completed", "part.deleted",
  "operation.created", "operation.updated", "operation.started", "operation.paused", "operation.resumed", "operation.completed", "operation.deleted",
  "batch.created", "batch.updated", "batch.started", "batch.completed", "batch.deleted",
  "issue.created", "issue.updated", "issue.resolved", "issue.deleted",
  "production.reported", "production.deleted",
  "sync.jobs.completed", "sync.parts.completed", "sync.resources.completed", "sync.batch.completed",
] as const;
export const webhookEvent = z.enum(WEBHOOK_EVENTS);
