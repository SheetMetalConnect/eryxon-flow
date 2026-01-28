import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

// Configure CRUD handler for substep templates
export default serveApi(
  createCrudHandler({
    table: 'substep_templates',
    selectFields: `
      id,
      name,
      description,
      operation_type,
      is_global,
      created_at,
      updated_at,
      items:substep_template_items (
        id,
        name,
        notes,
        sequence
      )
    `,
    searchFields: ['name', 'description'],
    allowedFilters: ['operation_type', 'is_global'],
    sortableFields: ['name', 'operation_type', 'created_at'],
    defaultSort: { field: 'name', direction: 'asc' },
    softDelete: false,
    queryModifier: (query, ctx) => {
      // Allow fetching global templates OR tenant-specific templates
      query = query.or(`tenant_id.eq.${ctx.tenantId},is_global.eq.true`);
      // Order template items by sequence
      query = query.order('sequence', { foreignTable: 'substep_template_items', ascending: true });
      return query;
    },
  })
);
