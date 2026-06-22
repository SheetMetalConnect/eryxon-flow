/**
 * CORS for Supabase Edge Functions.
 *
 * Reflects the request `Origin` when it is allowed, so one deployment serves
 * both the hosted and self-hosted modes. Allowed production origins come from
 * the `ALLOWED_ORIGIN` env var (comma-separated) — set it to your frontend
 * domain(s) when deploying. Localhost is always allowed for local development.
 */

const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:8080'];

function allowedOrigins(): string[] {
  const configured = (Deno.env.get('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...configured, ...DEV_ORIGINS]));
}

/** Echo the caller's origin if allowed; otherwise fall back to the first configured origin. */
function resolveAllowOrigin(req?: Request): string {
  const allowed = allowedOrigins();
  const origin = req?.headers.get('Origin') ?? '';
  return allowed.includes(origin) ? origin : allowed[0];
}

export function buildCorsHeaders(req?: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveAllowOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'x-request-id',
    Vary: 'Origin',
  };
}

/** Static headers for code paths without a Request. Prefer buildCorsHeaders(req). */
export const corsHeaders: Record<string, string> = buildCorsHeaders();

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(req) });
  }
  return null;
}
