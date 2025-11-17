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

    // Handle GET requests - list issues
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const operationId = url.searchParams.get('operation_id');
      const severity = url.searchParams.get('severity');
      const status = url.searchParams.get('status');
      const reportedById = url.searchParams.get('reported_by_id');

      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('issues')
        .select(`
          id,
          title,
          description,
          severity,
          status,
          resolution_notes,
          created_at,
          updated_at,
          resolved_at,
          issue_type,
          ncr_number,
          ncr_category,
          root_cause,
          corrective_action,
          preventive_action,
          affected_quantity,
          disposition,
          verification_required,
          verified_at,
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
          reported_by:profiles!issues_reported_by_id_fkey (
            id,
            username,
            full_name
          ),
          resolved_by:profiles!issues_resolved_by_id_fkey (
            id,
            username,
            full_name
          ),
          verified_by:profiles!issues_verified_by_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (operationId) {
        query = query.eq('operation_id', operationId);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (reportedById) {
        query = query.eq('reported_by_id', reportedById);
      }

      const { data: issues, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch issues: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            issues: issues || [],
            pagination: {
              limit,
              offset,
              total: count || issues?.length || 0
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create issue/NCR
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.operation_id || !body.title || !body.severity) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'operation_id, title, and severity are required' }
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

      // Verify reported_by user if provided
      if (body.reported_by_id) {
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', body.reported_by_id)
          .eq('tenant_id', tenantId)
          .single();

        if (!user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Reported by user not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Generate NCR number if this is an NCR
      let ncrNumber = body.ncr_number;
      if (body.issue_type === 'ncr' && !ncrNumber) {
        // Call the generate_ncr_number function
        const { data: ncrData, error: ncrError } = await supabase
          .rpc('generate_ncr_number', { p_tenant_id: tenantId });

        if (!ncrError && ncrData) {
          ncrNumber = ncrData;
        }
      }

      const issueData: any = {
        tenant_id: tenantId,
        operation_id: body.operation_id,
        title: body.title,
        description: body.description,
        severity: body.severity,
        reported_by_id: body.reported_by_id,
        status: 'open',
        issue_type: body.issue_type || 'general',
      };

      // Add NCR-specific fields if provided
      if (body.issue_type === 'ncr') {
        issueData.ncr_number = ncrNumber;
        issueData.ncr_category = body.ncr_category;
        issueData.root_cause = body.root_cause;
        issueData.corrective_action = body.corrective_action;
        issueData.preventive_action = body.preventive_action;
        issueData.affected_quantity = body.affected_quantity;
        issueData.disposition = body.disposition;
        issueData.verification_required = body.verification_required || false;
      }

      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert(issueData)
        .select()
        .single();

      if (issueError || !issue) {
        throw new Error(`Failed to create issue: ${issueError?.message}`);
      }

      // Trigger webhook for NCR created if this is an NCR
      if (issue.issue_type === 'ncr') {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-dispatch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              tenant_id: tenantId,
              event_type: 'ncr.created',
              data: {
                issue_id: issue.id,
                ncr_number: issue.ncr_number,
                title: issue.title,
                severity: issue.severity,
                ncr_category: issue.ncr_category,
                disposition: issue.disposition,
                operation_id: issue.operation_id,
                created_at: issue.created_at,
              },
            }),
          });
        } catch (webhookError) {
          console.error('Failed to trigger ncr.created webhook:', webhookError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { issue }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update issue
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const issueId = url.searchParams.get('id');

      if (!issueId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Issue ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = [
        'title', 'description', 'severity', 'status', 'resolution_notes', 'resolved_by_id',
        'root_cause', 'corrective_action', 'preventive_action', 'ncr_category',
        'affected_quantity', 'disposition', 'verification_required', 'verified_by_id'
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

      // Auto-set resolved_at if status changes to resolved
      if (updates.status === 'resolved' && !updates.resolved_at) {
        updates.resolved_at = new Date().toISOString();
      }

      // Auto-set verified_at if verified_by_id is set
      if (updates.verified_by_id && !body.verified_at) {
        updates.verified_at = new Date().toISOString();
      }

      updates.updated_at = new Date().toISOString();

      const { data: issue, error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', issueId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Issue not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update issue: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { issue }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete issue
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const issueId = url.searchParams.get('id');

      if (!issueId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Issue ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', issueId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Issue not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete issue: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Issue deleted successfully' }
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
    console.error('Error in api-issues:', error);
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
