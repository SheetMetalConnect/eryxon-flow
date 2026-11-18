import { throwDatabaseError } from "@shared/validation/errorHandler.ts";
import { serveApi, errorResponse, successResponse } from "@shared/handler.ts";

const actions = { start: "start", pause: "pause", resume: "resume", complete: "finish" } as const;

serveApi(async (req, ctx) => {
  const { supabase, tenantId, url } = ctx;
  const operationId = url.searchParams.get("id");
  const action = url.pathname.split("/").pop() ?? "";
  if (!operationId) return errorResponse("VALIDATION_ERROR", "Operation ID is required (?id=xxx)");
  if (!Object.prototype.hasOwnProperty.call(actions, action)) return errorResponse("INVALID_OPERATION", "Supported operations: start, pause, resume, complete");

  const { data: result, error } = await supabase.rpc("transition_operation", {
    p_tenant_id: tenantId,
    p_operation_id: operationId,
    p_action: actions[action as keyof typeof actions],
    p_operator_id: url.searchParams.get("user_id"),
  });
  if (error) throwDatabaseError(error);

  const { data: operation, error: lookupError } = await supabase.from("operations")
    .select("*, part:parts!part_id(id, part_number, job:jobs!job_id(id, job_number, customer))")
    .eq("id", operationId).eq("tenant_id", tenantId).single();
  if (lookupError) {
    console.error("Committed operation could not be read", lookupError);
    return successResponse({ operation: result, operation_type: action, committed: true });
  }
  if (result.changed !== false && (action !== "start" || result.previous_status === "not_started")) {
    await ctx.recordPilotEvent({
      eventType: "operation.lifecycle", action: `operation.${action}`,
      entityType: "operation", entityId: operationId, entityName: operation.operation_name,
      extra: { previous_status: result.previous_status, new_status: operation.status },
    });
  }
  return successResponse({
    operation, operation_type: action, previous_status: result.previous_status,
    new_status: operation.status,
    time_entry_created: result.changed !== false && (action === "start" || action === "resume") && Boolean(url.searchParams.get("user_id")),
    time_entry_ended: result.changed !== false && (action === "pause" || action === "complete"),
  });
}, { methods: ["POST", "OPTIONS"] });
