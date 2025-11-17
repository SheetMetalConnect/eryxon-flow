import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function authenticateApiKey(authHeader: string | null, supabase: any) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith('ery_live_') && !apiKey.startsWith('ery_test_')) {
    return null;
  }

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, tenant_id')
    .eq('active', true);

  if (!keys || keys.length === 0) return null;

  for (const key of keys) {
    const { data: fullKey } = await supabase
      .from('api_keys')
      .select('key_hash, tenant_id')
      .eq('id', key.id)
      .single();

    if (fullKey && await bcrypt.compare(apiKey, fullKey.key_hash)) {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id);

      return fullKey.tenant_id;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const tenantId = await authenticateApiKey(req.headers.get('authorization'), supabase);

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
