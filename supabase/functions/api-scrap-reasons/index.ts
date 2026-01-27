import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import type { HandlerContext } from "@shared/handler.ts";
import {
  createSuccessResponse,
  BadRequestError,
  ConflictError,
} from "@shared/validation/errorHandler.ts";

// Custom delete handler that checks for foreign key references
async function handleCustomDelete(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const reasonId = url.searchParams.get('id');

  if (!reasonId) {
    throw new BadRequestError('ID parameter is required for deletion');
  }

  // Check if scrap reason is referenced by operation_quantities
  const { data: references } = await supabase
    .from('operation_quantities')
    .select('id')
    .eq('scrap_reason_id', reasonId)
    .limit(1);

  if (references && references.length > 0) {
    throw new ConflictError(
      'Cannot delete scrap reason that is referenced by operation quantities. Set active=false instead.'
    );
  }

  // Perform hard delete
  const { error } = await supabase
    .from('scrap_reasons')
    .delete()
    .eq('id', reasonId)
    .eq('tenant_id', tenantId);

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scrap reason not found');
    }
    throw new Error(`Failed to delete scrap reason: ${error.message}`);
  }

  return createSuccessResponse({ message: 'Scrap reason deleted successfully' });
}

// Configure CRUD handler
export default serveApi(
  createCrudHandler({
    table: 'scrap_reasons',
    selectFields: '*',
    searchFields: ['code', 'description'],
    allowedFilters: ['category', 'active'],
    sortableFields: ['code', 'description', 'category', 'created_at'],
    defaultSort: { field: 'category', direction: 'asc' },
    softDelete: false, // This table uses active flag instead
    customHandlers: {
      delete: handleCustomDelete,
    },
    queryModifier: (query, ctx) => {
      // Apply secondary sort by code
      query = query.order('code', { ascending: true });

      // Default to showing only active scrap reasons unless explicitly requested
      const active = ctx.url.searchParams.get('active');
      if (active === null) {
        query = query.eq('active', true);
      }

      return query;
    },
  })
);
