import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { canCreateParts } from "@shared/plan-limits.ts";
import type { HandlerContext } from "@shared/handler.ts";
import {
  BadRequestError,
  createSuccessResponse,
  NotFoundError,
  PaymentRequiredError,
} from "@shared/validation/errorHandler.ts";
import {
  PRIVATE_SIGNED_URL_TTL_SECONDS,
  resolveAuthorizedPrivateObjectPath,
} from "@shared/private-storage.ts";

// Custom POST handler with plan limits and nested operations
async function handleCreate(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const { supabase, tenantId } = ctx;
  const body = await req.json();

  const quantity = body.quantity || 1;
  const quota = await canCreateParts(supabase, tenantId, quantity);
  if (!quota.allowed) {
    throw new PaymentRequiredError(
      "part",
      quota.current || 0,
      quota.limit || 0,
    );
  }

  if (!body.part_number) throw new BadRequestError("part_number is required");
  if (!body.job_id) throw new BadRequestError("job_id is required");

  const { operations, ...partData } = body;

  const { data: part, error } = await supabase
    .from("parts")
    .insert({
      ...partData,
      tenant_id: tenantId,
      status: partData.status || "not_started",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create part: ${error.message}`);

  const createdOps = [];
  if (operations && Array.isArray(operations)) {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const { data: created, error: opErr } = await supabase
        .from("operations")
        .insert({
          ...op,
          part_id: part.id,
          tenant_id: tenantId,
          sequence: op.sequence || (i + 1),
          status: "not_started",
        })
        .select()
        .single();
      if (!opErr && created) createdOps.push(created);
    }
  }

  return createSuccessResponse(
    { part: { ...part, operations: createdOps } },
    201,
  );
}

async function handleGet(req: Request, ctx: HandlerContext): Promise<Response> {
  if (ctx.lastSegment !== "file-url") {
    return defaultPartsHandler(req, ctx);
  }

  const partId = ctx.pathSegments[ctx.pathSegments.length - 2];
  if (!partId || partId === "api-parts") {
    throw new BadRequestError("Part ID is required");
  }

  const requestedPath = ctx.url.searchParams.get("path");
  if (!requestedPath) {
    throw new BadRequestError("path is required");
  }

  const { supabase, tenantId } = ctx;
  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("file_paths")
    .eq("id", partId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (partError) {
    throw new Error(
      `Failed to validate part file access: ${partError.message}`,
    );
  }

  if (!part) {
    throw new NotFoundError("part", partId);
  }

  const authorizedPath = resolveAuthorizedPrivateObjectPath(
    part.file_paths || [],
    requestedPath,
    tenantId,
    "parts-cad",
  );

  if (!authorizedPath) {
    throw new NotFoundError("CAD file not found for this part");
  }

  // parts-cad also covers DNC artifact delivery, so every signed URL stays
  // record-authorized and tenant-prefixed rather than being minted client-side.
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("parts-cad")
    .createSignedUrl(authorizedPath, PRIVATE_SIGNED_URL_TTL_SECONDS);

  if (signedUrlError) {
    throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
  }

  return createSuccessResponse({
    path: authorizedPath,
    url: signedUrlData?.signedUrl || null,
    expires_in: PRIVATE_SIGNED_URL_TTL_SECONDS,
  });
}

const partsCrudConfig = {
  table: "parts",
  selectFields: `
      id, part_number, material, quantity, status, file_paths, notes,
      drawing_no, cnc_program_name, is_bullet_card,
      created_at, updated_at,
      job:jobs!job_id (id, job_number, customer)
    `,
  searchFields: ["part_number", "material"],
  allowedFilters: ["job_id", "status", "material"],
  fuzzyFilters: ["part_number", "material"],
  sortableFields: ["part_number", "created_at", "status"],
  defaultSort: { field: "created_at", direction: "desc" as const },
  softDelete: true,
  enableSync: true,
};

const defaultPartsHandler = createCrudHandler(partsCrudConfig);

serveApi(
  createCrudHandler({
    ...partsCrudConfig,
    customHandlers: {
      get: handleGet,
      post: handleCreate,
    },
  }),
);
