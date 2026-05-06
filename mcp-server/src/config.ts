/**
 * MCP Server Configuration
 *
 * v0.5.0 final release supports direct Supabase access for self-hosted
 * deployments. The previous REST API mode was experimental and did not cover
 * the full MCP tool surface.
 */

export type ConnectionMode = 'direct';

export interface MCPConfig {
  mode: ConnectionMode;

  // Direct mode (self-hosted)
  supabaseUrl?: string;
  supabaseServiceKey?: string;

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

  if (hasServiceKey) {
    return 'direct';
  }

  console.error('Error: No supported MCP credentials found.');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY for self-hosted direct mode.');
  if (hasApiKey) {
    console.error('ERYXON_API_KEY REST API mode is not supported in the v0.5.0 final release.');
  }
  process.exit(1);
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

  config.supabaseUrl = process.env.SUPABASE_URL;
  config.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required for direct mode');
    process.exit(1);
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
  }
}
