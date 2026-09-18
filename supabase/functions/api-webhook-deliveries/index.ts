import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

const readOnly = () => { throw new Error("Webhook deliveries are written by the dispatcher only"); };

serveApi(
  createCrudHandler({
    table: 'webhook_deliveries',
    selectFields: 'id, webhook_id, event_id, event, status, status_code, attempts, latency_ms, error, payload, created_at, webhook:webhooks (id, name, url)',
    searchFields: [],
    allowedFilters: ['webhook_id', 'event', 'status', 'status_code'],
    sortableFields: ['created_at', 'status_code'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    customHandlers: { post: readOnly, patch: readOnly, delete: readOnly },
  })
);
