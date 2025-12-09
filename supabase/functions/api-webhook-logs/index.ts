import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateAndSetContext } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { handleOptions, handleError } from "../_shared/validation/errorHandler.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    // Only GET method supported
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET method is supported' }
        }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const webhookId = url.searchParams.get('webhook_id');
    const status = url.searchParams.get('status');
    const eventType = url.searchParams.get('event_type');

    let limit = parseInt(url.searchParams.get('limit') || '100');
    if (limit < 1) limit = 100;
    if (limit > 1000) limit = 1000;

    const offset = parseInt(url.searchParams.get('offset') || '0');

    // First get webhooks for this tenant to filter logs
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('id')
      .eq('tenant_id', tenantId);

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            webhook_logs: [],
            pagination: { limit, offset, total: 0 }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookIds = webhooks.map(w => w.id);

    let query = supabase
      .from('webhook_logs')
      .select(`
        id,
        event_type,
        payload,
        status,
        response_status,
        response_body,
        error_message,
        created_at,
        webhook:webhooks (
          id,
          url,
          event_type
        )
      `)
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (webhookId) {
      query = query.eq('webhook_id', webhookId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: webhookLogs, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch webhook logs: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          webhook_logs: webhookLogs || [],
          pagination: {
            limit,
            offset,
            total: count || webhookLogs?.length || 0
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-webhook-logs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
