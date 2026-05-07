/**
 * Client factory - creates appropriate client based on configuration
 */

import type { UnifiedClient } from "../types/client.js";
import type { MCPConfig } from "../config.js";
import { DirectSupabaseClient } from "./supabase-client.js";

/**
 * Create client based on configuration mode
 */
export function createClient(config: MCPConfig): UnifiedClient {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Direct mode requires supabaseUrl and supabaseServiceKey');
  }

  console.error(`Connected in DIRECT mode: ${config.supabaseUrl}`);
  return new DirectSupabaseClient(config.supabaseUrl, config.supabaseServiceKey);
}

export { DirectSupabaseClient } from "./supabase-client.js";
export type { UnifiedClient } from "../types/client.js";
