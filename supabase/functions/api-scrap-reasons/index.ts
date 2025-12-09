import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateAndSetContext } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { handleOptions, handleError } from "../_shared/validation/errorHandler.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    // Handle GET requests - list scrap reasons
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const category = url.searchParams.get('category');
      const code = url.searchParams.get('code');
      const search = url.searchParams.get('search');
      const active = url.searchParams.get('active');

      let limit = parseInt(url.searchParams.get('limit') || '100');
      if (limit < 1) limit = 100;
      if (limit > 1000) limit = 1000;

      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('scrap_reasons')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category', { ascending: true })
        .order('code', { ascending: true })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq('category', category);
      }
      if (code) {
        query = query.ilike('code', `%${code}%`);
      }
      if (search) {
        query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (active !== null) {
        const isActive = active === 'true';
        query = query.eq('active', isActive);
      } else {
        // Default to showing only active scrap reasons
        query = query.eq('active', true);
      }

      const { data: scrapReasons, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch scrap reasons: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            scrap_reasons: scrapReasons || [],
            pagination: {
              limit,
              offset,
              total: count || scrapReasons?.length || 0
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create scrap reason
    if (req.method === 'POST') {
      const body = await req.json();

      // Validate required fields
      if (!body.code || !body.description || !body.category) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'code, description, and category are required' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate category
      const validCategories = ['material', 'process', 'equipment', 'operator', 'design', 'other'];
      if (!validCategories.includes(body.category)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `category must be one of: ${validCategories.join(', ')}`
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for duplicate code
      const { data: existingReason } = await supabase
        .from('scrap_reasons')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', body.code)
        .single();

      if (existingReason) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'DUPLICATE_CODE', message: `Scrap reason code ${body.code} already exists` }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: scrapReason, error: scrapReasonError } = await supabase
        .from('scrap_reasons')
        .insert({
          tenant_id: tenantId,
          code: body.code,
          description: body.description,
          category: body.category,
          active: body.active ?? true,
          metadata: body.metadata
        })
        .select()
        .single();

      if (scrapReasonError || !scrapReason) {
        throw new Error(`Failed to create scrap reason: ${scrapReasonError?.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { scrap_reason: scrapReason }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update scrap reason
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const reasonId = url.searchParams.get('id');

      if (!reasonId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Scrap reason ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['code', 'description', 'category', 'active', 'metadata'];
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

      // Validate category if being updated
      if (updates.category) {
        const validCategories = ['material', 'process', 'equipment', 'operator', 'design', 'other'];
        if (!validCategories.includes(updates.category)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `category must be one of: ${validCategories.join(', ')}`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check for duplicate code if updating code
      if (updates.code) {
        const { data: existingReason } = await supabase
          .from('scrap_reasons')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('code', updates.code)
          .neq('id', reasonId)
          .single();

        if (existingReason) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'DUPLICATE_CODE', message: `Scrap reason code ${updates.code} already exists` }
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data: scrapReason, error } = await supabase
        .from('scrap_reasons')
        .update(updates)
        .eq('id', reasonId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Scrap reason not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to update scrap reason: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { scrap_reason: scrapReason }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete scrap reason
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const reasonId = url.searchParams.get('id');

      if (!reasonId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Scrap reason ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if scrap reason is referenced by operation_quantities
      const { data: references } = await supabase
        .from('operation_quantities')
        .select('id')
        .eq('scrap_reason_id', reasonId)
        .limit(1);

      if (references && references.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Cannot delete scrap reason that is referenced by operation quantities. Set active=false instead.'
            }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('scrap_reasons')
        .delete()
        .eq('id', reasonId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Scrap reason not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete scrap reason: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Scrap reason deleted successfully' }
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
    console.error('Error in api-scrap-reasons:', error);
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
