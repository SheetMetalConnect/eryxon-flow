import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function authenticateAdmin(authHeader: string | null, supabase: any) {
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return profile;
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
    const profile = await authenticateAdmin(req.headers.get('authorization'), supabase);

    if (!profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle GET requests - list API keys
    if (req.method === 'GET') {
      const { data: apiKeys, error } = await supabase
        .from('api_keys')
        .select(`
          id,
          name,
          key_prefix,
          active,
          last_used_at,
          created_at,
          created_by:profiles (
            id,
            username,
            full_name
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch API keys: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { api_keys: apiKeys || [] }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - revoke/delete API key
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const keyId = url.searchParams.get('id');

      if (!keyId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'API key ID is required in query string (?id=xxx)' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Soft delete by marking as inactive
      const { error } = await supabase
        .from('api_keys')
        .update({ active: false })
        .eq('id', keyId)
        .eq('tenant_id', profile.tenant_id);

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: 'API key not found' }
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Failed to revoke API key: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'API key revoked successfully' }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - generate new API key
    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name is required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random API key
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(36))
      .join('')
      .substring(0, 32);

    const apiKey = `ery_live_${randomPart}`;
    const keyPrefix = apiKey.substring(0, 12);

    // Hash the API key with bcrypt
    const keyHash = await bcrypt.hash(apiKey, bcrypt.genSaltSync(10));

    // Store in database
    const { data: createdKey, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: profile.tenant_id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        created_by: profile.id,
        active: true
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Return the plaintext key (only time user will see it) and metadata
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: createdKey.id,
          name: createdKey.name,
          api_key: apiKey, // Only returned once!
          key_prefix: createdKey.key_prefix,
          created_at: createdKey.created_at,
          warning: 'Store this API key securely. It will not be shown again.'
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-key-generate:', error);
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
