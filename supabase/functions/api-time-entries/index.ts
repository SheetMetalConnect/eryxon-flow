import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

// Configure CRUD handler for time entries
serveApi(
  createCrudHandler({
    table: 'time_entries',
    selectFields: `
      id,
      start_time,
      end_time,
      duration,
      is_paused,
      notes,
      time_type,
      created_at,
      operation:operations!operation_id (
        id,
        operation_name,
        part:parts (
          id,
          part_number,
          job:jobs (
            id,
            job_number
          )
        )
      ),
      operator:profiles!operator_id (
        id,
        username,
        full_name
      )
    `,
    searchFields: ['notes'],
    allowedFilters: ['operation_id', 'operator_id', 'time_type'],
    sortableFields: ['start_time', 'end_time', 'duration', 'created_at'],
    defaultSort: { field: 'start_time', direction: 'desc' },
    softDelete: false,
    queryModifier: (query, ctx) => {
      // Handle date range filters
      const startDate = ctx.url.searchParams.get('start_date');
      const endDate = ctx.url.searchParams.get('end_date');

      if (startDate) {
        query = query.gte('start_time', startDate);
      }
      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      return query;
    },
  })
);
