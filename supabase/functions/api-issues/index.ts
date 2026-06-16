import { serveApi } from "@shared/handler.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { IssueValidator } from "@shared/validation/validators/IssueValidator.ts";
import {
  BadRequestError,
  createSuccessResponse,
  NotFoundError,
} from "@shared/validation/errorHandler.ts";
import {
  PRIVATE_SIGNED_URL_TTL_SECONDS,
  resolveAuthorizedPrivateObjectPath,
} from "@shared/private-storage.ts";

async function handleGet(req: Request, ctx: HandlerContext): Promise<Response> {
  if (ctx.lastSegment !== "image-url") {
    return defaultIssuesHandler(req, ctx);
  }

  const issueId = ctx.pathSegments[ctx.pathSegments.length - 2];
  if (!issueId || issueId === "api-issues") {
    throw new BadRequestError("Issue ID is required");
  }

  const requestedPath = ctx.url.searchParams.get("path");
  if (!requestedPath) {
    throw new BadRequestError("path is required");
  }

  const { supabase, tenantId } = ctx;
  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("image_paths")
    .eq("id", issueId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (issueError) {
    throw new Error(
      `Failed to validate issue attachment access: ${issueError.message}`,
    );
  }

  if (!issue) {
    throw new NotFoundError("issue", issueId);
  }

  const authorizedPath = resolveAuthorizedPrivateObjectPath(
    issue.image_paths || [],
    requestedPath,
    tenantId,
    "issues",
  );

  if (!authorizedPath) {
    throw new NotFoundError("Issue attachment not found");
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("issues")
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

const issuesCrudConfig = {
  table: "issues",
  selectFields: `
      id,
      title,
      description,
      severity,
      status,
      issue_type,
      ncr_category,
      disposition,
      affected_quantity,
      reported_by_id,
      created_by,
      root_cause,
      corrective_action,
      preventive_action,
      resolution_notes,
      verification_required,
      current_cell_id,
      intended_next_cell_id,
      reviewed_at,
      reviewed_by,
      image_paths,
      created_at,
      updated_at,
      operation_id,
      operation:operations (
        id,
        operation_name
      ),
      reporter:profiles!reported_by_id (
        id,
        full_name,
        username
      ),
      current_cell:cells!issues_current_cell_id_fkey (
        id,
        name
      ),
      intended_next_cell:cells!issues_intended_next_cell_id_fkey (
        id,
        name
      )
    `,
  searchFields: ["title", "description"],
  allowedFilters: [
    "severity",
    "status",
    "issue_type",
    "ncr_category",
    "reported_by_id",
    "operation_id",
  ],
  sortableFields: ["created_at", "severity", "status", "updated_at"],
  defaultSort: { field: "created_at", direction: "desc" as const },
  softDelete: false,
  validator: IssueValidator,
};

const defaultIssuesHandler = createCrudHandler(issuesCrudConfig);

// Configure CRUD handler for issues
serveApi(
  createCrudHandler({
    ...issuesCrudConfig,
    customHandlers: {
      get: handleGet,
    },
  }),
);
