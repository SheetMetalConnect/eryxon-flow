import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

// Configure CRUD handler for substeps
serveApi(
  createCrudHandler({
    table: 'substeps',
    selectFields: `
      id,
      operation_id,
      name,
      icon_name,
      sequence,
      status,
      notes,
      completed_at,
      completed_by,
      created_at,
      updated_at,
      operation:operations!operation_id (
        id,
        operation_name
      )
    `,
    searchFields: ['name'],
    allowedFilters: ['operation_id', 'status'],
    sortableFields: ['sequence', 'created_at', 'status'],
    defaultSort: { field: 'sequence', direction: 'asc' },
    softDelete: false,
  })
);
