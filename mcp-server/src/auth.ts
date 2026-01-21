/**
 * MCP Server Authentication
 *
 * Token-based authentication for HTTP transport.
 * Validates tokens against the mcp_endpoints table in Supabase.
 *
 * @version 3.0.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export interface AuthResult {
  valid: boolean;
  tenantId?: string;
  endpointId?: string;
  endpointName?: string;
  error?: string;
}

export interface AuthenticatedContext {
  supabase: SupabaseClient;
  tenantId: string;
  endpointId: string;
  endpointName: string;
}

/**
 * Hash a token using SHA256
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Validate an MCP authentication token
 * Returns the tenant_id if valid, or an error message if not
 */
export async function validateToken(
  token: string,
  adminSupabase: SupabaseClient
): Promise<AuthResult> {
  if (!token) {
    return { valid: false, error: "No token provided" };
  }

  const tokenHash = hashToken(token);
  const tokenPrefix = token.substring(0, 8);

  try {
    // Look up the endpoint by token hash
    const { data: endpoint, error } = await adminSupabase
      .from("mcp_endpoints")
      .select("id, tenant_id, name, enabled")
      .eq("token_hash", tokenHash)
      .eq("token_prefix", tokenPrefix)
      .single();

    if (error || !endpoint) {
      return { valid: false, error: "Invalid token" };
    }

    if (!endpoint.enabled) {
      return { valid: false, error: "Endpoint is disabled" };
    }

    // Update last_used_at and usage_count
    await adminSupabase
      .from("mcp_endpoints")
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: adminSupabase.rpc("increment_usage_count", {
          endpoint_id: endpoint.id,
        }),
      })
      .eq("id", endpoint.id);

    return {
      valid: true,
      tenantId: endpoint.tenant_id,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: `Authentication error: ${message}` };
  }
}

/**
 * Create an authenticated context for a validated token
 * Returns a tenant-scoped Supabase client
 */
export function createAuthenticatedContext(
  authResult: AuthResult,
  supabaseUrl: string,
  supabaseServiceKey: string
): AuthenticatedContext | null {
  if (!authResult.valid || !authResult.tenantId) {
    return null;
  }

  // Create a Supabase client with service key
  // RLS policies will filter by tenant_id automatically
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "x-tenant-id": authResult.tenantId,
      },
    },
  });

  return {
    supabase,
    tenantId: authResult.tenantId,
    endpointId: authResult.endpointId!,
    endpointName: authResult.endpointName!,
  };
}

/**
 * Full authentication flow for HTTP requests
 */
export async function authenticateRequest(
  authHeader: string | null,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ context: AuthenticatedContext | null; error: string | null }> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      context: null,
      error: "Missing Authorization header. Use: Authorization: Bearer <token>",
    };
  }

  // Create admin client for token validation
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authResult = await validateToken(token, adminSupabase);

  if (!authResult.valid) {
    return { context: null, error: authResult.error || "Invalid token" };
  }

  const context = createAuthenticatedContext(
    authResult,
    supabaseUrl,
    supabaseServiceKey
  );

  if (!context) {
    return { context: null, error: "Failed to create authenticated context" };
  }

  return { context, error: null };
}
