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

    // Handle GET requests - list substeps
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('operation_id');
      const completed = url.searchParams.get('completed');

      let query = supabase
        .from('substeps')
        .select(`
          id,
          operation_id,
          description,
          sequence,
          completed,
          created_at,
          updated_at,
          operation:operations (
            id,
            operation_name,
            part:parts (
              id,
              part_number
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('sequence', { ascending: true });

      if (operationId) {
        query = query.eq('operation_id', operationId);
      }
      if (completed === 'true') {
        query = query.eq('completed', true);
      } else if (completed === 'false') {
        query = query.eq('completed', false);
      }

      const { data: substeps, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch substeps: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { substeps: substeps || [] }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create substep
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.operation_id || !body.description) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'operation_id and description are required' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify operation exists and belongs to tenant
      const { data: operation } = await supabase
        .from('operations')
        .select('id')
        .eq('id', body.operation_id)
        .eq('tenant_id', tenantId)
        .single();

      if (!operation) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Operation not found' }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the next sequence number if not provided
      let sequence = body.sequence;
      if (sequence === undefined) {
        const { data: maxSeq } = await supabase
          .from('substeps')
          .select('sequence')
          .eq('operation_id', body.operation_id)
          .order('sequence', { ascending: false })
          .limit(1)
          .single();

        sequence = (maxSeq?.sequence ?? 0) + 1;
      }

      const { data: substep, error: substepError } = await supabase
        .from('substeps')
        .insert({
          tenant_id: tenantId,
          operation_id: body.operation_id,
          description: body.description,
          sequence: sequence,
          completed: body.completed ?? false
        })
        .select()
        .single();

      if (substepError || !substep) {
        throw new Error(`Failed to create substep: ${substepError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { substep }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update substep
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const substepId = url.searchParams.get('id');

      if (!substepId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Substep ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['description', 'sequence', 'completed'];
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

      updates.updated_at = new Date().toISOString();

      const { data: substep, error } = await supabase
        .from('substeps')
        .update(updates)
        .eq('id', substepId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Substep not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update substep: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { substep }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete substep
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const substepId = url.searchParams.get('id');

      if (!substepId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Substep ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('substeps')
        .delete()
        .eq('id', substepId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Substep not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete substep: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Substep deleted successfully' }
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
    console.error('Error in api-substeps:', error);
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
