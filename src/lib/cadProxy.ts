import { supabase } from "@/integrations/supabase/client";
import type { PrivateStorageBucket } from "@/lib/privateObjectUrl";

const CAD_PROXY_FUNCTION = "api-cad-proxy";

export interface CADSourceRef {
  bucket: Extract<PrivateStorageBucket, "parts-cad">;
  path: string;
  recordId: string;
}

interface CADProxyErrorResponse {
  error?: string;
}

interface CADProxyRequest {
  action: "process" | "process-async" | "extract";
  source: CADSourceRef;
  file_name: string;
  include_geometry?: boolean;
  include_pmi?: boolean;
  generate_thumbnail?: boolean;
  thumbnail_size?: number;
}

export async function invokeCadProxy<T>(
  body: CADProxyRequest,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | CADProxyErrorResponse>(
    CAD_PROXY_FUNCTION,
    { body },
  );

  if (error) {
    throw error;
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(data.error);
  }

  return data as T;
}
