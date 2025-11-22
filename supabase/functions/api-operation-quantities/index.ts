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

    // Handle GET requests - list operation quantities
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('operation_id');
      const partId = url.searchParams.get('part_id');
      const jobId = url.searchParams.get('job_id');
      const materialLot = url.searchParams.get('material_lot');
      const scrapReasonId = url.searchParams.get('scrap_reason_id');
      const recordedBy = url.searchParams.get('recorded_by');
      const fromDate = url.searchParams.get('from_date');
      const toDate = url.searchParams.get('to_date');
      const hasScrap = url.searchParams.get('has_scrap');
      const hasRework = url.searchParams.get('has_rework');

      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('operation_quantities')
        .select(`
          *,
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
          scrap_reason:scrap_reasons (
            id,
            code,
            description,
            category
          ),
          recorded_by_user:profiles!recorded_by (
            id,
            full_name,
            username
          )
        `)
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (operationId) {
        query = query.eq('operation_id', operationId);
      }
      if (materialLot) {
        query = query.eq('material_lot', materialLot);
      }
      if (scrapReasonId) {
        query = query.eq('scrap_reason_id', scrapReasonId);
      }
      if (recordedBy) {
        query = query.eq('recorded_by', recordedBy);
      }
      if (fromDate) {
        query = query.gte('recorded_at', fromDate);
      }
      if (toDate) {
        query = query.lte('recorded_at', toDate);
      }
      if (hasScrap === 'true') {
        query = query.gt('quantity_scrap', 0);
      }
      if (hasRework === 'true') {
        query = query.gt('quantity_rework', 0);
      }

      // Handle part_id filter (requires getting operations for that part)
      if (partId) {
        const { data: operations } = await supabase
          .from('operations')
          .select('id')
          .eq('part_id', partId)
          .eq('tenant_id', tenantId);

        if (operations && operations.length > 0) {
          query = query.in('operation_id', operations.map(op => op.id));
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                quantities: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Handle job_id filter (requires getting parts and operations)
      if (jobId) {
        const { data: parts } = await supabase
          .from('parts')
          .select('id')
          .eq('job_id', jobId)
          .eq('tenant_id', tenantId);

        if (parts && parts.length > 0) {
          const { data: operations } = await supabase
            .from('operations')
            .select('id')
            .in('part_id', parts.map(p => p.id))
            .eq('tenant_id', tenantId);

          if (operations && operations.length > 0) {
            query = query.in('operation_id', operations.map(op => op.id));
          } else {
            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  quantities: [],
                  pagination: { limit, offset, total: 0 }
                }
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                quantities: [],
                pagination: { limit, offset, total: 0 }
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: quantities, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch operation quantities: ${error.message}`);
      }

      // Calculate summary if data exists
      let summary = null;
      if (quantities && quantities.length > 0) {
        summary = {
          total_produced: quantities.reduce((sum, q) => sum + q.quantity_produced, 0),
          total_good: quantities.reduce((sum, q) => sum + q.quantity_good, 0),
          total_scrap: quantities.reduce((sum, q) => sum + q.quantity_scrap, 0),
          total_rework: quantities.reduce((sum, q) => sum + q.quantity_rework, 0),
        };
        summary.yield_percentage = summary.total_produced > 0
          ? (summary.total_good / summary.total_produced * 100).toFixed(2)
          : 0;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            quantities: quantities || [],
            pagination: {
              limit,
              offset,
              total: count || quantities?.length || 0
            },
            ...(summary && { summary })
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create operation quantity
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.operation_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'operation_id is required' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set defaults for quantity fields
      const quantityProduced = body.quantity_produced ?? 0;
      const quantityGood = body.quantity_good ?? 0;
      const quantityScrap = body.quantity_scrap ?? 0;
      const quantityRework = body.quantity_rework ?? 0;

      // Validate sum constraint
      if (quantityProduced !== quantityGood + quantityScrap + quantityRework) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'quantity_produced must equal quantity_good + quantity_scrap + quantity_rework'
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Warn if scrap exists but no reason provided
      if (quantityScrap > 0 && !body.scrap_reason_id) {
        console.warn('Scrap quantity provided without scrap_reason_id');
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

      // Verify scrap reason if provided
      if (body.scrap_reason_id) {
        const { data: scrapReason } = await supabase
          .from('scrap_reasons')
          .select('id')
          .eq('id', body.scrap_reason_id)
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .single();

        if (!scrapReason) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Scrap reason not found or inactive' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Verify recorded_by if provided
      if (body.recorded_by) {
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', body.recorded_by)
          .eq('tenant_id', tenantId)
          .single();

        if (!user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'User not found for recorded_by' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: quantity, error: quantityError } = await supabase
        .from('operation_quantities')
        .insert({
          tenant_id: tenantId,
          operation_id: body.operation_id,
          quantity_produced: quantityProduced,
          quantity_good: quantityGood,
          quantity_scrap: quantityScrap,
          quantity_rework: quantityRework,
          scrap_reason_id: body.scrap_reason_id,
          material_lot: body.material_lot,
          material_supplier: body.material_supplier,
          material_cert_number: body.material_cert_number,
          recorded_by: body.recorded_by,
          recorded_at: body.recorded_at || new Date().toISOString(),
          notes: body.notes,
          metadata: body.metadata
        })
        .select()
        .single();

      if (quantityError || !quantity) {
        throw new Error(`Failed to create operation quantity: ${quantityError?.message}`);
      }

      // Calculate yield percentage
      const yieldPercentage = quantityProduced > 0
        ? (quantityGood / quantityProduced * 100).toFixed(2)
        : 0;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...quantity,
            yield_percentage: yieldPercentage
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update operation quantity
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const quantityId = url.searchParams.get('id');

      if (!quantityId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Quantity ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = [
        'quantity_produced', 'quantity_good', 'quantity_scrap', 'quantity_rework',
        'scrap_reason_id', 'material_lot', 'material_supplier', 'material_cert_number',
        'notes', 'metadata'
      ];
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

      // Fetch current record to validate sum constraint
      const { data: current } = await supabase
        .from('operation_quantities')
        .select('*')
        .eq('id', quantityId)
        .eq('tenant_id', tenantId)
        .single();

      if (!current) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Operation quantity not found' }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate sum constraint with updated values
      const finalProduced = updates.quantity_produced ?? current.quantity_produced;
      const finalGood = updates.quantity_good ?? current.quantity_good;
      const finalScrap = updates.quantity_scrap ?? current.quantity_scrap;
      const finalRework = updates.quantity_rework ?? current.quantity_rework;

      if (finalProduced !== finalGood + finalScrap + finalRework) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'quantity_produced must equal quantity_good + quantity_scrap + quantity_rework'
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updates.updated_at = new Date().toISOString();

      const { data: quantity, error } = await supabase
        .from('operation_quantities')
        .update(updates)
        .eq('id', quantityId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update operation quantity: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { quantity }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete operation quantity
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const quantityId = url.searchParams.get('id');

      if (!quantityId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Quantity ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('operation_quantities')
        .delete()
        .eq('id', quantityId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Operation quantity not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete operation quantity: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Operation quantity deleted successfully' }
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
    console.error('Error in api-operation-quantities:', error);
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
