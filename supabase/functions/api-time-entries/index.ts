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

    // Handle GET requests - list time entries
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('operation_id');
      const operatorId = url.searchParams.get('operator_id');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const timeType = url.searchParams.get('time_type');

      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          end_time,
          duration,
          notes,
          created_at,
          updated_at,
          operation:operations (
            id,
            operation_name,
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
          )
        `)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (operationId) {
        query = query.eq('operation_id', operationId);
      }
      if (operatorId) {
        query = query.eq('operator_id', operatorId);
      }
      if (startDate) {
        query = query.gte('start_time', startDate);
      }
      if (endDate) {
        query = query.lte('start_time', endDate);
      }
      if (timeType) {
        query = query.eq('time_type', timeType);
      }

      const { data: timeEntries, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch time entries: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            time_entries: timeEntries || [],
            pagination: {
              limit,
              offset,
              total: count || timeEntries?.length || 0
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create time entry
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.operation_id || !body.operator_id || !body.start_time) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'operation_id, operator_id, and start_time are required' }
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

      // Calculate duration if end_time is provided
      let duration = body.duration;
      if (body.end_time && !duration) {
        const start = new Date(body.start_time);
        const end = new Date(body.end_time);
        duration = Math.floor((end.getTime() - start.getTime()) / 1000); // duration in seconds
      }

      const { data: timeEntry, error: timeEntryError } = await supabase
        .from('time_entries')
        .insert({
          tenant_id: tenantId,
          operation_id: body.operation_id,
          operator_id: body.operator_id,
          start_time: body.start_time,
          end_time: body.end_time,
          duration: duration,
          time_type: body.time_type || 'run',
          notes: body.notes
        })
        .select()
        .single();

      if (timeEntryError || !timeEntry) {
        throw new Error(`Failed to create time entry: ${timeEntryError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { time_entry: timeEntry }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update time entry
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const timeEntryId = url.searchParams.get('id');

      if (!timeEntryId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Time entry ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['end_time', 'duration', 'time_type', 'notes'];
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

      // If end_time is updated, recalculate duration
      if (updates.end_time && !updates.duration) {
        const { data: existingEntry } = await supabase
          .from('time_entries')
          .select('start_time')
          .eq('id', timeEntryId)
          .eq('tenant_id', tenantId)
          .single();

        if (existingEntry) {
          const start = new Date(existingEntry.start_time);
          const end = new Date(updates.end_time);
          updates.duration = Math.floor((end.getTime() - start.getTime()) / 1000);
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data: timeEntry, error } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', timeEntryId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Time entry not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update time entry: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { time_entry: timeEntry }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete time entry
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const timeEntryId = url.searchParams.get('id');

      if (!timeEntryId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Time entry ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', timeEntryId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Time entry not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete time entry: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Time entry deleted successfully' }
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
    console.error('Error in api-time-entries:', error);
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
