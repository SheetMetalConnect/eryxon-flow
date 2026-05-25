import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test isSelfHosted which reads from window.__ERYXON_ENV__ and import.meta.env.
// Since import.meta.env is baked in at import time, we mock it via vi.stubEnv.

describe('isSelfHosted', () => {
  let originalEryxonEnv: unknown;

  beforeEach(() => {
    originalEryxonEnv = (window as any).__ERYXON_ENV__;
    delete (window as any).__ERYXON_ENV__;
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    if (originalEryxonEnv !== undefined) {
      (window as any).__ERYXON_ENV__ = originalEryxonEnv;
    } else {
      delete (window as any).__ERYXON_ENV__;
    }
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  async function loadIsSelfHosted() {
    // Dynamic import so each test gets a fresh module evaluation
    const mod = await import('./config');
    return mod.isSelfHosted;
  }

  it('returns true when VITE_SELF_HOSTED=true via runtime env', async () => {
    (window as any).__ERYXON_ENV__ = { VITE_SELF_HOSTED: 'true' };
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(true);
  });

  it('returns false when VITE_SELF_HOSTED=false via runtime env', async () => {
    (window as any).__ERYXON_ENV__ = {
      VITE_SELF_HOSTED: 'false',
      VITE_SUPABASE_URL: 'http://localhost:54321',
    };
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(false);
  });

  it('returns false when Supabase URL ends in .supabase.co (hosted SaaS)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vatgianzotsurljznsry.supabase.co');
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(false);
  });

  it('returns true when Supabase URL is localhost (local dev)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(true);
  });

  it('returns true when Supabase URL is a custom domain (self-hosted)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.mycompany.com');
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(true);
  });

  it('returns true when Supabase URL is empty (safe fallback)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(true);
  });

  it('runtime env takes precedence over import.meta.env for Supabase URL', async () => {
    // import.meta.env says hosted, but runtime env says local
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vatgianzotsurljznsry.supabase.co');
    (window as any).__ERYXON_ENV__ = {
      VITE_SUPABASE_URL: 'http://localhost:54321',
    };
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(true);
  });

  it('explicit VITE_SELF_HOSTED=true overrides a .supabase.co URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vatgianzotsurljznsry.supabase.co');
    (window as any).__ERYXON_ENV__ = { VITE_SELF_HOSTED: 'true' };
    const isSelfHosted = await loadIsSelfHosted();
    expect(isSelfHosted()).toBe(true);
  });
});
