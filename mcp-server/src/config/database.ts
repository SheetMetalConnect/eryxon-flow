/**
 * Database Configuration
 * Supabase client setup and management
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./environment.js";

/**
 * Supabase client instance
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
export function initializeDatabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createClient(
    env.supabase.url,
    env.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return supabaseClient;
}

/**
 * Get Supabase client instance
 */
export function getDatabase(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return supabaseClient;
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabase();
    const { error } = await db.from("tenants").select("id").limit(1);
    return !error;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
