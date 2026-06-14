import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { WebhookValidator } from "@shared/validation/validators/WebhookValidator.ts";

// Configure CRUD handler for webhooks
serveApi(
  createCrudHandler({
    table: 'webhooks',
    selectFields: 'id, url, events, active, secret_key, created_at',
    searchFields: ['url'],
    allowedFilters: ['events', 'active'],
    sortableFields: ['created_at', 'events', 'url'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    // url, events and secret_key are NOT NULL. Validate up front so a missing
    // field returns a 422 instead of a 500 NOT NULL violation (issue #909).
    validator: WebhookValidator,
  })
);
