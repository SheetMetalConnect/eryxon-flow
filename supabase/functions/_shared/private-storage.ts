import type { SupabaseClient } from "@supabase/supabase-js";
/**
 * Authorized signed-URL helper for private storage buckets.
 *
 * api-cad-proxy needs a short-lived signed URL for a CAD file in the private
 * `parts-cad` bucket so the external CAD backend can fetch it. This helper
 * enforces tenant isolation before signing: the referenced part (recordId)
 * must belong to the caller's tenant, and the requested path must be one of
 * that part's stored file paths. Without this module the function failed to
 * deploy (missing import). See issue ERY-305.
 */

import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "./validation/errorHandler.ts";

export const PRIVATE_SIGNED_URL_TTL_SECONDS = 900;

export function normalizePrivateObjectPath(value: string, bucket: string): string | null {
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    const prefix = `/storage/v1/object/`;
    let pathname: string;
    try { pathname = new URL(value).pathname; } catch { return null; }
    const match = pathname.match(new RegExp(`^${prefix}(?:public|sign|authenticated)/${bucket}/(.+)$`));
    if (!match) return null;
    path = match[1];
  }
  try { path = decodeURIComponent(path); } catch { return null; }
  if (path.includes("\\") || path.includes("\0")) return null;
  if (path.split("/").some(segment => segment === "." || segment === ".." || segment === "")) return null;
  return path;
}

export function isTenantScopedObjectPath(path: string, tenantId: string): boolean {
  return Boolean(tenantId) && path.startsWith(`${tenantId}/`)
    && !path.split("/").some(segment => segment === "." || segment === ".." || segment === "");
}

export function resolveAuthorizedPrivateObjectPath(
  ownedPaths: Array<string | null>,
  requestedPath: string,
  tenantId: string,
  bucket: string,
): string | null {
  const candidate = normalizePrivateObjectPath(requestedPath, bucket);
  if (!candidate || !isTenantScopedObjectPath(candidate, tenantId)) return null;
  return ownedPaths.some(path => typeof path === "string" && normalizePrivateObjectPath(path, bucket) === candidate)
    ? candidate : null;
}

export type PrivateStorageBucket = "parts-cad" | "parts-images";

export interface SignedUrlRequest {
  bucket: PrivateStorageBucket;
  /** Object path within the bucket. */
  path: string;
  /** The part this object belongs to; used to authorize the request. */
  recordId: string;
  /** Signed URL lifetime in seconds (default 900 = 15 min). */
  expiresIn?: number;
}

/**
 * Verify the part belongs to the tenant and owns the requested path, then
 * return a signed download URL. Throws NotFoundError / ForbiddenError /
 * InternalServerError (all mapped to proper HTTP statuses by mapError()).
 */
export async function createAuthorizedPrivateSignedUrl(
  supabase: SupabaseClient,
  tenantId: string,
  request: SignedUrlRequest,
): Promise<string> {
  const { bucket, path, recordId, expiresIn = PRIVATE_SIGNED_URL_TTL_SECONDS } = request;

  if (!path?.trim() || !recordId?.trim()) {
    throw new ForbiddenError("path and recordId are required");
  }

  // Authorize: the part must exist, belong to this tenant, and reference the path.
  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("id, tenant_id, file_paths, image_paths")
    .eq("id", recordId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (partError) {
    throw new InternalServerError(
      `Failed to authorize storage access: ${partError.message}`,
    );
  }

  if (!part) {
    // Not found OR not in this tenant — do not distinguish (avoid enumeration).
    throw new NotFoundError("part", recordId);
  }

  const paths = bucket === "parts-images" ? part.image_paths : part.file_paths;
  const authorizedPath = resolveAuthorizedPrivateObjectPath(Array.isArray(paths) ? paths : [], path, tenantId, bucket);
  if (!authorizedPath) {
    throw new ForbiddenError("Requested file does not belong to this part");
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(authorizedPath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new InternalServerError(
      `Failed to create signed URL: ${error?.message ?? "unknown error"}`,
    );
  }

  return data.signedUrl as string;
}
