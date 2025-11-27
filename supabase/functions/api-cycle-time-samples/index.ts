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

    // Handle GET requests - list cycle time samples with statistics
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('operation_id');
      const partId = url.searchParams.get('part_id');
      const jobId = url.searchParams.get('job_id');
      const measurementType = url.searchParams.get('measurement_type');
      const measuredBy = url.searchParams.get('measured_by');
      const fromDate = url.searchParams.get('from_date');
      const toDate = url.searchParams.get('to_date');
      const includeStats = url.searchParams.get('include_stats') !== 'false';

      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('cycle_time_samples')
        .select(`
          *,
          operation:operations (
            id,
            operation_name,
            estimated_time,
            part:parts (
              id,
              part_number,
              job:jobs (
                id,
                job_number
              )
            )
          ),
          measured_by_user:profiles!measured_by (
            id,
            full_name,
            username
          )
        `)
        .eq('tenant_id', tenantId)
        .order('measured_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (operationId) {
        query = query.eq('operation_id', operationId);
      }
      if (measurementType) {
        query = query.eq('measurement_type', measurementType);
      }
      if (measuredBy) {
        query = query.eq('measured_by', measuredBy);
      }
      if (fromDate) {
        query = query.gte('measured_at', fromDate);
      }
      if (toDate) {
        query = query.lte('measured_at', toDate);
      }

      // Handle part_id filter
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
              data: { samples: [], pagination: { limit, offset, total: 0 } }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Handle job_id filter
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
                data: { samples: [], pagination: { limit, offset, total: 0 } }
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              data: { samples: [], pagination: { limit, offset, total: 0 } }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: samples, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch cycle time samples: ${error.message}`);
      }

      // Calculate statistics if requested and there's data
      let statistics = null;
      if (includeStats && samples && samples.length > 0 && operationId) {
        const { data: stats } = await supabase
          .rpc('get_operation_cycle_time_stats', { p_operation_id: operationId });

        if (stats && stats.length > 0) {
          statistics = stats[0];
        }
      } else if (includeStats && samples && samples.length > 0) {
        // Calculate aggregate stats for all returned samples
        const cycleTimes = samples.map(s => s.cycle_time_per_unit_seconds);
        const sum = cycleTimes.reduce((a, b) => a + b, 0);
        const avg = sum / cycleTimes.length;
        const min = Math.min(...cycleTimes);
        const max = Math.max(...cycleTimes);
        const variance = cycleTimes.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / cycleTimes.length;
        const stdDev = Math.sqrt(variance);

        statistics = {
          sample_count: samples.length,
          avg_cycle_time_seconds: Math.round(avg * 100) / 100,
          min_cycle_time_seconds: Math.round(min * 100) / 100,
          max_cycle_time_seconds: Math.round(max * 100) / 100,
          std_dev_seconds: Math.round(stdDev * 100) / 100,
          total_quantity_measured: samples.reduce((sum, s) => sum + s.quantity_measured, 0),
        };
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            samples: samples || [],
            pagination: { limit, offset, total: count || samples?.length || 0 },
            ...(statistics && { statistics })
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - record a new cycle time sample
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

      if (body.measured_time_seconds === undefined || body.measured_time_seconds <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'measured_time_seconds must be a positive number' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify operation exists and belongs to tenant
      const { data: operation } = await supabase
        .from('operations')
        .select('id, operation_name, estimated_time')
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

      // Verify measured_by if provided
      if (body.measured_by) {
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', body.measured_by)
          .eq('tenant_id', tenantId)
          .single();

        if (!user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'User not found for measured_by' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validate measurement_type if provided
      const validTypes = ['manual', 'automated', 'estimated'];
      if (body.measurement_type && !validTypes.includes(body.measurement_type)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `measurement_type must be one of: ${validTypes.join(', ')}`
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const quantityMeasured = body.quantity_measured ?? 1;
      if (quantityMeasured < 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'quantity_measured must be at least 1' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: sample, error: sampleError } = await supabase
        .from('cycle_time_samples')
        .insert({
          tenant_id: tenantId,
          operation_id: body.operation_id,
          measured_time_seconds: body.measured_time_seconds,
          quantity_measured: quantityMeasured,
          measurement_type: body.measurement_type || 'manual',
          measured_by: body.measured_by,
          notes: body.notes,
          metadata: body.metadata,
          measured_at: body.measured_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (sampleError || !sample) {
        throw new Error(`Failed to create cycle time sample: ${sampleError?.message}`);
      }

      // Calculate cycle time per unit for response (DB does this automatically but we include it)
      const cycleTimePerUnit = body.measured_time_seconds / quantityMeasured;

      // Get updated statistics for this operation
      const { data: stats } = await supabase
        .rpc('get_operation_cycle_time_stats', { p_operation_id: body.operation_id });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sample: {
              ...sample,
              cycle_time_per_unit_seconds: Math.round(cycleTimePerUnit * 100) / 100
            },
            statistics: stats?.[0] || null
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete a cycle time sample
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const sampleId = url.searchParams.get('id');

      if (!sampleId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Sample ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify sample exists and belongs to tenant
      const { data: existing } = await supabase
        .from('cycle_time_samples')
        .select('id, operation_id')
        .eq('id', sampleId)
        .eq('tenant_id', tenantId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Cycle time sample not found' }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('cycle_time_samples')
        .delete()
        .eq('id', sampleId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to delete cycle time sample: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Cycle time sample deleted successfully' }
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
    console.error('Error in api-cycle-time-samples:', error);
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
