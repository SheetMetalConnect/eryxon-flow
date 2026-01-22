import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";

// Configure CRUD handler for operation quantities
export default serveApi(
  createCrudHandler({
    table: 'operation_quantities',
    selectFields: `
      *,
      operation:operations (
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
      scrap_reason:scrap_reasons (
        id,
        code,
        description,
        category
      ),
      recorded_by_user:profiles!recorded_by (
        id,
        full_name,
        username
      )
    `,
    searchFields: ['material_lot'],
    allowedFilters: ['operation_id', 'material_lot', 'scrap_reason_id', 'recorded_by'],
    sortableFields: ['recorded_at', 'quantity_good', 'quantity_scrap', 'quantity_rework'],
    defaultSort: { field: 'recorded_at', direction: 'desc' },
    softDelete: false,
    queryModifier: async (query, ctx) => {
      // Handle date range filters
      const fromDate = ctx.url.searchParams.get('from_date');
      const toDate = ctx.url.searchParams.get('to_date');
      const hasScrap = ctx.url.searchParams.get('has_scrap');
      const hasRework = ctx.url.searchParams.get('has_rework');
      const partId = ctx.url.searchParams.get('part_id');
      const jobId = ctx.url.searchParams.get('job_id');

      if (fromDate) {
        query = query.gte('recorded_at', fromDate);
      }
      if (toDate) {
        query = query.lte('recorded_at', toDate);
      }
      if (hasScrap === 'true') {
        query = query.gt('quantity_scrap', 0);
      }
      if (hasRework === 'true') {
        query = query.gt('quantity_rework', 0);
      }

      // Handle part_id filter (requires getting operations for that part)
      if (partId) {
        const { data: operations } = await ctx.supabase
          .from('operations')
          .select('id')
          .eq('part_id', partId)
          .eq('tenant_id', ctx.tenantId);

        if (operations && operations.length > 0) {
          const operationIds = operations.map((op: any) => op.id);
          query = query.in('operation_id', operationIds);
        } else {
          // No operations for this part, return empty
          query = query.eq('operation_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      // Handle job_id filter (requires getting parts for that job, then operations)
      if (jobId) {
        const { data: parts } = await ctx.supabase
          .from('parts')
          .select('id')
          .eq('job_id', jobId)
          .eq('tenant_id', ctx.tenantId);

        if (parts && parts.length > 0) {
          const partIds = parts.map((p: any) => p.id);
          const { data: operations } = await ctx.supabase
            .from('operations')
            .select('id')
            .in('part_id', partIds)
            .eq('tenant_id', ctx.tenantId);

          if (operations && operations.length > 0) {
            const operationIds = operations.map((op: any) => op.id);
            query = query.in('operation_id', operationIds);
          } else {
            // No operations for this job, return empty
            query = query.eq('operation_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          // No parts for this job, return empty
          query = query.eq('operation_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      return query;
    },
  })
);
