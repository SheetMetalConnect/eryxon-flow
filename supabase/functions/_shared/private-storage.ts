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
  supabase: any,
  tenantId: string,
  request: SignedUrlRequest,
): Promise<string> {
  const { bucket, path, recordId, expiresIn = 900 } = request;

  if (!path?.trim() || !recordId?.trim()) {
    throw new ForbiddenError("path and recordId are required");
  }

  // Authorize: the part must exist, belong to this tenant, and reference the path.
  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("id, tenant_id, file_paths")
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

  const filePaths: string[] = Array.isArray(part.file_paths)
    ? part.file_paths
    : [];
  if (!filePaths.includes(path)) {
    throw new ForbiddenError("Requested file does not belong to this part");
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new InternalServerError(
      `Failed to create signed URL: ${error?.message ?? "unknown error"}`,
    );
  }

  return data.signedUrl as string;
}
