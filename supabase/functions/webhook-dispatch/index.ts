import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

async function dispatchWebhook(
  url: string,
  secretKey: string,
  payload: WebhookPayload,
  webhookId: string,
  supabase: any
) {
  const payloadString = JSON.stringify(payload);

  // Generate HMAC signature
  const signature = createHmac('sha256', secretKey)
    .update(payloadString)
    .digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Eryxon-Signature': `sha256=${signature}`,
        'X-Eryxon-Event': payload.event,
        'User-Agent': 'Eryxon-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const statusCode = response.status;
    const responseText = await response.text();

    // Log the webhook delivery
    await supabase.from('webhook_logs').insert({
      webhook_id: webhookId,
      event_type: payload.event,
      payload: payload,
      status_code: statusCode,
      error_message: statusCode >= 400 ? responseText : null,
    });

    return {
      success: statusCode >= 200 && statusCode < 300,
      statusCode,
      response: responseText,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log the failed delivery
    await supabase.from('webhook_logs').insert({
      webhook_id: webhookId,
      event_type: payload.event,
      payload: payload,
      status_code: null,
      error_message: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ''
  );

  try {
    // This function is called internally, so we use the service role key
    // In production, you might want to add an internal authentication mechanism

    const body = await req.json();
    const { tenant_id, event_type, data } = body;

    if (!tenant_id || !event_type || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenant_id, event_type, data'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all active webhooks for this tenant that are subscribed to this event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('id, url, secret_key, events')
      .eq('tenant_id', tenant_id)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to fetch webhooks: ${error.message}`);
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active webhooks for this tenant',
          dispatched: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter webhooks that are subscribed to this event type
    const subscribedWebhooks = webhooks.filter(wh =>
      wh.events && wh.events.includes(event_type)
    );

    if (subscribedWebhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No webhooks subscribed to this event',
          dispatched: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare payload
    const payload: WebhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: data
    };

    // Dispatch to all subscribed webhooks (in parallel)
    const results = await Promise.all(
      subscribedWebhooks.map(webhook =>
        dispatchWebhook(webhook.url, webhook.secret_key, payload, webhook.id, supabase)
      )
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Dispatched to ${results.length} webhook(s)`,
        dispatched: results.length,
        successful: successCount,
        failed: failureCount,
        results: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in webhook-dispatch:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
