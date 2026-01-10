/**
 * Supabase client configuration and utilities
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase configuration from environment
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

/**
 * Validate that required environment variables are set
 */
export function validateEnvironment(): void {
  if (!SUPABASE_SERVICE_KEY) {
    console.error("Error: SUPABASE_SERVICE_KEY environment variable is required");
    process.exit(1);
  }
}

/**
 * Create and return the Supabase client
 */
export function createSupabaseClient(): SupabaseClient {
  validateEnvironment();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/**
 * Get the Supabase URL (for edge function calls if needed)
 */
export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}
