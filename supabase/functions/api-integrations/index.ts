import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * API endpoint for managing integrations marketplace
 *
 * Endpoints:
 * - GET / - List all available integrations (with filters)
 * - GET /:id - Get integration details
 * - POST /:id/install - Install an integration for the tenant
 * - DELETE /:id/uninstall - Uninstall an integration
 * - GET /installed - List tenant's installed integrations
 */

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile with tenant info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Remove function name from path if present
    const functionIndex = pathParts.indexOf("api-integrations");
    const actualPath = functionIndex >= 0 ? pathParts.slice(functionIndex + 1) : pathParts;

    // Route handling
    if (req.method === "GET") {
      // GET /installed - List installed integrations
      if (actualPath[0] === "installed") {
        const { data: installed, error } = await supabase
          .from("installed_integrations")
          .select(`
            *,
            integration:integrations(*)
          `)
          .eq("tenant_id", profile.tenant_id)
          .order("installed_at", { ascending: false });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ data: installed }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET /:id - Get specific integration details
      if (actualPath.length > 0 && actualPath[0]) {
        const integrationId = actualPath[0];

        const { data: integration, error } = await supabase
          .from("integrations")
          .select("*")
          .eq("id", integrationId)
          .eq("status", "published")
          .single();

        if (error || !integration) {
          return new Response(
            JSON.stringify({ error: "Integration not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Check if tenant has this installed
        const { data: installed } = await supabase
          .from("installed_integrations")
          .select("id, is_active, installed_at")
          .eq("tenant_id", profile.tenant_id)
          .eq("integration_id", integrationId)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            data: {
              ...integration,
              is_installed: !!installed,
              installation: installed,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // GET / - List all published integrations
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("search");
      const sort = url.searchParams.get("sort") || "popular"; // popular, newest, name

      let query = supabase
        .from("integrations")
        .select("*")
        .eq("status", "published");

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%,provider_name.ilike.%${search}%`
        );
      }

      // Apply sorting
      switch (sort) {
        case "newest":
          query = query.order("published_at", { ascending: false });
          break;
        case "name":
          query = query.order("name", { ascending: true });
          break;
        case "rating":
          query = query.order("rating_average", { ascending: false });
          break;
        case "popular":
        default:
          query = query.order("install_count", { ascending: false });
          break;
      }

      const { data: integrations, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get installed integrations for this tenant
      const { data: installedIds } = await supabase
        .from("installed_integrations")
        .select("integration_id")
        .eq("tenant_id", profile.tenant_id);

      const installedSet = new Set(
        installedIds?.map((i) => i.integration_id) || []
      );

      // Add is_installed flag
      const enrichedIntegrations = integrations?.map((integration) => ({
        ...integration,
        is_installed: installedSet.has(integration.id),
      }));

      return new Response(
        JSON.stringify({ data: enrichedIntegrations }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /:id/install - Install integration
    if (req.method === "POST" && actualPath[1] === "install") {
      // Only admins can install integrations
      if (profile.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Only admins can install integrations" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const integrationId = actualPath[0];
      const body = await req.json();

      // Verify integration exists and is published
      const { data: integration, error: integrationError } = await supabase
        .from("integrations")
        .select("*")
        .eq("id", integrationId)
        .eq("status", "published")
        .single();

      if (integrationError || !integration) {
        return new Response(
          JSON.stringify({ error: "Integration not found or not available" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if already installed
      const { data: existing } = await supabase
        .from("installed_integrations")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("integration_id", integrationId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Integration already installed" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Install the integration
      const { data: installed, error: installError } = await supabase
        .from("installed_integrations")
        .insert({
          tenant_id: profile.tenant_id,
          integration_id: integrationId,
          config: body.config || {},
          installed_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (installError) {
        return new Response(JSON.stringify({ error: installError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          message: "Integration installed successfully",
          data: installed,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // DELETE /:id/uninstall - Uninstall integration
    if (req.method === "DELETE" && actualPath[1] === "uninstall") {
      // Only admins can uninstall integrations
      if (profile.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Only admins can uninstall integrations" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const integrationId = actualPath[0];

      const { error: deleteError } = await supabase
        .from("installed_integrations")
        .delete()
        .eq("tenant_id", profile.tenant_id)
        .eq("integration_id", integrationId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ message: "Integration uninstalled successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in api-integrations:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
