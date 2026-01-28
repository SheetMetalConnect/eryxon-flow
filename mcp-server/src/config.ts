/**
 * MCP Server Configuration
 *
 * Supports two modes:
 * 1. DIRECT - Self-hosted (direct Supabase access with service key)
 * 2. API - Cloud SaaS (REST API with tenant-scoped API key)
 */

export type ConnectionMode = 'direct' | 'api';

export interface MCPConfig {
  mode: ConnectionMode;

  // Direct mode (self-hosted)
  supabaseUrl?: string;
  supabaseServiceKey?: string;

  // API mode (cloud)
  apiBaseUrl?: string;
  apiKey?: string;

  // Optional
  redisUrl?: string;
  queryTimeout?: number; // Query timeout in milliseconds (default: 30000)
}

/**
 * Detect connection mode based on environment variables
 */
export function detectMode(): ConnectionMode {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
  const hasApiKey = !!process.env.ERYXON_API_KEY;

  if (hasApiKey) {
    return 'api';
  } else if (hasServiceKey) {
    return 'direct';
  } else {
    console.error('Error: No authentication credentials found.');
    console.error('For self-hosted: Set SUPABASE_SERVICE_KEY');
    console.error('For cloud: Set ERYXON_API_KEY');
    process.exit(1);
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): MCPConfig {
  const mode = detectMode();

  const config: MCPConfig = {
    mode,
    redisUrl: process.env.REDIS_URL,
    queryTimeout: process.env.QUERY_TIMEOUT_MS ? parseInt(process.env.QUERY_TIMEOUT_MS) : 30000,
  };

  if (mode === 'direct') {
    config.supabaseUrl = process.env.SUPABASE_URL;
    config.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required for direct mode');
      process.exit(1);
    }
  } else {
    config.apiBaseUrl = process.env.ERYXON_API_URL || process.env.SUPABASE_URL;
    config.apiKey = process.env.ERYXON_API_KEY;

    if (!config.apiBaseUrl || !config.apiKey) {
      console.error('Error: ERYXON_API_URL and ERYXON_API_KEY required for API mode');
      process.exit(1);
    }
  }

  return config;
}

/**
 * Get human-readable mode description
 */
export function getModeDescription(mode: ConnectionMode): string {
  switch (mode) {
    case 'direct':
      return 'Direct Supabase (Self-Hosted)';
    case 'api':
      return 'REST API (Cloud SaaS)';
  }
}
