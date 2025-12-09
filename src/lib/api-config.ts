/**
 * Centralized API Configuration
 *
 * This module provides a single source of truth for API URLs.
 * It separates internal Supabase URLs from public-facing API URLs.
 *
 * Configuration:
 * - VITE_SUPABASE_URL: Internal Supabase project URL (used for SDK operations)
 * - VITE_PUBLIC_API_URL: Public-facing API URL shown to users (e.g., api.eryxon.eu)
 *
 * When VITE_PUBLIC_API_URL is not set, it falls back to the Supabase functions URL.
 */

/**
 * Get the internal Supabase URL (for SDK operations)
 * This URL is used internally and should not be displayed to users.
 */
export function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    console.error('VITE_SUPABASE_URL is not configured');
    throw new Error('Supabase URL is not configured. Please set VITE_SUPABASE_URL environment variable.');
  }
  return url;
}

/**
 * Get the public API base URL (for displaying to users)
 * This is the URL shown in API documentation, API keys page, etc.
 *
 * In production, this should be set to your custom domain (e.g., https://api.eryxon.eu/v1)
 * In development, it falls back to the Supabase functions URL.
 */
export function getPublicApiUrl(): string {
  // Use custom public URL if configured (for production with custom domain)
  const publicUrl = import.meta.env.VITE_PUBLIC_API_URL;
  if (publicUrl) {
    return publicUrl;
  }

  // Fallback to Supabase functions URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1`;
  }

  // Should not happen in properly configured environments
  console.error('Neither VITE_PUBLIC_API_URL nor VITE_SUPABASE_URL is configured');
  return '/api/v1'; // Relative fallback
}

/**
 * Get the Supabase anon/public key
 */
export function getSupabaseAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    console.error('VITE_SUPABASE_PUBLISHABLE_KEY is not configured');
    throw new Error('Supabase key is not configured. Please set VITE_SUPABASE_PUBLISHABLE_KEY environment variable.');
  }
  return key;
}

/**
 * Get the internal Supabase functions URL (for making actual API calls)
 * This is different from getPublicApiUrl() - this one is for internal use.
 */
export function getSupabaseFunctionsUrl(): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1`;
}
