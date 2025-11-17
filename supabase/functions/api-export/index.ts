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
    const exportData: Record<string, any> = {};
    const exportMetadata = {
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      format: format,
      tables: [] as Array<{ name: string; count: number }>,
    };

    for (const table of tablesToExport) {
      try {
        // Pagination settings - fetch all data in chunks
        const BATCH_SIZE = 1000;
        let offset = 0;
        let allData: any[] = [];
        let hasMore = true;

        // Determine which fields to select
        const selectFields = table === 'api_keys'
          ? 'id, name, prefix, active, created_at, last_used_at, tenant_id'
          : '*';

        // Paginate through all records
        while (hasMore) {
          const { data, error, count } = await supabaseClient
            .from(table)
            .select(selectFields, { count: 'exact' })
            .range(offset, offset + BATCH_SIZE - 1);

          if (error) {
            console.error(`Error exporting ${table} at offset ${offset}:`, error);
            // Break on error but keep what we've collected so far
            hasMore = false;
          } else {
            const batch = data || [];
            allData = allData.concat(batch);

            // Check if we've fetched everything
            if (batch.length < BATCH_SIZE) {
              // Last batch - we're done
              hasMore = false;
            } else {
              // More data to fetch
              offset += BATCH_SIZE;
            }

            console.log(`Exported ${allData.length} rows from ${table}${count ? ` (total: ${count})` : ''}`);
          }
        }

        exportData[table] = allData;
        exportMetadata.tables.push({ name: table, count: allData.length });
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
