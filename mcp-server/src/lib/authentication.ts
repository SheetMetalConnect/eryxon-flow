/**
 * MCP Authentication Module
 * Handles per-tenant authentication for MCP server
 */

import { getDatabase } from "../config/database.js";
import { logger } from "./logger.js";

export interface AuthContext {
  tenantId: string;
  keyId: string;
  allowedTools: string[];
  rateLimit: number;
  environment: "live" | "test";
}

export interface UsageLogData {
  toolName: string;
  toolArguments?: any;
  success: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
}

/**
 * Extract API key from MCP request
 * MCP doesn't have built-in auth, so we use a custom parameter
 */
export function extractApiKey(request: any): string | null {
  // Try to get from _meta.apiKey (custom parameter)
  const apiKey = request.params?._meta?.apiKey;

  if (!apiKey) {
    logger.warn("No API key provided in request");
    return null;
  }

  return apiKey;
}

/**
 * Authenticate MCP request and return tenant context
 */
export async function authenticateMcpRequest(apiKey: string): Promise<AuthContext> {
  const db = getDatabase();

  try {
    // Call validation function
    const { data, error } = await db.rpc("validate_mcp_key", {
      p_api_key: apiKey,
    });

    if (error) {
      logger.error("MCP key validation error", { error: error.message });
      throw new Error("Invalid MCP key");
    }

    if (!data || data.length === 0) {
      logger.warn("No data returned from MCP key validation");
      throw new Error("Invalid or disabled MCP key");
    }

    const keyData = Array.isArray(data) ? data[0] : data;

    logger.debug("MCP key validated successfully", {
      tenantId: keyData.tenant_id,
      keyId: keyData.key_id,
    });

    // Parse allowed_tools
    let allowedTools: string[] = ["*"];
    if (keyData.allowed_tools) {
      try {
        const parsed = typeof keyData.allowed_tools === "string"
          ? JSON.parse(keyData.allowed_tools)
          : keyData.allowed_tools;
        allowedTools = Array.isArray(parsed) ? parsed : ["*"];
      } catch (e) {
        logger.warn("Failed to parse allowed_tools, defaulting to all tools");
      }
    }

    return {
      tenantId: keyData.tenant_id,
      keyId: keyData.key_id,
      allowedTools,
      rateLimit: keyData.rate_limit || 100,
      environment: keyData.environment || "live",
    };
  } catch (error: any) {
    logger.error("Authentication failed", { error: error.message });
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Check if tool is allowed for this key
 */
export function checkToolPermission(
  authContext: AuthContext,
  toolName: string
): boolean {
  // Wildcard allows all tools
  if (authContext.allowedTools.includes("*")) {
    return true;
  }

  // Check if tool is explicitly allowed
  return authContext.allowedTools.includes(toolName);
}

/**
 * Set active tenant in database session
 */
export async function setActiveTenant(tenantId: string): Promise<void> {
  const db = getDatabase();

  try {
    const { error } = await db.rpc("set_active_tenant", {
      p_tenant_id: tenantId,
    });

    if (error) {
      logger.error("Failed to set active tenant", { error: error.message, tenantId });
      throw new Error(`Failed to set active tenant: ${error.message}`);
    }

    logger.debug("Active tenant set", { tenantId });
  } catch (error: any) {
    logger.error("Error setting active tenant", { error: error.message });
    throw error;
  }
}

/**
 * Log MCP key usage for audit trail
 */
export async function logKeyUsage(
  authContext: AuthContext,
  usageData: UsageLogData
): Promise<void> {
  const db = getDatabase();

  try {
    await db.rpc("log_mcp_key_usage", {
      p_tenant_id: authContext.tenantId,
      p_key_id: authContext.keyId,
      p_tool_name: usageData.toolName,
      p_tool_arguments: usageData.toolArguments || null,
      p_success: usageData.success,
      p_error_message: usageData.errorMessage || null,
      p_response_time_ms: usageData.responseTimeMs || null,
      p_ip_address: null, // Not available in MCP stdio
      p_user_agent: null, // Not available in MCP stdio
    });

    logger.debug("MCP usage logged", {
      toolName: usageData.toolName,
      success: usageData.success,
    });
  } catch (error: any) {
    // Don't fail the request if logging fails
    logger.error("Failed to log MCP usage", { error: error.message });
  }
}

/**
 * Middleware to wrap tool execution with authentication
 */
export async function withAuthentication<T>(
  request: any,
  handler: (authContext: AuthContext, args: any) => Promise<T>
): Promise<T> {
  // Extract API key
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    throw new Error("Missing MCP API key. Include it in request params._meta.apiKey");
  }

  // Authenticate
  const authContext = await authenticateMcpRequest(apiKey);

  // Set active tenant for RLS
  await setActiveTenant(authContext.tenantId);

  // Execute handler with auth context
  return await handler(authContext, request.params.arguments || {});
}
