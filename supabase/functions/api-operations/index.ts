import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

serveApi(
  createCrudHandler({
    table: 'operations',
    selectFields: `
      id, operation_name, sequence, status, estimated_time, actual_time,
      cell_id, part_id, planned_start, planned_end,
      started_at, completed_at, created_at, updated_at,
      cell:cells!cell_id (id, name, color),
      part:parts!part_id (id, part_number, material, job:jobs(id, job_number))
    `,
    searchFields: ['operation_name'],
    allowedFilters: ['cell_id', 'part_id', 'status'],
    sortableFields: ['sequence', 'operation_name', 'created_at', 'status'],
    defaultSort: { field: 'sequence', direction: 'asc' },
    softDelete: true,
  })
);
