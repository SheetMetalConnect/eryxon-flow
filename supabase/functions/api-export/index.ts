import { serveApi } from "../_shared/handler.ts";
import type { HandlerContext } from "../_shared/handler.ts";
import { createSuccessResponse, UnauthorizedError, ForbiddenError } from "../_shared/validation/errorHandler.ts";

export default serveApi(async (req: Request, ctx: HandlerContext) => {
  const { supabase, tenantId, url, plan } = ctx;

  // Admin-only endpoint: verify user has admin role
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new UnauthorizedError('Authorization header required');
  }

  // Get user from auth header
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Get user's role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new ForbiddenError('Admin role required for data export');
  }

  // Parse query parameters for entity selection
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
        const { data, error, count } = await supabase
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
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, plan, created_at')
    .eq('id', tenantId)
    .single();

  if (tenant) {
    exportData._tenant_info = tenant;
  }

  // Return as downloadable JSON file
  return new Response(
    JSON.stringify(exportData, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tenant-export-${tenantId}-${Date.now()}.json"`
      }
    }
  );
});
