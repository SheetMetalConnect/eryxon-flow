/**
 * CORS configuration for Supabase Edge Functions
 *
 * Fails closed: if ALLOWED_ORIGIN is not set, only localhost origins are
 * permitted (safe for local dev). Production deployments MUST set the
 * ALLOWED_ORIGIN environment variable to their frontend domain.
 */

function getAllowedOrigin(): string {
  const explicit = Deno.env.get('ALLOWED_ORIGIN');
  if (explicit) return explicit;

  // No env var set — allow localhost only (dev mode)
  return 'http://localhost:5173';
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
