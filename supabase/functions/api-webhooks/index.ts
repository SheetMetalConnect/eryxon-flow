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

    // Handle GET requests - list webhooks
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const eventType = url.searchParams.get('event_type');
      const active = url.searchParams.get('active');

      let query = supabase
        .from('webhooks')
        .select('id, url, event_type, active, secret_key, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (eventType) {
        query = query.eq('event_type', eventType);
      }
      if (active === 'true') {
        query = query.eq('active', true);
      } else if (active === 'false') {
        query = query.eq('active', false);
      }

      const { data: webhooks, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch webhooks: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { webhooks: webhooks || [] }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create webhook
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.url || !body.event_type) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'url and event_type are required' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate URL format
      try {
        new URL(body.url);
      } catch {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid URL format' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate secret key if not provided
      let secretKey = body.secret_key;
      if (!secretKey) {
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));
        secretKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const { data: webhook, error: webhookError } = await supabase
        .from('webhooks')
        .insert({
          tenant_id: tenantId,
          url: body.url,
          event_type: body.event_type,
          secret_key: secretKey,
          active: body.active ?? true
        })
        .select()
        .single();

      if (webhookError || !webhook) {
        throw new Error(`Failed to create webhook: ${webhookError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { webhook }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update webhook
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const webhookId = url.searchParams.get('id');

      if (!webhookId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['url', 'event_type', 'active'];
      const updates: any = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate URL if provided
      if (updates.url) {
        try {
          new URL(updates.url);
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'Invalid URL format' }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', webhookId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Webhook not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update webhook: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { webhook }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete webhook
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const webhookId = url.searchParams.get('id');

      if (!webhookId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Webhook not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete webhook: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Webhook deleted successfully' }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-webhooks:', error);
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
