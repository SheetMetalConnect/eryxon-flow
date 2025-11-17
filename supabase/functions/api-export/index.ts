import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant and role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = profile.tenant_id;

    // Parse query parameters for entity selection
    const url = new URL(req.url);
    const entities = url.searchParams.get('entities')?.split(',') || 'all';
    const format = url.searchParams.get('format') || 'json';

    // Define tables to export (RLS will automatically filter by tenant_id)
    const allTables = [
      'jobs',
      'parts',
      'operations',
      'cells',
      'time_entries',
      'time_entry_pauses',
      'assignments',
      'issues',
      'substeps',
      'resources',
      'operation_resources',
      'materials',
      'profiles',
      'api_keys',
      'webhooks',
      'webhook_logs'
    ];

    const tablesToExport = entities === 'all' || entities.includes('all')
      ? allTables
      : allTables.filter(table => entities.includes(table));

    // Export data
    const exportData: Record<string, any[]> = {};
    const exportMetadata = {
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      format: format,
      tables: [] as Array<{ name: string; count: number }>,
    };

    for (const table of tablesToExport) {
      try {
        let query = supabaseClient.from(table).select('*');

        // Special handling for certain tables
        if (table === 'api_keys') {
          // Don't export the actual key hash for security
          query = supabaseClient.from(table).select('id, name, prefix, active, created_at, last_used_at, tenant_id');
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error exporting ${table}:`, error);
          exportData[table] = [];
          exportMetadata.tables.push({ name: table, count: 0 });
        } else {
          exportData[table] = data || [];
          exportMetadata.tables.push({ name: table, count: data?.length || 0 });
        }
      } catch (err) {
        console.error(`Exception exporting ${table}:`, err);
        exportData[table] = [];
        exportMetadata.tables.push({ name: table, count: 0 });
      }
    }

    // Add metadata
    exportData._metadata = exportMetadata;

    // Get tenant info
    const { data: tenant } = await supabaseClient
      .from('tenants')
      .select('name, plan, created_at')
      .eq('id', tenantId)
      .single();

    if (tenant) {
      exportData._tenant_info = tenant;
    }

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="tenant-export-${tenantId}-${Date.now()}.json"`
        }
      }
    );

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
