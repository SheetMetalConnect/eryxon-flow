/**
 * Runtime Environment Configuration
 *
 * Reads environment variables with Docker runtime override support.
 * In Docker, the entrypoint generates /env.js which populates window.__ERYXON_ENV__.
 * Falls back to Vite's import.meta.env for local development.
 *
 * Usage:
 *   import { env } from '@/config/env';
 *   const url = env('VITE_SUPABASE_URL');
 */

/**
 * Get an environment variable, checking runtime injection first,
 * then falling back to Vite build-time values.
 */
export const env = (key: string): string | undefined =>
  (window as any).__ERYXON_ENV__?.[key] || import.meta.env[key];
