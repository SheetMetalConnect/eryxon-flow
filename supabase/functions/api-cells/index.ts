import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";

// Configure CRUD handler with sync support
export default serveApi(
  createCrudHandler({
    table: 'cells',
    selectFields: 'id, name, color, sequence, active, created_at, updated_at',
    searchFields: ['name'],
    allowedFilters: ['active'],
    sortableFields: ['name', 'sequence', 'created_at'],
    defaultSort: { field: 'sequence', direction: 'asc' },
    softDelete: false, // This table uses active flag
    enableSync: true, // Enable PUT /sync and POST /bulk-sync endpoints
    syncIdField: 'external_id',
  })
);
