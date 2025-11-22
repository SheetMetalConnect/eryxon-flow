/**
 * Environment Configuration
 * Manages environment variables and validation
 */

export interface EnvironmentConfig {
  supabase: {
    url: string;
    serviceKey: string;
  };
  server: {
    name: string;
    version: string;
  };
  features: {
    logging: boolean;
    healthCheck: boolean;
  };
}

/**
 * Load and validate environment variables
 */
export function loadEnvironment(): EnvironmentConfig {
  const supabaseUrl = process.env.SUPABASE_URL || "https://vatgianzotsurljznsry.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

  // Validate required environment variables
  if (!supabaseServiceKey) {
    console.error("Error: SUPABASE_SERVICE_KEY environment variable is required");
    process.exit(1);
  }

  return {
    supabase: {
      url: supabaseUrl,
      serviceKey: supabaseServiceKey,
    },
    server: {
      name: "eryxon-flow-mcp",
      version: "2.0.0",
    },
    features: {
      logging: process.env.ENABLE_LOGGING === "true",
      healthCheck: process.env.ENABLE_HEALTH_CHECK !== "false", // Enabled by default
    },
  };
}

/**
 * Get current environment configuration
 */
export const env = loadEnvironment();
