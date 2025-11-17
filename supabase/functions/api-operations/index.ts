/**
 * Operations API Endpoint
 *
 * This Supabase Edge Function provides a RESTful API for managing operations.
 *
 * Supported Methods:
 * - GET: Retrieve operations with filtering, sorting, and pagination
 * - PATCH: Update operation fields
 *
 * Query Parameters (GET):
 * - part_id: Filter by part ID
 * - job_id: Filter by job ID
 * - cell_id: Filter by cell ID
 * - cell_name: Filter by cell name (case-insensitive partial match)
 * - status: Filter by status (not_started, in_progress, completed, on_hold)
 * - assigned_operator_id: Filter by assigned operator
 * - search: Search by operation name (case-insensitive partial match)
 * - sort_by: Sort field (sequence, created_at, estimated_time, actual_time, status, completion_percentage)
 * - sort_order: Sort order (asc, desc) - default: desc
 * - limit: Number of results per page (1-1000) - default: 100
 * - offset: Pagination offset - default: 0
 * - include_count: Include total count in response (true/false) - default: false
 *
 * Authentication:
 * - Requires API key in Authorization header: "Bearer ery_live_xxx" or "Bearer ery_test_xxx"
 *
 * Performance:
 * - Responses are cached for 5 seconds with stale-while-revalidate of 10 seconds
 * - Recommended database indexes: (tenant_id, status), (tenant_id, cell_id), (tenant_id, part_id)
 */

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
      const cellId = url.searchParams.get('cell_id');
      const cellName = url.searchParams.get('cell_name');
      const status = url.searchParams.get('status');
      const assignedOperatorId = url.searchParams.get('assigned_operator_id');
      const search = url.searchParams.get('search'); // Search by operation name
      const sortBy = url.searchParams.get('sort_by') || 'created_at'; // sequence, created_at, estimated_time, actual_time, status
      const sortOrder = url.searchParams.get('sort_order') || 'desc'; // asc or desc
      const includeCount = url.searchParams.get('include_count') === 'true'; // Include total count

      // Cap pagination limit to prevent abuse
      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      // Validate sort parameters
      const validSortFields = ['sequence', 'created_at', 'estimated_time', 'actual_time', 'status', 'completion_percentage'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const ascending = sortOrder === 'asc';

      let query = supabase
        .from('operations')
        .select(`
          id,
          operation_name,
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
          cell:cells (
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
        `, { count: includeCount ? 'exact' : undefined })
        .eq('tenant_id', tenantId)
        .order(sortField, { ascending })
        .range(offset, offset + limit - 1);

      if (partId) {
        query = query.eq('part_id', partId);
      }
      if (cellId) {
        query = query.eq('cell_id', cellId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (assignedOperatorId) {
        query = query.eq('assigned_operator_id', assignedOperatorId);
      }
      if (search) {
        // Search by operation name (case-insensitive)
        query = query.ilike('operation_name', `%${search}%`);
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
                operations: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Filter by cell_name (requires finding cell first)
      if (cellName) {
        const { data: cells } = await supabase
          .from('cells')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('name', `%${cellName}%`);

        if (cells && cells.length > 0) {
          query = query.in('cell_id', cells.map(c => c.id));
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                operations: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: operations, error, count } = await query;

      if (error) {
        console.error('Operations query error:', error);
        throw new Error(`Failed to fetch operations: ${error.message}`);
      }

      // Add cache headers for performance (5 seconds cache)
      const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5, stale-while-revalidate=10'
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            operations: operations || [],
            pagination: {
              limit,
              offset,
              total: count !== null ? count : operations?.length || 0,
              has_more: operations && operations.length === limit
            }
          },
          meta: {
            filters_applied: {
              part_id: partId,
              job_id: jobId,
              cell_id: cellId,
              cell_name: cellName,
              status,
              assigned_operator_id: assignedOperatorId,
              search
            },
            sort: { field: sortField, order: sortOrder }
          }
        }),
        { status: 200, headers: responseHeaders }
      );
    }

    // PATCH method for updating operations
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('id');

      if (!operationId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Operation ID is required in query string (?id=xxx)' }
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

      const { data: operation, error } = await supabase
        .from('operations')
        .update(updates)
        .eq('id', operationId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Operation not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update operation: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { operation }
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
    console.error('Error in api-operations:', error);
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