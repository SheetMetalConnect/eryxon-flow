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

    // Check for sync endpoints
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Route: PUT /api-cells/sync - Upsert by external_id
    if (lastSegment === "sync" && req.method === "PUT") {
      return await handleSyncCell(req, supabase, tenantId);
    }

    // Route: POST /api-cells/bulk-sync - Bulk upsert
    if (lastSegment === "bulk-sync" && req.method === "POST") {
      return await handleBulkSyncCells(req, supabase, tenantId);
    }

    // Handle GET requests - list cells
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const activeFilter = url.searchParams.get('active');

      let query = supabase
        .from('cells')
        .select('id, name, color, sequence, active, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('sequence');

      if (activeFilter === 'true') {
        query = query.eq('active', true);
      }

      const { data: cells, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch cells: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { cells }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create cell
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.name) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'name is required' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for duplicate cell name
      const { data: existingCell } = await supabase
        .from('cells')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', body.name)
        .single();

      if (existingCell) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'DUPLICATE_CELL', message: `Cell name ${body.name} already exists` }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the next sequence number
      const { data: maxSeq } = await supabase
        .from('cells')
        .select('sequence')
        .eq('tenant_id', tenantId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single();

      const sequence = body.sequence ?? ((maxSeq?.sequence ?? 0) + 1);

      const { data: cell, error: cellError } = await supabase
        .from('cells')
        .insert({
          tenant_id: tenantId,
          name: body.name,
          color: body.color || '#3B82F6',
          sequence: sequence,
          active: body.active ?? true
        })
        .select()
        .single();

      if (cellError || !cell) {
        throw new Error(`Failed to create cell: ${cellError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { cell }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update cell
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const cellId = url.searchParams.get('id');

      if (!cellId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Cell ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['name', 'color', 'sequence', 'active'];
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

      // Check for duplicate name if name is being updated
      if (updates.name) {
        const { data: existingCell } = await supabase
          .from('cells')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('name', updates.name)
          .neq('id', cellId)
          .single();

        if (existingCell) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'DUPLICATE_CELL', message: `Cell name ${updates.name} already exists` }
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data: cell, error } = await supabase
        .from('cells')
        .update(updates)
        .eq('id', cellId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Cell not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update cell: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { cell }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete cell
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const cellId = url.searchParams.get('id');

      if (!cellId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Cell ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if cell has any operations
      const { data: operations } = await supabase
        .from('operations')
        .select('id')
        .eq('cell_id', cellId)
        .limit(1);

      if (operations && operations.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'CONFLICT', message: 'Cannot delete cell with existing operations. Consider deactivating instead.' }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('cells')
        .delete()
        .eq('id', cellId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Cell not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete cell: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Cell deleted successfully' }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed` }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-cells:', error);
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

/**
 * PUT /api-cells/sync - Upsert cell by external_id
 */
async function handleSyncCell(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate required sync fields
  if (!body.external_id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'external_id is required for sync operations' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.external_source) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'external_source is required for sync operations' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.name) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'name is required' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if record exists by external_id
  const { data: existing } = await supabase
    .from("cells")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("external_source", body.external_source)
    .eq("external_id", body.external_id)
    .is("deleted_at", null)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    // UPDATE existing record
    const { data: cell, error } = await supabase
      .from("cells")
      .update({
        name: body.name,
        color: body.color || '#3B82F6',
        sequence: body.sequence,
        active: body.active ?? true,
        synced_at: now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update cell: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { action: "updated", cell }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    // Get next sequence if not provided
    let sequence = body.sequence;
    if (sequence === undefined) {
      const { data: maxSeq } = await supabase
        .from("cells")
        .select("sequence")
        .eq("tenant_id", tenantId)
        .order("sequence", { ascending: false })
        .limit(1)
        .single();
      sequence = (maxSeq?.sequence ?? 0) + 1;
    }

    // CREATE new record
    const { data: cell, error } = await supabase
      .from("cells")
      .insert({
        tenant_id: tenantId,
        name: body.name,
        color: body.color || '#3B82F6',
        sequence: sequence,
        active: body.active ?? true,
        external_id: body.external_id,
        external_source: body.external_source,
        synced_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create cell: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { action: "created", cell }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api-cells/bulk-sync - Bulk upsert cells
 */
async function handleBulkSyncCells(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { cells, options = {} } = body;

  if (!Array.isArray(cells)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'cells must be an array' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (cells.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        data: { total: 0, created: 0, updated: 0, errors: 0, results: [] }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (cells.length > 100) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Maximum 100 cells per bulk-sync request' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get current max sequence
  const { data: maxSeq } = await supabase
    .from("cells")
    .select("sequence")
    .eq("tenant_id", tenantId)
    .order("sequence", { ascending: false })
    .limit(1)
    .single();
  let nextSequence = (maxSeq?.sequence ?? 0) + 1;

  const results: any[] = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const cell of cells) {
    try {
      // Validate required fields
      if (!cell.external_id || !cell.external_source) {
        results.push({
          external_id: cell.external_id,
          action: "error",
          error: "external_id and external_source are required",
        });
        errors++;
        continue;
      }

      if (!cell.name) {
        results.push({
          external_id: cell.external_id,
          action: "error",
          error: "name is required",
        });
        errors++;
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from("cells")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("external_source", cell.external_source)
        .eq("external_id", cell.external_id)
        .is("deleted_at", null)
        .maybeSingle();

      const now = new Date().toISOString();

      if (existing) {
        // Update
        const { data: updated_cell, error } = await supabase
          .from("cells")
          .update({
            name: cell.name,
            color: cell.color || '#3B82F6',
            sequence: cell.sequence,
            active: cell.active ?? true,
            synced_at: now,
            updated_at: now,
          })
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: cell.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: cell.external_id,
            id: updated_cell.id,
            action: "updated",
          });
          updated++;
        }
      } else {
        // Create
        const { data: new_cell, error } = await supabase
          .from("cells")
          .insert({
            tenant_id: tenantId,
            name: cell.name,
            color: cell.color || '#3B82F6',
            sequence: cell.sequence ?? nextSequence++,
            active: cell.active ?? true,
            external_id: cell.external_id,
            external_source: cell.external_source,
            synced_at: now,
          })
          .select("id")
          .single();

        if (error) {
          results.push({
            external_id: cell.external_id,
            action: "error",
            error: error.message,
          });
          errors++;
        } else {
          results.push({
            external_id: cell.external_id,
            id: new_cell.id,
            action: "created",
          });
          created++;
        }
      }
    } catch (err: any) {
      results.push({
        external_id: cell.external_id,
        action: "error",
        error: err.message || "Unknown error",
      });
      errors++;
    }
  }

  // Log the import
  await supabase.from("sync_imports").insert({
    tenant_id: tenantId,
    source: "api",
    entity_type: "cells",
    status: errors > 0 ? (created + updated > 0 ? "completed" : "failed") : "completed",
    total_records: cells.length,
    created_count: created,
    updated_count: updated,
    error_count: errors,
    errors: errors > 0 ? results.filter(r => r.action === "error") : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: { total: cells.length, created, updated, errors, results }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
