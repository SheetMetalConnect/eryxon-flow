import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

// Configure CRUD handler for webhook logs (read-only)
export default serveApi(
  createCrudHandler({
    table: 'webhook_logs',
    selectFields: `
      id,
      webhook_id,
      event_type,
      status,
      request_body,
      response_status,
      response_body,
      error_message,
      created_at,
      webhook:webhooks (
        id,
        url,
        event_type
      )
    `,
    searchFields: [],
    allowedFilters: ['webhook_id', 'status', 'event_type'],
    sortableFields: ['created_at', 'status'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    queryModifier: async (query, ctx) => {
      // Filter logs to only show logs for webhooks belonging to this tenant
      const { data: webhooks } = await ctx.supabase
        .from('webhooks')
        .select('id')
        .eq('tenant_id', ctx.tenantId);

      if (!webhooks || webhooks.length === 0) {
        // Return empty query if tenant has no webhooks
        query = query.eq('webhook_id', '00000000-0000-0000-0000-000000000000'); // Will return no results
      } else {
        const webhookIds = webhooks.map((w: any) => w.id);
        query = query.in('webhook_id', webhookIds);
      }

      return query;
    },
    customHandlers: {
      // Webhook logs are read-only
      post: async () => {
        throw new Error('Creating webhook logs directly is not allowed');
      },
      patch: async () => {
        throw new Error('Updating webhook logs is not allowed');
      },
      delete: async () => {
        throw new Error('Deleting webhook logs is not allowed');
      },
    },
  })
);
