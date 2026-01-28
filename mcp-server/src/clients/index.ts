/**
 * Client factory - creates appropriate client based on configuration
 */

import type { UnifiedClient } from "../types/client.js";
import type { MCPConfig } from "../config.js";
import { DirectSupabaseClient } from "./supabase-client.js";
import { RestApiClient } from "./api-client.js";

/**
 * Create client based on configuration mode
 */
export function createClient(config: MCPConfig): UnifiedClient {
  const timeout = config.queryTimeout || 30000;

  if (config.mode === 'direct') {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error('Direct mode requires supabaseUrl and supabaseServiceKey');
    }
    console.log(`🔗 Connected in DIRECT mode: ${config.supabaseUrl}`);
    return new DirectSupabaseClient(config.supabaseUrl, config.supabaseServiceKey);
  } else {
    if (!config.apiBaseUrl || !config.apiKey) {
      throw new Error('API mode requires apiBaseUrl and apiKey');
    }
    console.log(`🔗 Connected in API mode: ${config.apiBaseUrl} (timeout: ${timeout}ms)`);
    return new RestApiClient(config.apiBaseUrl, config.apiKey, timeout);
  }
}

export { DirectSupabaseClient } from "./supabase-client.js";
export { RestApiClient } from "./api-client.js";
export type { UnifiedClient } from "../types/client.js";
