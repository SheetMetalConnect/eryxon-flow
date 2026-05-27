import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ALLOWED_BUCKETS = ['parts-cad', 'parts-images', 'issues', 'batch-images'] as const;
const MAX_EXPIRY = 86400;
const DEFAULT_EXPIRY = 3600;

interface StorageUrlRequest {
  bucket: string;
  path: string;
  expiresIn?: number;
}

interface SignedUrlResult {
  url: string;
  path: string;
  bucket: string;
  expires_in: number;
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: corsHeaders }
  );
}

function getStorageUrl(supabase: any, bucket: string, objectPath: string, expiresIn: number): Promise<{ data: any; error: any }> {
  return supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only GET and POST are allowed', 405);
  }

  try {
    const url = new URL(req.url);

    let bucket: string | null;
    let objectPath: string | null;
    let expiresIn = DEFAULT_EXPIRY;

    if (req.method === 'GET') {
      bucket = url.searchParams.get('bucket');
      objectPath = url.searchParams.get('path');
      const expiresInParam = url.searchParams.get('expiresIn');
      if (expiresInParam) expiresIn = Math.min(parseInt(expiresInParam, 10) || DEFAULT_EXPIRY, MAX_EXPIRY);
    } else {
      const body: StorageUrlRequest = await req.json();
      bucket = body.bucket;
      objectPath = body.path;
      expiresIn = body.expiresIn ? Math.min(body.expiresIn, MAX_EXPIRY) : DEFAULT_EXPIRY;
    }

    if (!bucket || !ALLOWED_BUCKETS.includes(bucket as typeof ALLOWED_BUCKETS[number])) {
      return errorResponse('INVALID_BUCKET', `Invalid bucket. Allowed: ${ALLOWED_BUCKETS.join(', ')}`, 400);
    }

    if (!objectPath) {
      return errorResponse('MISSING_PATH', 'path is required', 400);
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication failed', 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return errorResponse('NO_TENANT', 'No tenant associated with user', 403);
    }

    const tenantId = profile.tenant_id;

    if (!objectPath.startsWith(`${tenantId}/`)) {
      return errorResponse('ACCESS_DENIED', 'Access denied to this file', 403);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
    );

    const { data: signedData, error: signedError } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresIn);

    if (signedError || !signedData?.signedUrl) {
      console.error('Failed to generate signed URL:', signedError);
      return errorResponse('SIGNED_URL_ERROR', 'Failed to generate signed URL', 500);
    }

    const result: SignedUrlResult = {
      url: signedData.signedUrl,
      path: objectPath,
      bucket,
      expires_in: expiresIn,
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('api-storage-url error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});
