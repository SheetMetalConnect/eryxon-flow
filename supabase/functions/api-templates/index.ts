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

    // Handle GET requests - list templates
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const templateId = url.searchParams.get('id');
      const operationType = url.searchParams.get('operation_type');

      // Get single template with items
      if (templateId) {
        const { data: template, error: templateError } = await supabase
          .from('substep_templates')
          .select(`
            id,
            name,
            description,
            operation_type,
            is_global,
            created_at,
            updated_at,
            items:substep_template_items (
              id,
              name,
              notes,
              sequence
            )
          `)
          .or(`tenant_id.eq.${tenantId},is_global.eq.true`)
          .eq('id', templateId)
          .order('sequence', { foreignTable: 'substep_template_items', ascending: true })
          .single();

        if (templateError) {
          if (templateError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Template not found' }
              }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw new Error(`Failed to fetch template: ${templateError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: { template }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List templates
      let query = supabase
        .from('substep_templates')
        .select(`
          id,
          name,
          description,
          operation_type,
          is_global,
          created_at,
          updated_at,
          items:substep_template_items (
            id,
            name,
            notes,
            sequence
          )
        `)
        .or(`tenant_id.eq.${tenantId},is_global.eq.true`)
        .order('name', { ascending: true })
        .order('sequence', { foreignTable: 'substep_template_items', ascending: true });

      if (operationType) {
        query = query.eq('operation_type', operationType);
      }

      const { data: templates, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { templates: templates || [] }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create template
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

      // Validate items if provided
      if (body.items && !Array.isArray(body.items)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'items must be an array' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('substep_templates')
        .insert({
          tenant_id: tenantId,
          name: body.name,
          description: body.description || null,
          operation_type: body.operation_type || null,
          is_global: false // API cannot create global templates
        })
        .select()
        .single();

      if (templateError || !template) {
        throw new Error(`Failed to create template: ${templateError?.message}`);
      }

      // Create template items if provided
      if (body.items && body.items.length > 0) {
        const items = body.items.map((item: any, index: number) => ({
          template_id: template.id,
          name: item.name,
          notes: item.notes || null,
          sequence: item.sequence ?? (index + 1)
        }));

        const { error: itemsError } = await supabase
          .from('substep_template_items')
          .insert(items);

        if (itemsError) {
          // Rollback template creation
          await supabase
            .from('substep_templates')
            .delete()
            .eq('id', template.id);

          throw new Error(`Failed to create template items: ${itemsError.message}`);
        }

        // Fetch complete template with items
        const { data: completeTemplate } = await supabase
          .from('substep_templates')
          .select(`
            id,
            name,
            description,
            operation_type,
            is_global,
            created_at,
            updated_at,
            items:substep_template_items (
              id,
              name,
              notes,
              sequence
            )
          `)
          .eq('id', template.id)
          .order('sequence', { foreignTable: 'substep_template_items', ascending: true })
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            data: { template: completeTemplate }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { template }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PATCH requests - update template
    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const templateId = url.searchParams.get('id');

      if (!templateId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Template ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const allowedFields = ['name', 'description', 'operation_type'];
      const updates: any = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      // Handle items update separately
      if (body.items !== undefined) {
        if (!Array.isArray(body.items)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'items must be an array' }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete existing items
        await supabase
          .from('substep_template_items')
          .delete()
          .eq('template_id', templateId);

        // Insert new items
        if (body.items.length > 0) {
          const items = body.items.map((item: any, index: number) => ({
            template_id: templateId,
            name: item.name,
            notes: item.notes || null,
            sequence: item.sequence ?? (index + 1)
          }));

          const { error: itemsError } = await supabase
            .from('substep_template_items')
            .insert(items);

          if (itemsError) {
            throw new Error(`Failed to update template items: ${itemsError.message}`);
          }
        }
      }

      if (Object.keys(updates).length === 0 && body.items === undefined) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update template if there are field updates
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('substep_templates')
          .update(updates)
          .eq('id', templateId)
          .eq('tenant_id', tenantId);

        if (error) {
          if (error.code === 'PGRST116') {
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Template not found' }
              }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw new Error(`Failed to update template: ${error.message}`);
        }
      }

      // Fetch updated template with items
      const { data: template } = await supabase
        .from('substep_templates')
        .select(`
          id,
          name,
          description,
          operation_type,
          is_global,
          created_at,
          updated_at,
          items:substep_template_items (
            id,
            name,
            notes,
            sequence
          )
        `)
        .eq('id', templateId)
        .order('sequence', { foreignTable: 'substep_template_items', ascending: true })
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          data: { template }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete template
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const templateId = url.searchParams.get('id');

      if (!templateId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Template ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete template (items will be cascade deleted)
      const { error } = await supabase
        .from('substep_templates')
        .delete()
        .eq('id', templateId)
        .eq('tenant_id', tenantId);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Template not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to delete template: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Template deleted successfully' }
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
    console.error('Error in api-templates:', error);
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
