/**
 * Issues/NCR API Endpoint
 *
 * RESTful API for managing production issues and Non-Conformance Reports (NCRs).
 *
 * Supported Methods:
 * - GET: Retrieve issues with filtering and pagination
 * - POST: Create new issues or NCRs
 * - PATCH: Update issue fields and workflow states
 * - DELETE: Delete issues
 *
 * Query Parameters (GET):
 * - operation_id, severity, status, reported_by_id, issue_type
 * - limit, offset
 *
 * Authentication:
 * - Requires API key: "Bearer ery_live_xxx" or "Bearer ery_test_xxx"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSuccessResponse,
  handleError,
  handleMethodNotAllowed,
  handleOptions,
  NotFoundError,
  ValidationException,
  UnauthorizedError,
  BadRequestError,
} from "../_shared/validation/errorHandler.ts";
import { IssueValidator } from "../_shared/validation/validators/IssueValidator.ts";
import {
  collectIssueForeignKeys,
  fetchValidIds,
} from "../_shared/validation/fkValidator.ts";
import type { ValidationContext } from "../_shared/validation/types.ts";

async function authenticateApiKey(
  authHeader: string | null,
  supabase: any,
): Promise<string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith("ery_live_") && !apiKey.startsWith("ery_test_")) {
    throw new UnauthorizedError("Invalid API key format");
  }

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, tenant_id")
    .eq("active", true);

  if (!keys || keys.length === 0) {
    throw new UnauthorizedError("No active API keys found");
  }

  for (const key of keys) {
    const { data: fullKey } = await supabase
      .from("api_keys")
      .select("key_hash, tenant_id")
      .eq("id", key.id)
      .single();

    if (fullKey && (await bcrypt.compare(apiKey, fullKey.key_hash))) {
      await supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id);

      return fullKey.tenant_id;
    }
  }

  throw new UnauthorizedError("Invalid API key");
}

serve(async (req) => {
  // Handle OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return handleOptions();
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Authenticate
    const tenantId = await authenticateApiKey(
      req.headers.get("authorization"),
      supabase,
    );

    // Set tenant context for RLS
    await supabase.rpc("set_active_tenant", { p_tenant_id: tenantId });

    // Route by HTTP method
    switch (req.method) {
      case "GET":
        return await handleGetIssues(req, supabase, tenantId);
      case "POST":
        return await handleCreateIssue(req, supabase, tenantId);
      case "PATCH":
        return await handleUpdateIssue(req, supabase, tenantId);
      case "DELETE":
        return await handleDeleteIssue(req, supabase, tenantId);
      default:
        return handleMethodNotAllowed(["GET", "POST", "PATCH", "DELETE"]);
    }
  } catch (error) {
    return handleError(error);
  }
});

/**
 * GET /api-issues - List issues with filtering and pagination
 */
async function handleGetIssues(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);

  // Query parameters
  const operationId = url.searchParams.get("operation_id");
  const severity = url.searchParams.get("severity");
  const status = url.searchParams.get("status");
  const reportedById = url.searchParams.get("reported_by_id");
  const issueType = url.searchParams.get("issue_type");

  // Pagination (with limits)
  let limit = parseInt(url.searchParams.get("limit") || "100");
  if (limit < 1) limit = 100;
  if (limit > 1000) limit = 1000;

  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Build query
  let query = supabase
    .from("issues")
    .select(
      `
      id,
      title,
      description,
      severity,
      status,
      resolution_notes,
      created_at,
      updated_at,
      resolved_at,
      issue_type,
      ncr_number,
      ncr_category,
      ncr_disposition,
      root_cause,
      corrective_action,
      preventive_action,
      affected_quantity,
      verification_required,
      verified_at,
      operation:operations (
        id,
        operation_name,
        part:parts (
          id,
          part_number,
          job:jobs (
            id,
            job_number
          )
        )
      ),
      reported_by:profiles!issues_reported_by_id_fkey (
        id,
        username,
        full_name
      ),
      resolved_by:profiles!issues_resolved_by_id_fkey (
        id,
        username,
        full_name
      ),
      verified_by:profiles!issues_verified_by_id_fkey (
        id,
        username,
        full_name
      )
    `,
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (operationId) {
    query = query.eq("operation_id", operationId);
  }
  if (severity) {
    query = query.eq("severity", severity);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (reportedById) {
    query = query.eq("reported_by_id", reportedById);
  }
  if (issueType) {
    query = query.eq("issue_type", issueType);
  }

  const { data: issues, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch issues: ${error.message}`);
  }

  return createSuccessResponse(
    issues || [],
    200,
    {
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
      filters_applied: {
        operation_id: operationId,
        severity,
        status,
        reported_by_id: reportedById,
        issue_type: issueType,
      },
    },
  );
}

/**
 * POST /api-issues - Create new issue or NCR
 */
async function handleCreateIssue(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

  // Collect foreign key IDs
  const fkIds = collectIssueForeignKeys(body);

  // Batch fetch valid IDs
  const [validOperationIds, validUserIds] = await Promise.all([
    fetchValidIds(supabase, "operations", fkIds.operationIds, tenantId),
    fetchValidIds(supabase, "profiles", fkIds.userIds, tenantId),
  ]);

  // Build validation context
  const context: ValidationContext = {
    validOperationIds,
    validOperatorIds: validUserIds, // Using validOperatorIds for all user references
    tenantId,
  };

  // Validate request
  const validator = new IssueValidator();
  const validationResult = validator.validate(body, context);

  if (!validationResult.valid) {
    throw new ValidationException(validationResult);
  }

  // Generate NCR number if this is an NCR and no number provided
  let ncrNumber = body.ncr_number;
  if (body.issue_type === "ncr" && !ncrNumber) {
    const { data: ncrData, error: ncrError } = await supabase
      .rpc("generate_ncr_number", { p_tenant_id: tenantId });

    if (!ncrError && ncrData) {
      ncrNumber = ncrData;
    } else {
      console.error("Failed to generate NCR number:", ncrError);
      // Continue without NCR number - it's not critical
    }
  }

  // Build issue data
  const issueData: any = {
    tenant_id: tenantId,
    operation_id: body.operation_id,
    title: body.title,
    description: body.description,
    severity: body.severity,
    reported_by_id: body.reported_by_id,
    status: body.status || "open",
    issue_type: body.issue_type || "general",
  };

  // Add NCR-specific fields if this is an NCR
  if (body.issue_type === "ncr") {
    issueData.ncr_number = ncrNumber;
    issueData.ncr_category = body.ncr_category;
    issueData.ncr_disposition = body.ncr_disposition;
    issueData.root_cause = body.root_cause;
    issueData.corrective_action = body.corrective_action;
    issueData.preventive_action = body.preventive_action;
    issueData.affected_quantity = body.affected_quantity;
    issueData.verification_required = body.verification_required || false;
  }

  // Create issue
  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .insert(issueData)
    .select()
    .single();

  if (issueError || !issue) {
    throw new Error(`Failed to create issue: ${issueError?.message}`);
  }

  // Trigger webhook for NCR created if this is an NCR
  if (issue.issue_type === "ncr") {
    try {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
            }`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            event_type: "ncr.created",
            data: {
              issue_id: issue.id,
              ncr_number: issue.ncr_number,
              title: issue.title,
              severity: issue.severity,
              ncr_category: issue.ncr_category,
              ncr_disposition: issue.ncr_disposition,
              operation_id: issue.operation_id,
              created_at: issue.created_at,
            },
          }),
        },
      );
    } catch (webhookError) {
      console.error("Failed to trigger ncr.created webhook:", webhookError);
      // Don't fail the creation if webhook fails
    }
  }

  return createSuccessResponse(issue, 201);
}

/**
 * PATCH /api-issues?id={issueId} - Update issue
 */
async function handleUpdateIssue(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const issueId = url.searchParams.get("id");

  if (!issueId) {
    throw new BadRequestError("Issue ID is required in query string (?id=xxx)");
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON in request body");
  }

  // Validate allowed fields
  const allowedFields = [
    "title",
    "description",
    "severity",
    "status",
    "resolution_notes",
    "resolved_by_id",
    "root_cause",
    "corrective_action",
    "preventive_action",
    "ncr_category",
    "ncr_disposition",
    "affected_quantity",
    "verification_required",
    "verified_by_id",
  ];
  const updates: any = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No valid fields to update");
  }

  // Validate user FKs if provided
  const userIds: string[] = [];
  if (updates.resolved_by_id && updates.resolved_by_id !== null) {
    userIds.push(updates.resolved_by_id);
  }
  if (updates.verified_by_id && updates.verified_by_id !== null) {
    userIds.push(updates.verified_by_id);
  }

  if (userIds.length > 0) {
    const validUserIds = await fetchValidIds(
      supabase,
      "profiles",
      userIds,
      tenantId,
    );

    if (
      updates.resolved_by_id &&
      updates.resolved_by_id !== null &&
      !validUserIds.includes(updates.resolved_by_id)
    ) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "resolved_by_id",
          message: "Invalid resolver user ID",
          constraint: "FK_CONSTRAINT",
          entityType: "issue",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "resolved_by_id references non-existent user",
      });
    }

    if (
      updates.verified_by_id &&
      updates.verified_by_id !== null &&
      !validUserIds.includes(updates.verified_by_id)
    ) {
      throw new ValidationException({
        valid: false,
        severity: "error" as any,
        httpStatus: 422,
        errors: [{
          field: "verified_by_id",
          message: "Invalid verifier user ID",
          constraint: "FK_CONSTRAINT",
          entityType: "issue",
        }],
        warnings: [],
        summary: "Validation failed",
        technicalDetails: "verified_by_id references non-existent user",
      });
    }
  }

  // Auto-set timestamps based on workflow
  if (updates.status === "resolved" && !updates.resolved_at) {
    updates.resolved_at = new Date().toISOString();
  }

  if (updates.verified_by_id && !body.verified_at) {
    updates.verified_at = new Date().toISOString();
  }

  updates.updated_at = new Date().toISOString();

  // Update issue
  const { data: issue, error } = await supabase
    .from("issues")
    .update(updates)
    .eq("id", issueId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update issue: ${error.message}`);
  }

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  return createSuccessResponse(issue, 200);
}

/**
 * DELETE /api-issues?id={issueId} - Delete issue
 */
async function handleDeleteIssue(
  req: Request,
  supabase: any,
  tenantId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const issueId = url.searchParams.get("id");

  if (!issueId) {
    throw new BadRequestError("Issue ID is required in query string (?id=xxx)");
  }

  // Verify issue exists
  const { data: issue } = await supabase
    .from("issues")
    .select("id")
    .eq("id", issueId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!issue) {
    throw new NotFoundError("Issue", issueId);
  }

  // Delete issue
  const { error } = await supabase
    .from("issues")
    .delete()
    .eq("id", issueId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to delete issue: ${error.message}`);
  }

  return createSuccessResponse(
    { message: "Issue deleted successfully", issue_id: issueId },
    200,
  );
}
