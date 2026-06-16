/**
 * Batch Lifecycle API Endpoint
 *
 * Dedicated endpoints for batch lifecycle operations:
 * - POST /start?id=xxx - Start a batch (creates time entries, sets in_progress)
 * - POST /stop?id=xxx  - Stop a batch (distributes time, sets completed)
 * - POST /add-operations?id=xxx - Add operations to a batch
 *
 * Authentication: API key in Authorization header
 */

import { createClient } from "@supabase/supabase-js";
import { authenticateAndSetContext } from "@shared/auth.ts";
import { corsHeaders } from "@shared/cors.ts";
import { handleOptions, handleError } from "@shared/validation/errorHandler.ts";
import { dispatchEvent } from "@shared/events.ts";
import {
  BatchLifecycleBatch,
  BatchLifecycleOperation,
  BatchLifecycleRepository,
  createBatchLifecycleService,
} from "./service.ts";
import {
  AutomatedExceptionMonitorRepository,
  MonitoredBatch,
  createAutomatedExceptionMonitor,
} from "./monitor.ts";

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

function normalizeOperationIds(value: unknown): { ids: string[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ids: [], error: "operation_ids array required" };
  }

  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || id.trim().length === 0) {
      return { ids: [], error: "operation_ids must contain non-empty strings" };
    }
    ids.push(id.trim());
  }

  if (new Set(ids).size !== ids.length) {
    return { ids: [], error: "operation_ids must not contain duplicates" };
  }

  return { ids };
}

async function validateOperationsInTenant(
  supabase: any,
  tenantId: string,
  operationIds: string[],
): Promise<string | null> {
  if (operationIds.length === 0) return null;

  const { data, error } = await supabase
    .from("operations")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", operationIds);

  if (error) return `Operation validation failed: ${error.message}`;

  const foundIds = new Set((data || []).map((operation: { id: string }) => operation.id));
  const missingIds = operationIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return "operation_ids must reference operations in the authenticated tenant";
  }

  return null;
}

async function validateOperationsUnassigned(
  supabase: any,
  tenantId: string,
  operationIds: string[],
): Promise<string | null> {
  if (operationIds.length === 0) return null;

  const { data, error } = await supabase
    .from("batch_operations")
    .select("operation_id")
    .eq("tenant_id", tenantId)
    .in("operation_id", operationIds);

  if (error) return `Batch assignment validation failed: ${error.message}`;
  if ((data || []).length > 0) {
    return "operation_ids must not already be assigned to another batch";
  }

  return null;
}

function createRepository(supabase: any): BatchLifecycleRepository {
  return {
    async getBatch(tenantId: string, batchId: string): Promise<BatchLifecycleBatch | null> {
      const { data, error } = await supabase
        .from("operation_batches")
        .select("id, batch_number, batch_type, status, cell_id, production_mode")
        .eq("id", batchId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch batch: ${error.message}`);
      }

      if (!data) return null;

      return {
        id: data.id,
        batchNumber: data.batch_number,
        batchType: data.batch_type,
        status: data.status,
        cellId: data.cell_id,
        productionMode: data.production_mode ?? "manual",
      };
    },

    async listBatchOperations(tenantId: string, batchId: string): Promise<BatchLifecycleOperation[]> {
      const { data, error } = await supabase
        .from("batch_operations")
        .select(`
          operation_id,
          operation:operations(
            id,
            operation_name,
            estimated_time,
            actual_time,
            part:parts(
              id,
              part_number,
              job:jobs(id, job_number, customer)
            )
          )
        `)
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId)
        .order("sequence_in_batch", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch batch operations: ${error.message}`);
      }

      return (data ?? []).map((row: any) => ({
        operationId: row.operation_id,
        operationName: row.operation?.operation_name ?? null,
        estimatedTime: row.operation?.estimated_time ?? null,
        actualTime: row.operation?.actual_time ?? null,
        partId: row.operation?.part?.id ?? null,
        partNumber: row.operation?.part?.part_number ?? null,
        jobId: row.operation?.part?.job?.id ?? null,
        jobNumber: row.operation?.part?.job?.job_number ?? null,
        customer: row.operation?.part?.job?.customer ?? null,
      }));
    },

    async insertTimeEntries(tenantId: string, operatorId: string, operationIds: string[], startedAt: string): Promise<void> {
      const rows = operationIds.map((operationId) => ({
        tenant_id: tenantId,
        operation_id: operationId,
        operator_id: operatorId,
        start_time: startedAt,
      }));
      const { error } = await supabase.from("time_entries").insert(rows);
      if (error) {
        throw new Error(`Time entries: ${error.message}`);
      }
    },

    async updateOperationsStarted(tenantId: string, operationIds: string[], startedAt: string): Promise<void> {
      const { error } = await supabase
        .from("operations")
        .update({ status: "in_progress", started_at: startedAt })
        .in("id", operationIds)
        .eq("tenant_id", tenantId)
        .eq("status", "not_started");
      if (error) {
        throw new Error(`Failed to start operations: ${error.message}`);
      }
    },

    async listActiveTimeEntries(tenantId: string, operationIds: string[]) {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, operation_id, start_time")
        .in("operation_id", operationIds)
        .eq("tenant_id", tenantId)
        .is("end_time", null);

      if (error) {
        throw new Error(`Failed to fetch active time entries: ${error.message}`);
      }

      return (data ?? []).map((entry: any) => ({
        id: entry.id,
        operationId: entry.operation_id,
        startTime: entry.start_time,
      }));
    },

    async closeTimeEntry(tenantId: string, entryId: string, endedAt: string, durationMinutes: number): Promise<void> {
      const { error } = await supabase
        .from("time_entries")
        .update({ end_time: endedAt, duration_minutes: durationMinutes })
        .eq("id", entryId)
        .eq("tenant_id", tenantId);
      if (error) {
        throw new Error(`Failed to close time entry: ${error.message}`);
      }
    },

    async getOperationActualTime(tenantId: string, operationId: string): Promise<number> {
      const { data, error } = await supabase
        .from("operations")
        .select("actual_time")
        .eq("id", operationId)
        .eq("tenant_id", tenantId)
        .single();
      if (error) {
        throw new Error(`Failed to read operation actual time: ${error.message}`);
      }
      return data?.actual_time ?? 0;
    },

    async updateOperationActualTime(tenantId: string, operationId: string, actualTime: number): Promise<void> {
      const { error } = await supabase
        .from("operations")
        .update({ actual_time: actualTime })
        .eq("id", operationId)
        .eq("tenant_id", tenantId);
      if (error) {
        throw new Error(`Failed to update operation actual time: ${error.message}`);
      }
    },

    async updateOperationsCompleted(tenantId: string, operationIds: string[], completedAt: string): Promise<void> {
      const { error } = await supabase
        .from("operations")
        .update({ status: "completed", completed_at: completedAt })
        .in("id", operationIds)
        .eq("tenant_id", tenantId);
      if (error) {
        throw new Error(`Failed to complete operations: ${error.message}`);
      }
    },

    async updateBatchStarted(tenantId: string, batchId: string, startedAt: string, startedBy: string | null): Promise<void> {
      const { error } = await supabase
        .from("operation_batches")
        .update({ status: "in_progress", started_at: startedAt, started_by: startedBy })
        .eq("id", batchId)
        .eq("tenant_id", tenantId);
      if (error) {
        throw new Error(`Failed to update batch start: ${error.message}`);
      }
    },

    async updateBatchCompleted(
      tenantId: string,
      batchId: string,
      completedAt: string,
      completedBy: string | null,
      actualTime: number,
    ): Promise<void> {
      const { error } = await supabase
        .from("operation_batches")
        .update({
          status: "completed",
          completed_at: completedAt,
          completed_by: completedBy,
          actual_time: actualTime,
        })
        .eq("id", batchId)
        .eq("tenant_id", tenantId);
      if (error) {
        throw new Error(`Failed to update batch completion: ${error.message}`);
      }
    },
  };
}

function createAutomatedMonitorRepository(
  supabase: any,
): AutomatedExceptionMonitorRepository {
  return {
    async listAutomatedBatches(
      tenantId: string,
      batchId?: string,
    ): Promise<MonitoredBatch[]> {
      let query = supabase
        .from("operation_batches")
        .select(`
          id,
          batch_number,
          batch_type,
          status,
          production_mode,
          started_at,
          estimated_time,
          batch_operations(
            operation:operations(
              id,
              status,
              operation_name,
              estimated_time,
              part:parts(
                id,
                part_number,
                job:jobs(id, job_number, customer)
              )
            )
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("production_mode", "automated")
        .eq("batch_type", "laser_nesting")
        .eq("status", "in_progress");

      if (batchId) {
        query = query.eq("id", batchId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to load automated batches: ${error.message}`);
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        batchNumber: row.batch_number,
        batchType: row.batch_type,
        status: row.status,
        productionMode: row.production_mode,
        startedAt: row.started_at,
        estimatedTime: row.estimated_time,
        operations: (row.batch_operations ?? [])
          .map((item: any) => item.operation)
          .filter(Boolean)
          .map((operation: any) => ({
            operationId: operation.id,
            operationName: operation.operation_name ?? null,
            status: operation.status,
            estimatedTime: operation.estimated_time ?? null,
            partId: operation.part?.id ?? null,
            partNumber: operation.part?.part_number ?? null,
            jobId: operation.part?.job?.id ?? null,
            jobNumber: operation.part?.job?.job_number ?? null,
            customer: operation.part?.job?.customer ?? null,
          })),
      }));
    },

    async findBatchOperationExpectation(
      tenantId: string,
      batchId: string,
      operationId: string,
    ) {
      const { data, error } = await supabase
        .from("expectations")
        .select("id, context, source")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "operation")
        .eq("entity_id", operationId)
        .is("superseded_by", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw new Error(`Failed to load expectations: ${error.message}`);
      }

      const existing = (data ?? []).find((expectation: any) =>
        expectation.source === "system" &&
        expectation.context?.batch_id === batchId
      );

      return existing ? { id: existing.id } : null;
    },

    async createBatchOperationExpectation({
      tenantId,
      batch,
      operation,
      expectedAt,
    }) {
      const { data, error } = await supabase
        .from("expectations")
        .insert({
          tenant_id: tenantId,
          entity_type: "operation",
          entity_id: operation.operationId,
          expectation_type: "completion_time",
          belief_statement:
            `Automated laser batch ${batch.batchNumber} should complete operation ${operation.operationName ?? operation.operationId} without unattended drift`,
          expected_value: {
            batch_id: batch.id,
            batch_number: batch.batchNumber,
            expected_completion_at: expectedAt,
            monitoring_source: "machine",
          },
          expected_at: expectedAt,
          source: "system",
          context: {
            batch_id: batch.id,
            batch_number: batch.batchNumber,
            batch_type: batch.batchType,
            production_mode: batch.productionMode,
            monitoring_source: "machine",
            owner_path: "/admin/exceptions",
            owner_role: "planner",
            operation_name: operation.operationName,
            part_number: operation.partNumber,
            job_number: operation.jobNumber,
          },
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to create expectation: ${error.message}`);
      }

      return { id: data.id };
    },

    async hasActiveException(tenantId: string, expectationId: string) {
      const { data, error } = await supabase
        .from("exceptions")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("expectation_id", expectationId)
        .in("status", ["open", "acknowledged"])
        .limit(1);

      if (error) {
        throw new Error(`Failed to load exceptions: ${error.message}`);
      }

      return (data?.length ?? 0) > 0;
    },

    async createNonOccurrenceException({
      tenantId,
      expectationId,
      batch,
      operation,
      expectedAt,
      detectedAt,
      overdueMinutes,
    }) {
      const { error } = await supabase.from("exceptions").insert({
        tenant_id: tenantId,
        expectation_id: expectationId,
        exception_type: "non_occurrence",
        status: "open",
        actual_value: {
          operation_status: operation.status,
          monitored_at: detectedAt,
        },
        occurred_at: expectedAt,
        deviation_amount: overdueMinutes,
        deviation_unit: "minutes",
        metadata: {
          batch_id: batch.id,
          batch_number: batch.batchNumber,
          batch_type: batch.batchType,
          production_mode: batch.productionMode,
          monitoring_source: "machine",
          owner_path: "/admin/exceptions",
          owner_role: "planner",
          operation_id: operation.operationId,
          operation_name: operation.operationName,
          part_id: operation.partId,
          part_number: operation.partNumber,
          job_id: operation.jobId,
          job_number: operation.jobNumber,
          customer: operation.customer,
          recommended_action:
            "Acknowledge the missed automated completion, inspect the laser cell, then resolve with root cause and corrective action.",
        },
      });

      if (error) {
        throw new Error(`Failed to create exception: ${error.message}`);
      }
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ""
  );
  const repository = createRepository(supabase);
  const service = createBatchLifecycleService(repository, {
    dispatch: (tenantId, event) =>
      dispatchEvent(tenantId, event.eventType, event.data, event.context),
  });
  const monitor = createAutomatedExceptionMonitor(
    createAutomatedMonitorRepository(supabase),
  );

  try {
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    const url = new URL(req.url);
    const batchId = url.searchParams.get("id");
    const action = url.pathname.split("/").pop(); // start, stop, add-operations

    if (!batchId) return errorResponse("VALIDATION_ERROR", "Batch ID required (?id=xxx)");

    const body = await req.json().catch(() => ({}));

    // ── Route to action ────────────────────────────────────────────
    if (action === "start") {
      const data = await service.startBatch(
        tenantId,
        batchId,
        body.operator_id || null,
      );
      return jsonResponse({ success: true, data });
    }

    if (action === "stop") {
      const data = await service.stopBatch(
        tenantId,
        batchId,
        body.operator_id || null,
      );
      return jsonResponse({ success: true, data });
    }

    if (action === "add-operations") {
      if (batch.status !== "draft" && batch.status !== "ready") {
        return errorResponse("INVALID_STATE", `Cannot modify operations in '${batch.status}' status`);
      }

      const { ids: opIds, error } = normalizeOperationIds(body.operation_ids);
      if (error) return errorResponse("VALIDATION_ERROR", error);

      const operationError = await validateOperationsInTenant(supabase, tenantId, opIds);
      if (operationError) return errorResponse("VALIDATION_ERROR", operationError);

      const assignmentError = await validateOperationsUnassigned(supabase, tenantId, opIds);
      if (assignmentError) return errorResponse("VALIDATION_ERROR", assignmentError);

      const { data: existing } = await supabase
        .from("batch_operations")
        .select("sequence_in_batch")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId)
        .order("sequence_in_batch", { ascending: false })
        .limit(1);

      const startSeq = (existing?.[0]?.sequence_in_batch ?? 0) + 1;

      const rows = opIds.map((opId: string, i: number) => ({
        tenant_id: tenantId,
        batch_id: batchId,
        operation_id: opId,
        sequence_in_batch: startSeq + i,
      }));

      const { error } = await supabase.from("batch_operations").insert(rows);
      if (error) return errorResponse("INSERT_ERROR", error.message, 500);

      return jsonResponse({ success: true, data: { batch_id: batchId, operations_added: opIds.length } });
    }

    if (action === "monitor") {
      const data = await monitor.run(tenantId, batchId);
      return jsonResponse({ success: true, data });
    }

    return errorResponse("NOT_FOUND", `Unknown action: ${action}`, 404);
  } catch (error) {
    return handleError(error);
  }
});
