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

    const body = await req.json();
    const { filename, content_type, job_number } = body;

    if (!filename || !content_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'filename and content_type are required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic filename validation
    if (filename.length > 255) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Filename too long (max 255 characters)' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block path traversal and dangerous characters
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Filename contains invalid characters' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const filePath = job_number
      ? `${tenantId}/jobs/${job_number}/${sanitizedFilename}`
      : `${tenantId}/files/${sanitizedFilename}`;

    const { data, error } = await supabase.storage
      .from('issues')
      .createSignedUploadUrl(filePath);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          upload_url: data.signedUrl,
          file_path: filePath,
          expires_at: expiresAt
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-upload-url:', error);
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
