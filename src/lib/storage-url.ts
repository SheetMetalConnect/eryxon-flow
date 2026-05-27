import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export const STORAGE_BUCKETS = {
  PARTS_CAD: "parts-cad",
  PARTS_IMAGES: "parts-images",
  ISSUES: "issues",
  BATCH_IMAGES: "batch-images",
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

interface StorageUrlResult {
  url: string;
  path: string;
  bucket: string;
  expires_in: number;
}

export class StorageUrlError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StorageUrlError";
  }
}

export async function getStorageUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn = 3600,
): Promise<StorageUrlResult> {
  const { data, error } = await supabase.functions.invoke("api-storage-url", {
    body: { bucket, path, expiresIn },
  });

  if (error) {
    const message = error.message || "Failed to generate signed URL";
    logger.error("storageUrl", message, error);
    throw new StorageUrlError(message, "FUNCTION_ERROR");
  }

  const result = data as { success: boolean; data: StorageUrlResult; error?: { code: string; message: string } };

  if (!result.success || !result.data?.url) {
    const errMsg = result.error?.message || "Failed to generate signed URL";
    logger.error("storageUrl", errMsg, result);
    throw new StorageUrlError(errMsg, result.error?.code || "UNKNOWN");
  }

  return result.data;
}

export async function getStorageUrlOrNull(
  bucket: StorageBucket,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    const result = await getStorageUrl(bucket, path, expiresIn);
    return result.url;
  } catch {
    return null;
  }
}
