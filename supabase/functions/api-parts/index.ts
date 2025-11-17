import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { canCreateParts, createLimitErrorResponse } from "../_shared/plan-limits.ts";

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
      const jobId = url.searchParams.get('job_id');
      const jobNumber = url.searchParams.get('job_number');
      const material = url.searchParams.get('material');
      const status = url.searchParams.get('status');
      const partNumber = url.searchParams.get('part_number');

      // Cap pagination limit to prevent abuse
      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('parts')
        .select(`
          id,
          part_number,
          material,
          quantity,
          status,
          file_paths,
          notes,
          metadata,
          created_at,
          updated_at,
          parent_part_id,
          job:jobs (
            id,
            job_number,
            customer
          ),
          operations (
            id,
            operation_name,
            status,
            completion_percentage,
            cell:cells (
              id,
              name,
              color
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (jobId) {
        query = query.eq('job_id', jobId);
      }
      if (material) {
        query = query.ilike('material', `%${material}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (partNumber) {
        query = query.ilike('part_number', `%${partNumber}%`);
      }

      // Filter by job_number if provided (requires join)
      if (jobNumber) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('job_number', `%${jobNumber}%`);

        if (jobs && jobs.length > 0) {
          query = query.in('job_id', jobs.map(j => j.id));
        } else {
          // No matching jobs, return empty result
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                parts: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: parts, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch parts: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            parts: parts || [],
            pagination: {
              limit,
              offset,
              total: count || parts?.length || 0
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST method for creating parts
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.job_id || !body.part_number || !body.material) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'job_id, part_number, and material are required' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check plan limits before creating parts
      const quantity = body.quantity || 1;
      const quotaCheck = await canCreateParts(supabase, tenantId, quantity);

      if (!quotaCheck.allowed) {
        return createLimitErrorResponse(quotaCheck, 'part');
      }

      // Verify job exists and belongs to tenant
      const { data: job } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', body.job_id)
        .eq('tenant_id', tenantId)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Job not found' }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for duplicate part number in same job
      const { data: existingPart } = await supabase
        .from('parts')
        .select('id')
        .eq('job_id', body.job_id)
        .eq('part_number', body.part_number)
        .single();

      if (existingPart) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'DUPLICATE_PART', message: `Part number ${body.part_number} already exists in this job` }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify parent_part_id if provided
      if (body.parent_part_id) {
        const { data: parentPart } = await supabase
          .from('parts')
          .select('id, job_id')
          .eq('id', body.parent_part_id)
          .eq('tenant_id', tenantId)
          .single();

        if (!parentPart || parentPart.job_id !== body.job_id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARENT', message: 'Parent part not found or belongs to different job' }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: part, error: partError } = await supabase
        .from('parts')
        .insert({
          tenant_id: tenantId,
          job_id: body.job_id,
          part_number: body.part_number,
          material: body.material,
          quantity: body.quantity || 1,
          parent_part_id: body.parent_part_id,
          file_paths: body.file_paths,
          notes: body.notes,
          metadata: body.metadata,
          status: 'not_started'
        })
        .select()
        .single();

      if (partError || !part) {
        throw new Error(`Failed to create part: ${partError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { part }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH method for updating parts
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const partId = url.searchParams.get('id');

      if (!partId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Part ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['status', 'quantity', 'notes', 'metadata', 'file_paths'];
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

      const { data: part, error } = await supabase
        .from('parts')
        .update(updates)
        .eq('id', partId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Part not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update part: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { part }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE method for deleting parts
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const partId = url.searchParams.get('id');

      if (!partId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Part ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if part has child parts
      const { data: childParts } = await supabase
        .from('parts')
        .select('id')
        .eq('parent_part_id', partId)
        .limit(1);

      if (childParts && childParts.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'CONFLICT', message: 'Cannot delete part with child parts. Delete child parts first.' }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete part (cascade will delete operations)
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Part not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete part: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Part deleted successfully' }
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
    console.error('Error in api-parts:', error);
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
