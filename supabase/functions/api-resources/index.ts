import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";

// Configure CRUD handler for resources with sync support
export default serveApi(
  createCrudHandler({
    table: 'resources',
    selectFields: '*',
    searchFields: ['name', 'description', 'identifier'],
    allowedFilters: ['type', 'status', 'active', 'external_source', 'external_id'],
    sortableFields: ['name', 'type', 'status', 'created_at'],
    defaultSort: { field: 'name', direction: 'asc' },
    softDelete: true,
    enableSync: true,
    syncIdField: 'external_id',
  })
);
