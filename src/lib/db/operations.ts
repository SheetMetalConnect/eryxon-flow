import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { dispatchOperationStarted, dispatchOperationCompleted } from "../event-dispatch";
import { logger } from '@/lib/logger';
import { parseOperatorTerminalModeNote } from "@/features/operator-terminal/workModes";
import { fetchInChunks } from "./chunked";
import { fetchAllPages } from "./pagination";

export interface OperationWithDetails {
  id: string;
  operation_name: string;
  operation_type?: string | null;
  sequence: number;
  estimated_time: number;
  actual_time: number;
  updated_at: string | null;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  completion_percentage: number;
  notes: string | null;
  metadata?: Tables<"operations">["metadata"];
  assigned_operator_id: string | null;
  cell_id: string;
  planned_start: string | null;
  part: {
    id: string;
    part_number: string;
    material: string;
    quantity: number;
    parent_part_id: string | null;
    file_paths: string[] | null;
    image_paths: string[] | null;
    drawing_no: string | null;
    cnc_program_name: string | null;
    is_bullet_card: boolean | null;
    job: {
      id: string;
      job_number: string;
      customer: string | null;
      due_date: string | null;
      due_date_override: string | null;
    };
  };
  cell: {
    id: string;
    name: string;
    color: string | null;
    sequence: number;
  };
  active_time_entry?: {
    id: string;
    operator_id: string;
    start_time: string;
    notes?: string | null;
    operator: {
      full_name: string;
    };
  };
  operator_mode_summary?: {
    active_mode: "setup" | "production" | null;
    has_setup_history: boolean;
  };
  batch_context?: OperationBatchContext | null;
}

export interface OperationBatchMember {
  operation_id: string;
  operation_name: string;
  part_id: string;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  sequence_in_batch: number | null;
  active_time_entry?: {
    operator_id: string;
    operator_name: string;
    notes?: string | null;
  };
}

export interface OperationBatchContext {
  batch_id: string;
  batch_number: string;
  batch_type: Tables<"operation_batches">["batch_type"];
  status: Tables<"operation_batches">["status"];
  operations_count: number;
  material: string | null;
  nesting_metadata: Record<string, unknown> | null;
  sequence_in_batch: number | null;
  parent_batch: {
    id: string;
    batch_number: string;
    batch_type: Tables<"operation_batches">["batch_type"];
    status: Tables<"operation_batches">["status"];
  } | null;
  members: OperationBatchMember[];
}

interface BatchLinkResult {
  batch_id: string;
  operation_id: string;
  sequence_in_batch: number | null;
  batch: {
    id: string;
    batch_number: string;
    batch_type: Tables<"operation_batches">["batch_type"];
    status: Tables<"operation_batches">["status"];
    operations_count: number;
    material: string | null;
    nesting_metadata: Record<string, unknown> | null;
    parent_batch: {
      id: string;
      batch_number: string;
      batch_type: Tables<"operation_batches">["batch_type"];
      status: Tables<"operation_batches">["status"];
    } | null;
  } | {
    id: string;
    batch_number: string;
    batch_type: Tables<"operation_batches">["batch_type"];
    status: Tables<"operation_batches">["status"];
    operations_count: number;
    material: string | null;
    nesting_metadata: Record<string, unknown> | null;
    parent_batch: {
      id: string;
      batch_number: string;
      batch_type: Tables<"operation_batches">["batch_type"];
      status: Tables<"operation_batches">["status"];
    }[];
  }[];
}

interface BatchMemberResult {
  batch_id: string;
  operation_id: string;
  sequence_in_batch: number | null;
  operation: {
    id: string;
    status: OperationWithDetails["status"];
    operation_name: string;
    part_id: string;
  } | {
    id: string;
    status: OperationWithDetails["status"];
    operation_name: string;
    part_id: string;
  }[];
}

interface OperationModeHistoryResult {
  operation_id: string;
  notes: string | null;
}

async function fetchOperationsWithDetailsInternal(
  tenantId: string,
  includeCompleted: boolean,
  operationId?: string,
): Promise<OperationWithDetails[]> {
  let operationQuery = supabase
    .from("operations")
    .select(`
      *,
      part:parts!inner(
        id,
        part_number,
        material,
        quantity,
        parent_part_id,
        file_paths,
        image_paths,
        drawing_no,
        cnc_program_name,
        is_bullet_card,
        job:jobs!inner(
          id,
          job_number,
          customer,
          due_date,
          due_date_override
        )
      ),
      cell:cells!inner(
        id,
        name,
        color,
        sequence
      )
    `)
    .eq("tenant_id", tenantId)
    .order("sequence")
    .order("id");

  if (!includeCompleted) operationQuery = operationQuery.neq("status", "completed");
  if (operationId) operationQuery = operationQuery.eq("id", operationId);
  const visibleOperations = await fetchAllPages((from, to) => operationQuery.range(from, to));
  if (visibleOperations.length === 0) return [];

  const activeEntries = await fetchAllPages((from, to) => supabase
    .from("time_entries")
    .select(`
      id, operation_id, operator_id, shop_floor_operator_id, start_time, notes,
      operator:profiles!operator_id(full_name),
      shop_floor_operator:operators!shop_floor_operator_id(full_name)
    `)
    .eq("tenant_id", tenantId)
    .is("end_time", null)
    .order("id")
    .range(from, to));

  const operationIds = visibleOperations.map((operation) => operation.id);
  const activeEntriesByOperation = new Map(
    (activeEntries ?? []).map((entry) => [
      entry.operation_id,
      {
        id: entry.id,
        operator_id: entry.shop_floor_operator_id ?? entry.operator_id,
        start_time: entry.start_time,
        notes: entry.notes ?? null,
        operator: entry.shop_floor_operator ?? entry.operator ?? { full_name: "Unknown" },
      },
    ]),
  );
  const setupHistoryByOperation = new Set<string>();

  const batchContextsByOperation = new Map<string, OperationBatchContext>();

  if (operationIds.length > 0) {
    // Operator-mode history and batch context enrich each operation, but they must
    // never block the terminal. If any of these queries fail (a half-migrated batch
    // table, an oversized `.in()`, a missing FK embed) we log and load operations
    // WITHOUT batch context rather than blanking the whole view — operators can
    // still see and clock on their work.
    try {
      const modeHistory = await fetchInChunks<OperationModeHistoryResult>(operationIds, (chunk) =>
        supabase
          .from("time_entries")
          .select("operation_id, notes")
          .eq("tenant_id", tenantId)
          .in("operation_id", chunk)
          .like("notes", "operator-mode:%"),
      );

      for (const entry of modeHistory) {
        if (parseOperatorTerminalModeNote(entry.notes) === "setup") {
          setupHistoryByOperation.add(entry.operation_id);
        }
      }

      const batchLinks = await fetchInChunks<BatchLinkResult>(operationIds, (chunk) =>
        supabase
          .from("batch_operations")
          .select(`
            batch_id,
            operation_id,
            sequence_in_batch,
            batch:operation_batches!batch_id(
              id,
              batch_number,
              batch_type,
              status,
              operations_count,
              material,
              nesting_metadata,
              parent_batch:operation_batches!parent_batch_id(
                id,
                batch_number,
                batch_type,
                status
              )
            )
          `)
          .in("operation_id", chunk)
          .eq("tenant_id", tenantId),
      );

      const batchIds = Array.from(
        new Set(batchLinks.map((link) => link.batch_id)),
      );

      const membersByBatchId = new Map<string, OperationBatchMember[]>();

      if (batchIds.length > 0) {
        // Chunk by batch_id too — a tenant can accumulate enough batches to blow
        // the PostgREST URL limit on a single `.in()`.
        const batchMembers = await fetchInChunks<BatchMemberResult>(batchIds, (chunk) =>
          supabase
            .from("batch_operations")
            .select(`
              batch_id,
              operation_id,
              sequence_in_batch,
              operation:operations!operation_id(
                id,
                status,
                operation_name,
                part_id
              )
            `)
            .in("batch_id", chunk)
            .eq("tenant_id", tenantId)
            .order("sequence_in_batch", { ascending: true }),
        );

        for (const member of batchMembers) {
          const operation = Array.isArray(member.operation)
            ? member.operation[0]
            : member.operation;

          if (!operation) continue;

          const safeEntry = activeEntriesByOperation.get(member.operation_id);
          const existingMembers = membersByBatchId.get(member.batch_id) ?? [];
          existingMembers.push({
            operation_id: member.operation_id,
            operation_name: operation.operation_name,
            part_id: operation.part_id,
            status: operation.status,
            sequence_in_batch: member.sequence_in_batch,
            active_time_entry: safeEntry
              ? {
                  operator_id: safeEntry.operator_id,
                  operator_name: safeEntry.operator.full_name,
                  notes: safeEntry.notes ?? null,
                }
              : undefined,
          });
          membersByBatchId.set(member.batch_id, existingMembers);
        }
      }

      for (const link of batchLinks) {
        const batch = Array.isArray(link.batch) ? link.batch[0] : link.batch;
        if (!batch) continue;

        const parentBatch = Array.isArray(batch.parent_batch)
          ? batch.parent_batch[0]
          : batch.parent_batch;

        batchContextsByOperation.set(link.operation_id, {
          batch_id: batch.id,
          batch_number: batch.batch_number,
          batch_type: batch.batch_type,
          status: batch.status,
          operations_count: batch.operations_count,
          material: batch.material,
          nesting_metadata: batch.nesting_metadata,
          sequence_in_batch: link.sequence_in_batch,
          parent_batch: parentBatch
            ? {
                id: parentBatch.id,
                batch_number: parentBatch.batch_number,
                batch_type: parentBatch.batch_type,
                status: parentBatch.status,
              }
            : null,
          members: membersByBatchId.get(batch.id) ?? [],
        });
      }
    } catch (enrichmentError) {
      logger.error(
        "Database",
        "Operation batch/mode enrichment failed; loading operations without batch context",
        enrichmentError,
      );
      setupHistoryByOperation.clear();
      batchContextsByOperation.clear();
    }
  }

  return visibleOperations.map((operation) => {
    const safeEntry = activeEntriesByOperation.get(operation.id);
    return {
      ...operation,
      active_time_entry: safeEntry,
      operator_mode_summary: {
        active_mode: parseOperatorTerminalModeNote(safeEntry?.notes ?? null),
        has_setup_history: setupHistoryByOperation.has(operation.id),
      },
      batch_context: batchContextsByOperation.get(operation.id) ?? null,
    };
  });
}

export async function fetchOperationsWithDetails(tenantId: string): Promise<OperationWithDetails[]> {
  return fetchOperationsWithDetailsInternal(tenantId, false);
}

export async function fetchOperationLookupDetails(tenantId: string): Promise<OperationWithDetails[]> {
  return fetchOperationsWithDetailsInternal(tenantId, true);
}

export async function fetchOperationDetails(tenantId: string, operationId: string): Promise<OperationWithDetails | null> {
  const operations = await fetchOperationsWithDetailsInternal(tenantId, true, operationId);
  return operations[0] ?? null;
}

export interface OperationPlanUpdate {
  /** Planned time in MINUTES (operations.estimated_time). */
  estimated_time?: number;
  /** Planned start (ISO timestamp) or null to clear. */
  planned_start?: string | null;
  /** Planned end (ISO timestamp) or null to clear. */
  planned_end?: string | null;
}

/**
 * Correct an operation's plan after creation: planned time and the planned
 * start/end window. `estimated_time` is normally only set at part-operation
 * creation; this makes it editable from the admin operation detail.
 *
 * GUIDE, don't gate — this only writes the requested fields and never blocks.
 */
export async function updateOperationPlan(
  operationId: string,
  plan: OperationPlanUpdate,
): Promise<void> {
  const patch: Partial<Tables<"operations">> = {};

  if (plan.estimated_time !== undefined) {
    patch.estimated_time = Math.max(0, plan.estimated_time);
  }
  if (plan.planned_start !== undefined) {
    patch.planned_start = plan.planned_start;
  }
  if (plan.planned_end !== undefined) {
    patch.planned_end = plan.planned_end;
  }

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("operations")
    .update(patch)
    .eq("id", operationId);

  if (error) {
    logger.error("Database", "Error updating operation plan", error);
    throw error;
  }
}

export async function startTimeTracking(
  operationId: string,
  operatorId: string,
  tenantId: string,
  notes?: string,
) {
  const { data, error } = await supabase.rpc("transition_operation", {
    p_tenant_id: tenantId,
    p_operation_id: operationId,
    p_action: "start",
    p_operator_id: operatorId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)
      || data.changed !== true || data.previous_status !== "not_started") return;
  void dispatchCommittedOperation(operationId, tenantId, operatorId, "start",
    typeof data.operator_name === "string" ? data.operator_name : undefined);
}

export async function completeOperation(operationId: string, tenantId: string, operatorId?: string) {
  const { data, error } = await supabase.rpc("transition_operation", {
    p_tenant_id: tenantId,
    p_operation_id: operationId,
    p_action: "complete",
    p_operator_id: operatorId ?? null,
  });
  if (error) throw error;
  if (data && typeof data === "object" && !Array.isArray(data) && data.changed === false) return;
  void dispatchCommittedOperation(operationId, tenantId, operatorId, "complete",
    data && typeof data === "object" && !Array.isArray(data) && typeof data.operator_name === "string" ? data.operator_name : undefined);
}

async function dispatchCommittedOperation(
  operationId: string,
  tenantId: string,
  operatorId: string | undefined,
  action: "start" | "complete",
  actorName?: string,
) {
  try {
    const { data: operation, error } = await supabase.from("operations")
      .select("id, operation_name, part_id, assigned_operator_id, started_at, completed_at, actual_time, estimated_time, part:parts!part_id(part_number, job:jobs!job_id(id, job_number))")
      .eq("id", operationId).eq("tenant_id", tenantId).single();
    if (error) throw error;
    const effectiveOperator = operatorId ?? operation.assigned_operator_id;
    const { data: operator, error: operatorError } = effectiveOperator
      ? await supabase.from("profiles").select("full_name").eq("id", effectiveOperator).eq("tenant_id", tenantId).maybeSingle()
      : { data: null, error: null };
    if (operatorError) throw operatorError;
    const payload = {
      operation_id: operationId,
      operation_name: operation.operation_name,
      part_id: operation.part_id,
      part_number: operation.part.part_number,
      job_id: operation.part.job.id,
      job_number: operation.part.job.job_number,
      operator_id: effectiveOperator ?? "",
      operator_name: actorName ?? operator?.full_name ?? "Unknown",
    };
    const result = action === "start"
      ? await dispatchOperationStarted(tenantId, { ...payload, started_at: operation.started_at })
      : await dispatchOperationCompleted(tenantId, {
        ...payload, completed_at: operation.completed_at,
        actual_time: operation.actual_time ?? 0, estimated_time: operation.estimated_time ?? 0,
      });
    if (!result.success) logger.error("Database", "Operation event dispatch failed", result.errors);
  } catch (error) {
    // The transaction committed; a notification failure must not invite a duplicate mutation.
    logger.error("Database", "Committed operation event could not be dispatched", error);
  }
}
