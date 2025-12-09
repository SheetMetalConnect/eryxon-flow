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
