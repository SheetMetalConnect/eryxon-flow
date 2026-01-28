import { serveApi } from "@shared/handler.ts";
import { createSuccessResponse } from "@shared/validation/errorHandler.ts";
import type { HandlerContext } from "@shared/handler.ts";

// Custom handler for materials - extracts unique materials from parts table
async function handleGetMaterials(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const { data: parts, error } = await supabase
    .from('parts')
    .select('material')
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }

  // Extract unique materials and sort
  const materials = [...new Set(parts?.map((p: any) => p.material).filter(Boolean))].sort();

  return createSuccessResponse({ materials });
}

// Materials endpoint - read-only aggregation from parts table
export default serveApi(handleGetMaterials);
