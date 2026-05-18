/**
 * Application Configuration
 *
 * External URLs and other configurable settings.
 * Self-hosters can override these via environment variables.
 */

// Documentation site URL - self-hosters can point to their own docs
export const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://eryxon.eu';

// Convenience exports for common doc paths
export const DOCS_GUIDES_URL = `${DOCS_URL}/guides/`;
export const DOCS_SELF_HOSTING_URL = `${DOCS_GUIDES_URL}self-hosting/`;
export const DOCS_ERP_INTEGRATION_URL = `${DOCS_URL}/features/erp-integration/`;

/**
 * Detect whether this instance is self-hosted (not on Eryxon's hosted SaaS).
 *
 * Detection logic:
 * 1. Explicit env var `VITE_SELF_HOSTED=true` always wins.
 * 2. If the Supabase URL does NOT end in `.supabase.co`, the instance is
 *    running against a self-hosted or local Supabase — therefore self-hosted.
 *
 * This is used to suppress hosted-only UI (trial banners, upgrade CTAs)
 * that don't apply to self-hosted deployments.
 */
export function isSelfHosted(): boolean {
  const runtimeEnv = (window as unknown as Record<string, Record<string, string> | undefined>).__ERYXON_ENV__;

  // Explicit override takes precedence
  const selfHostedFlag = runtimeEnv?.VITE_SELF_HOSTED || import.meta.env.VITE_SELF_HOSTED;
  if (selfHostedFlag === 'true') return true;
  if (selfHostedFlag === 'false') return false;

  // Infer from Supabase URL: hosted SaaS always uses *.supabase.co
  const supabaseUrl = runtimeEnv?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return !hostname.endsWith('.supabase.co');
  } catch {
    // If URL parsing fails, assume self-hosted (safe default for self-hosters)
    return true;
  }
}
