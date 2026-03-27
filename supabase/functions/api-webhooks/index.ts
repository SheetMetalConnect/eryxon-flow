import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

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
  })
);
