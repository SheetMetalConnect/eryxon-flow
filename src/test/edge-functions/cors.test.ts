/**
 * Tests for supabase/functions/_shared/cors.ts
 *
 * The reflect-origin allowlist is a security boundary: it must echo only allowed
 * origins (never an arbitrary caller), serve both deployment modes (hosted via
 * ALLOWED_ORIGIN, self-hosted/dev via localhost), and hardcode no vendor domain.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockDenoEnv = new Map<string, string>();
vi.stubGlobal('Deno', { env: { get: (k: string) => mockDenoEnv.get(k) } });

// Dynamic import AFTER the Deno stub: cors.ts evaluates `corsHeaders` (which reads
// Deno.env) at module load, and static ES imports hoist above vi.stubGlobal.
let buildCorsHeaders: (req?: Request) => Record<string, string>;
beforeAll(async () => {
  ({ buildCorsHeaders } = await import('../../../supabase/functions/_shared/cors.ts'));
});

function req(origin?: string): Request {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === 'origin' && origin ? origin : null) },
  } as unknown as Request;
}

describe('buildCorsHeaders', () => {
  beforeEach(() => mockDenoEnv.clear());

  it('reflects an allowed localhost origin (self-hosted / dev)', () => {
    const h = buildCorsHeaders(req('http://localhost:8080'));
    expect(h['Access-Control-Allow-Origin']).toBe('http://localhost:8080');
    expect(h['Vary']).toBe('Origin');
  });

  it('reflects a configured production origin from ALLOWED_ORIGIN (hosted)', () => {
    mockDenoEnv.set('ALLOWED_ORIGIN', 'https://app.eryxon.eu');
    expect(buildCorsHeaders(req('https://app.eryxon.eu'))['Access-Control-Allow-Origin']).toBe(
      'https://app.eryxon.eu',
    );
  });

  it('never reflects an unknown origin (falls back to the first allowed)', () => {
    mockDenoEnv.set('ALLOWED_ORIGIN', 'https://app.eryxon.eu');
    const h = buildCorsHeaders(req('https://evil.example.com'));
    expect(h['Access-Control-Allow-Origin']).toBe('https://app.eryxon.eu');
    expect(h['Access-Control-Allow-Origin']).not.toBe('https://evil.example.com');
  });

  it('hardcodes no vendor domain — default is localhost when ALLOWED_ORIGIN unset', () => {
    expect(buildCorsHeaders(req())['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('supports a comma-separated ALLOWED_ORIGIN list', () => {
    mockDenoEnv.set('ALLOWED_ORIGIN', 'https://a.eryxon.eu, https://b.eryxon.eu');
    expect(buildCorsHeaders(req('https://b.eryxon.eu'))['Access-Control-Allow-Origin']).toBe(
      'https://b.eryxon.eu',
    );
  });

  it('never enables credentials (safe with a reflected origin)', () => {
    expect(buildCorsHeaders(req('http://localhost:8080'))['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});
