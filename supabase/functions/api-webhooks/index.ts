import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";

// Configure CRUD handler for webhooks
export default serveApi(
  createCrudHandler({
    table: 'webhooks',
    selectFields: 'id, url, event_type, active, secret_key, created_at, updated_at',
    searchFields: ['url'],
    allowedFilters: ['event_type', 'active'],
    sortableFields: ['created_at', 'event_type', 'url'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
  })
);
