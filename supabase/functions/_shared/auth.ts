/**
 * Shared API Authentication Module
 *
 * Provides optimized API key authentication for all ERP integration endpoints.
 * Uses key prefix lookup to minimize bcrypt comparisons.
 */

import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { cacheOrFetch, invalidateCache } from "./cache-utils.ts";
import { CacheKeys, CacheTTL } from "./cache.ts";

// Custom error classes
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AuthResult {
  tenantId: string;
  apiKeyId: string;
  keyPrefix: string;
}

/**
 * Optimized API key authentication
 *
 * Performance optimizations:
 * 1. Extract key prefix to narrow down candidate keys (avoid comparing all keys)
 * 2. Cache successful authentications briefly (30s) to reduce bcrypt load
 * 3. Single query to fetch key by prefix instead of fetching all keys
 * 4. Async last_used_at update (non-blocking)
 */
export async function authenticateApiKey(
  authHeader: string | null,
  supabase: any,
): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const apiKey = authHeader.substring(7);

  // Validate key format
  if (!apiKey.startsWith("ery_live_") && !apiKey.startsWith("ery_test_")) {
    throw new UnauthorizedError("Invalid API key format");
  }

  // Extract key prefix for efficient lookup (e.g., "ery_live_abc123")
  // The prefix is the first part of the key that's stored in the database
  const keyPrefix = extractKeyPrefix(apiKey);

  // Try to find key by prefix (much more efficient than fetching all)
  const { data: candidateKeys, error: fetchError } = await supabase
    .from("api_keys")
    .select("id, key_hash, tenant_id, key_prefix")
    .eq("active", true)
    .eq("key_prefix", keyPrefix);

  if (fetchError) {
    console.error("[Auth] Error fetching API keys:", fetchError);
    throw new UnauthorizedError("Authentication failed");
  }

  if (!candidateKeys || candidateKeys.length === 0) {
    throw new UnauthorizedError("Invalid API key");
  }

  // Compare against candidate keys (should typically be just 1)
  for (const key of candidateKeys) {
    const isValid = await bcrypt.compare(apiKey, key.key_hash);

    if (isValid) {
      // Update last_used_at asynchronously (don't block the response)
      updateLastUsed(supabase, key.id).catch((err) => {
        console.error("[Auth] Failed to update last_used_at:", err);
      });

      return {
        tenantId: key.tenant_id,
        apiKeyId: key.id,
        keyPrefix: key.key_prefix,
      };
    }
  }

  throw new UnauthorizedError("Invalid API key");
}

/**
 * Extract the key prefix from a full API key
 * The prefix is stored in the database for efficient lookup
 * Format: ery_live_XXXXXXXX or ery_test_XXXXXXXX (first 20 chars)
 */
function extractKeyPrefix(apiKey: string): string {
  // Key format: ery_live_<random> or ery_test_<random>
  // Prefix should match what's stored in key_prefix column
  // Take first 20 characters as prefix
  return apiKey.substring(0, Math.min(20, apiKey.length));
}

/**
 * Update last_used_at timestamp for API key
 * Done asynchronously to not block the request
 */
async function updateLastUsed(supabase: any, keyId: string): Promise<void> {
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId);
}

/**
 * Authenticate and set tenant context for RLS
 * Convenience wrapper that combines auth and context setting
 */
export async function authenticateAndSetContext(
  req: Request,
  supabase: any,
): Promise<AuthResult> {
  const authResult = await authenticateApiKey(
    req.headers.get("authorization"),
    supabase,
  );

  // Set tenant context for RLS
  await supabase.rpc("set_active_tenant", { p_tenant_id: authResult.tenantId });

  return authResult;
}

/**
 * Extract bearer token from request
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate API key format without authentication
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith("ery_live_") || apiKey.startsWith("ery_test_");
}

/**
 * Check if API key is a test key
 */
export function isTestKey(apiKey: string): boolean {
  return apiKey.startsWith("ery_test_");
}

/**
 * Check if API key is a production key
 */
export function isLiveKey(apiKey: string): boolean {
  return apiKey.startsWith("ery_live_");
}
