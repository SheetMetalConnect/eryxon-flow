import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { sanitizeError, constantTimeCompare } from "../_shared/security.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  REQUEST_ID_HEADER,
  RequestLogContext,
  edgeLog,
  persistPilotEvent,
  resolveRequestId,
} from "../_shared/observability.ts";

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
  supabase: any,
  log: RequestLogContext
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

    const delivered = statusCode >= 200 && statusCode < 300;

    // Persist a pilot-critical dispatch failure (ERY-51) so a non-2xx delivery
    // is traceable from the edge log into activity_log under the shared id.
    if (!delivered) {
      const failureLog: RequestLogContext = {
        ...log,
        statusCode,
        eventType: "webhook.dispatch_failed",
        errorCode: "WEBHOOK_DELIVERY_FAILED",
      };
      edgeLog("warn", "webhook.dispatch_failed", failureLog);
      await persistPilotEvent(supabase, {
        ctx: failureLog,
        level: "warn",
        action: "webhook.dispatch_failed",
        description: `Webhook ${webhookId} returned ${statusCode} for event ${payload.event}`,
        entityType: "webhook",
        entityId: webhookId,
        extra: { event: payload.event, http_status: statusCode },
      });
    }

    return {
      success: delivered,
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

    // Persist a pilot-critical dispatch failure (ERY-51) for transport errors
    // (timeout, DNS, connection refused) with the shared request id.
    const failureLog: RequestLogContext = {
      ...log,
      eventType: "webhook.dispatch_failed",
      errorCode: "WEBHOOK_DELIVERY_ERROR",
    };
    edgeLog("error", "webhook.dispatch_failed", failureLog);
    await persistPilotEvent(supabase, {
      ctx: failureLog,
      level: "error",
      action: "webhook.dispatch_failed",
      description: `Webhook ${webhookId} delivery failed for event ${payload.event}: ${errorMessage}`,
      entityType: "webhook",
      entityId: webhookId,
      extra: { event: payload.event, error_message: errorMessage },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

serve(async (req) => {
  // Resolve the request id at the boundary: trust a valid inbound id (forwarded
  // by the lifecycle function that triggered this dispatch) else mint one.
  const requestId = resolveRequestId(req.headers);
  const log: RequestLogContext = {
    requestId,
    service: "webhook-dispatch",
    route: new URL(req.url).pathname,
    method: req.method,
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, [REQUEST_ID_HEADER]: requestId } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ''
  );

  try {
    // Verify internal service-to-service authentication
    const internalSecret = Deno.env.get('INTERNAL_SERVICE_SECRET');
    if (internalSecret) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
      if (!constantTimeCompare(token, internalSecret)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId } }
        );
      }
    }

    const body = await req.json();
    const { tenant_id, event_type, data } = body;

    if (!tenant_id || !event_type || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenant_id, event_type, data'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId } }
      );
    }

    // Attribute downstream dispatch-failure events to this tenant.
    log.tenantId = tenant_id;
    log.eventType = event_type;

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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId } }
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId } }
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
        dispatchWebhook(webhook.url, webhook.secret_key, payload, webhook.id, supabase, log)
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId } }
    );

  } catch (error) {
    console.error('Error in webhook-dispatch:', error);
    const sanitized = sanitizeError(error);
    const errorLog: RequestLogContext = {
      ...log,
      statusCode: 500,
      errorCode: "WEBHOOK_DISPATCH_ERROR",
    };
    edgeLog("error", "request.failed", errorLog);
    // Persist the top-level failure (e.g. webhook fetch query failed) when we
    // already know the tenant.
    await persistPilotEvent(supabase, {
      ctx: { ...errorLog, eventType: "webhook.dispatch_failed" },
      level: "error",
      action: "webhook.dispatch_failed",
      description: sanitized.message,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: sanitized.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId } }
    );
  }
});
