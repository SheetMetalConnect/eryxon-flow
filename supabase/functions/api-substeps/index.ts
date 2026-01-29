import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

// Configure CRUD handler for substeps
export default serveApi(
  createCrudHandler({
    table: 'substeps',
    selectFields: `
      id,
      operation_id,
      description,
      sequence,
      completed,
      created_at,
      updated_at,
      operation:operations (
        id,
        operation_name,
        part:parts (
          id,
          part_number
        )
      )
    `,
    searchFields: ['description'],
    allowedFilters: ['operation_id', 'completed'],
    sortableFields: ['sequence', 'created_at', 'completed'],
    defaultSort: { field: 'sequence', direction: 'asc' },
    softDelete: false,
  })
);
