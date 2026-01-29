import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MqttPublisher {
  id: string;
  broker_url: string;
  port: number;
  username: string | null;
  password: string | null;
  topic_pattern: string;
  default_enterprise: string;
  default_site: string;
  default_area: string;
  use_tls: boolean;
  events: string[];
}

/**
 * Event context for building UNS topics
 * Based on ISA-95 hierarchy: Enterprise > Site > Area > Cell > Line > Operation
 */
interface EventContext {
  enterprise?: string;
  site?: string;
  area?: string;
  cell?: string;
  line?: string;
  operation?: string;
  job_number?: string;
  part_number?: string;
  operator_name?: string;
}

interface MqttPayload {
  event: string;
  timestamp: string;
  tenant_id: string;
  data: Record<string, unknown>;
}

/**
 * Normalize a string for use in MQTT topic (lowercase, no spaces, safe characters)
 */
function normalizeTopicPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

/**
 * Build MQTT topic using configurable UNS (Unified Namespace) pattern
 *
 * Supported variables:
 * - {enterprise} - Company/organization
 * - {site} - Physical location/factory
 * - {area} - Manufacturing area
 * - {cell} - QRM cell / work center
 * - {line} - Production line
 * - {operation} - Operation type/name
 * - {event} - Event type (e.g., operation/started)
 * - {tenant_id} - Tenant ID for multi-tenancy
 * - {job_number} - Job number
 * - {part_number} - Part number
 *
 * Example patterns:
 * - "{enterprise}/{site}/{area}/{cell}/{event}" -> "acme/factory1/fabrication/laser_cutting/operation/started"
 * - "eryxon/{tenant_id}/{cell}/{event}" -> "eryxon/abc123/laser_cutting/operation/started"
 * - "{enterprise}/mes/{area}/{cell}/{operation}/{event}" -> "acme/mes/production/welding/weld_frame/operation/completed"
 */
function buildTopic(
  publisher: MqttPublisher,
  tenantId: string,
  eventType: string,
  context?: EventContext
): string {
  // Build variable map with defaults
  const variables: Record<string, string> = {
    enterprise: normalizeTopicPart(context?.enterprise || publisher.default_enterprise || 'eryxon'),
    site: normalizeTopicPart(context?.site || publisher.default_site || 'main'),
    area: normalizeTopicPart(context?.area || publisher.default_area || 'production'),
    cell: normalizeTopicPart(context?.cell || 'default'),
    line: normalizeTopicPart(context?.line || ''),
    operation: normalizeTopicPart(context?.operation || ''),
    event: eventType.replace('.', '/'),
    tenant_id: tenantId,
    job_number: normalizeTopicPart(context?.job_number || ''),
    part_number: normalizeTopicPart(context?.part_number || ''),
  };

  // Replace variables in pattern
  let topic = publisher.topic_pattern;
  for (const [key, value] of Object.entries(variables)) {
    topic = topic.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  // Clean up: remove empty segments and double slashes
  topic = topic
    .split('/')
    .filter(segment => segment.length > 0)
    .join('/');

  return topic;
}

/**
 * Publish message to MQTT broker via WebSocket
 * This works with brokers that support MQTT over WebSocket (most cloud brokers do)
 */
async function publishViaMqttWs(
  publisher: MqttPublisher,
  topic: string,
  payload: MqttPayload
): Promise<{ success: boolean; error?: string; latencyMs: number }> {
  const startTime = Date.now();

  try {
    // Build WebSocket URL
    const protocol = publisher.use_tls ? 'wss' : 'ws';
    const wsPort = publisher.use_tls ? 8884 : 8083; // Common WebSocket ports
    const wsUrl = `${protocol}://${publisher.broker_url.replace(/^(mqtt|ws)s?:\/\//, '')}:${wsPort}/mqtt`;

    // For Deno Edge Functions, we need to use fetch for HTTP-based MQTT APIs
    // Many cloud MQTT providers offer HTTP publish endpoints
    // Example: HiveMQ Cloud, EMQX Cloud, AWS IoT, Azure IoT Hub

    // Try HTTP-based publish first (works with HiveMQ, EMQX, and similar)
    const httpResult = await publishViaHttp(publisher, topic, payload);
    if (httpResult.success) {
      return { ...httpResult, latencyMs: Date.now() - startTime };
    }

    // If HTTP fails, log the error but don't fail completely
    console.log('HTTP publish not available, skipping:', httpResult.error);

    return {
      success: false,
      error: 'MQTT publish requires HTTP API. Configure your broker to support HTTP publish or use HiveMQ/EMQX Cloud.',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Publish via HTTP REST API (supported by many cloud MQTT brokers)
 */
async function publishViaHttp(
  publisher: MqttPublisher,
  topic: string,
  payload: MqttPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean broker URL
    const brokerHost = publisher.broker_url
      .replace(/^(mqtt|ws)s?:\/\//, '')
      .replace(/:\d+$/, '');

    // Try common HTTP API endpoints
    const endpoints = [
      // HiveMQ Cloud HTTP API
      `https://${brokerHost}:8443/api/v1/mqtt/publish`,
      // EMQX HTTP API
      `https://${brokerHost}:8081/api/v5/publish`,
      // Generic REST MQTT proxy
      `https://${brokerHost}/api/mqtt/publish`,
    ];

    const payloadJson = JSON.stringify({
      topic: topic,
      payload: JSON.stringify(payload),
      qos: 1,
      retain: false,
    });

    // Build auth header
    const authHeader = publisher.username && publisher.password
      ? `Basic ${btoa(`${publisher.username}:${publisher.password}`)}`
      : undefined;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { 'Authorization': authHeader } : {}),
          },
          body: payloadJson,
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          return { success: true };
        }
      } catch {
        // Try next endpoint
        continue;
      }
    }

    return {
      success: false,
      error: 'No HTTP MQTT API endpoint responded successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HTTP publish failed',
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
    const body = await req.json();
    const { tenant_id, event_type, data, context } = body;

    if (!tenant_id || !event_type || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenant_id, event_type, data',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all active MQTT publishers for this tenant subscribed to this event
    const { data: publishers, error } = await supabase
      .from('mqtt_publishers')
      .select('id, broker_url, port, username, password, topic_pattern, default_enterprise, default_site, default_area, use_tls, events')
      .eq('tenant_id', tenant_id)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to fetch MQTT publishers: ${error.message}`);
    }

    if (!publishers || publishers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active MQTT publishers for this tenant',
          published: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter publishers subscribed to this event
    const subscribedPublishers = publishers.filter((pub: MqttPublisher) =>
      pub.events && pub.events.includes(event_type)
    );

    if (subscribedPublishers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No MQTT publishers subscribed to this event',
          published: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare payload
    const payload: MqttPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      tenant_id: tenant_id,
      data: data,
    };

    // Publish to all subscribed MQTT brokers in parallel
    const results = await Promise.all(
      subscribedPublishers.map(async (publisher: MqttPublisher) => {
        const topic = buildTopic(publisher, tenant_id, event_type, context as EventContext | undefined);
        const result = await publishViaMqttWs(publisher, topic, payload);

        // Log the publish attempt
        await supabase.from('mqtt_logs').insert({
          mqtt_publisher_id: publisher.id,
          event_type: event_type,
          topic: topic,
          payload: payload,
          success: result.success,
          error_message: result.error || null,
          latency_ms: result.latencyMs,
        });

        // Update publisher last_connected_at or last_error
        if (result.success) {
          await supabase
            .from('mqtt_publishers')
            .update({ last_connected_at: new Date().toISOString(), last_error: null })
            .eq('id', publisher.id);
        } else {
          await supabase
            .from('mqtt_publishers')
            .update({ last_error: result.error })
            .eq('id', publisher.id);
        }

        return { publisherId: publisher.id, topic, ...result };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Published to ${successCount} of ${results.length} MQTT broker(s)`,
        published: successCount,
        failed: failureCount,
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mqtt-publish:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
