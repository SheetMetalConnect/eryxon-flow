// v1774629040
import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

// Configure CRUD handler with joined data
serveApi(
  createCrudHandler({
    table: 'assignments',
    selectFields: `
      id,
      job_id,
      part_id,
      operator_id,
      shop_floor_operator_id,
      assigned_by,
      status,
      created_at,
      updated_at,
      job:jobs!job_id (
        id,
        job_number
      ),
      part:parts!part_id (
        id,
        part_number
      ),
      operator:profiles!operator_id (
        id,
        username,
        full_name
      ),
      shop_floor_operator:operators!shop_floor_operator_id (
        id,
        full_name
      ),
      assigned_by_user:profiles!assigned_by (
        id,
        username,
        full_name
      )
    `,
    searchFields: [],
    allowedFilters: ['job_id', 'part_id', 'operator_id', 'shop_floor_operator_id', 'status'],
    sortableFields: ['created_at', 'status'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
  })
);
