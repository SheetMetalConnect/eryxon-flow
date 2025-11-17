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

    // Handle GET requests - list assignments
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('operation_id');
      const operatorId = url.searchParams.get('operator_id');
      const status = url.searchParams.get('status');

      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('assignments')
        .select(`
          id,
          assigned_at,
          status,
          notes,
          created_at,
          updated_at,
          operation:operations (
            id,
            operation_name,
            status,
            part:parts (
              id,
              part_number,
              job:jobs (
                id,
                job_number
              )
            )
          ),
          operator:profiles (
            id,
            username,
            full_name
          ),
          assigned_by:profiles!assignments_assigned_by_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('assigned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (operationId) {
        query = query.eq('operation_id', operationId);
      }
      if (operatorId) {
        query = query.eq('operator_id', operatorId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data: assignments, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch assignments: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            assignments: assignments || [],
            pagination: {
              limit,
              offset,
              total: count || assignments?.length || 0
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create assignment
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.operation_id || !body.operator_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'operation_id and operator_id are required' }
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

      // Verify operator exists and belongs to tenant
      const { data: operator } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', body.operator_id)
        .eq('tenant_id', tenantId)
        .single();

      if (!operator) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Operator not found' }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for existing active assignment
      const { data: existingAssignment } = await supabase
        .from('assignments')
        .select('id')
        .eq('operation_id', body.operation_id)
        .eq('operator_id', body.operator_id)
        .eq('status', 'active')
        .single();

      if (existingAssignment) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'DUPLICATE_ASSIGNMENT', message: 'Active assignment already exists for this operation and operator' }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          tenant_id: tenantId,
          operation_id: body.operation_id,
          operator_id: body.operator_id,
          assigned_by_id: body.assigned_by_id,
          assigned_at: body.assigned_at || new Date().toISOString(),
          notes: body.notes,
          status: 'active'
        })
        .select()
        .single();

      if (assignmentError || !assignment) {
        throw new Error(`Failed to create assignment: ${assignmentError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { assignment }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update assignment
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const assignmentId = url.searchParams.get('id');

      if (!assignmentId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Assignment ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['status', 'notes'];
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

      const { data: assignment, error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', assignmentId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Assignment not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update assignment: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { assignment }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete assignment
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const assignmentId = url.searchParams.get('id');

      if (!assignmentId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Assignment ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Assignment not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete assignment: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Assignment deleted successfully' }
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
    console.error('Error in api-assignments:', error);
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
