import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";

// Configure CRUD handler with joined data
export default serveApi(
  createCrudHandler({
    table: 'assignments',
    selectFields: `
      id,
      assigned_at,
      status,
      notes,
      created_at,
      updated_at,
      operation:operations (
        id,
        operation_name,
        status,
        part:parts (
          id,
          part_number,
          job:jobs (
            id,
            job_number
          )
        )
      ),
      operator:profiles (
        id,
        username,
        full_name
      ),
      assigned_by:profiles!assignments_assigned_by_id_fkey (
        id,
        username,
        full_name
      )
    `,
    searchFields: [],
    allowedFilters: ['operation_id', 'operator_id', 'status'],
    sortableFields: ['assigned_at', 'created_at', 'status'],
    defaultSort: { field: 'assigned_at', direction: 'desc' },
    softDelete: false,
  })
);
