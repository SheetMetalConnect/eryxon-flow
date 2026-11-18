// Mirrors public.webhook_event_name() in the database; the trigger is the source of truth.
export const WEBHOOK_EVENTS = [
  "job.created", "job.updated", "job.started", "job.paused", "job.resumed", "job.completed", "job.deleted",
  "part.created", "part.updated", "part.started", "part.paused", "part.resumed", "part.completed", "part.deleted",
  "operation.created", "operation.updated", "operation.started", "operation.paused", "operation.resumed", "operation.completed", "operation.deleted",
  "batch.created", "batch.updated", "batch.started", "batch.completed", "batch.deleted",
  "issue.created", "issue.updated", "issue.resolved", "issue.deleted",
  "production.reported", "production.deleted",
  "sync.jobs.completed", "sync.parts.completed", "sync.resources.completed", "sync.batch.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_GROUPS = [...new Set(WEBHOOK_EVENTS.map((e) => e.split(".")[0]))];
