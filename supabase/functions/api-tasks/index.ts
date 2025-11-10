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

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const partId = url.searchParams.get('part_id');
      const jobId = url.searchParams.get('job_id');
      const stageId = url.searchParams.get('stage_id');
      const stageName = url.searchParams.get('stage_name');
      const status = url.searchParams.get('status');
      const assignedOperatorId = url.searchParams.get('assigned_operator_id');

      // Cap pagination limit to prevent abuse
      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('tasks')
        .select(`
          id,
          task_name,
          sequence,
          estimated_time,
          actual_time,
          status,
          completion_percentage,
          notes,
          completed_at,
          created_at,
          updated_at,
          part:parts (
            id,
            part_number,
            material,
            job:jobs (
              id,
              job_number,
              customer
            )
          ),
          stage:stages (
            id,
            name,
            color,
            sequence
          ),
          assigned_operator:profiles (
            id,
            username,
            full_name
          ),
          time_entries (
            id,
            start_time,
            end_time,
            duration
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (partId) {
        query = query.eq('part_id', partId);
      }
      if (stageId) {
        query = query.eq('stage_id', stageId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (assignedOperatorId) {
        query = query.eq('assigned_operator_id', assignedOperatorId);
      }

      // Filter by job_id (requires finding parts first)
      if (jobId) {
        const { data: parts } = await supabase
          .from('parts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('job_id', jobId);

        if (parts && parts.length > 0) {
          query = query.in('part_id', parts.map(p => p.id));
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                tasks: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Filter by stage_name (requires finding stage first)
      if (stageName) {
        const { data: stages } = await supabase
          .from('stages')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('name', `%${stageName}%`);

        if (stages && stages.length > 0) {
          query = query.in('stage_id', stages.map(s => s.id));
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                tasks: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: tasks, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tasks: tasks || [],
            pagination: {
              limit,
              offset,
              total: count || tasks?.length || 0
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH method for updating tasks
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const taskId = url.searchParams.get('id');

      if (!taskId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Task ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['status', 'completion_percentage', 'notes', 'assigned_operator_id', 'actual_time'];
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

      // Auto-set completed_at if status changes to completed
      if (updates.status === 'completed' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      updates.updated_at = new Date().toISOString();

      const { data: task, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Task not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update task: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { task }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET and PATCH methods are supported' }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-tasks:', error);
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
