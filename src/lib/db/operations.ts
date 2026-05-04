import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { dispatchOperationStarted, dispatchOperationCompleted } from "../event-dispatch";
import { logger } from '@/lib/logger';

interface OperationQueryResult {
  status: string;
  part_id: string;
  cell_id: string;
  operation_name: string;
  part: {
    id: string;
    part_number: string;
    job: {
      id: string;
      job_number: string;
    };
  };
}

interface ActiveTimeEntryResult {
  id: string;
  operation_id: string;
  operations?: {
    operation_name: string;
  };
}

interface JobOperationResult {
  cell_id: string;
  cells: {
    sequence: number;
  };
}

interface PartOperationResult {
  status: string;
  cell_id: string;
  cells: {
    sequence: number;
  };
}

interface CompleteOperationQueryResult {
  part_id: string;
  operation_name: string;
  estimated_time: number | null;
  actual_time: number | null;
  assigned_operator_id: string | null;
  part: {
    id: string;
    part_number: string;
    job: {
      id: string;
      job_number: string;
    };
  };
}

export interface OperationWithDetails {
  id: string;
  operation_name: string;
  sequence: number;
  estimated_time: number;
  actual_time: number;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  completion_percentage: number;
  notes: string | null;
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
    operator: {
      full_name: string;
    };
  };
}

export async function fetchOperationsWithDetails(tenantId: string): Promise<OperationWithDetails[]> {
  const { data: operations, error: operationsError } = await supabase
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
    .neq("status", "completed")  // Exclude completed operations from terminal view
    .order("sequence");

  if (operationsError) {
    logger.error('Database', 'Error fetching operations with details', operationsError);
    throw operationsError;
  }

  if (!operations) {
    logger.warn('Database', 'No operations found for tenant', tenantId);
    return [];
  }

  const { data: activeEntries, error: entriesError } = await supabase
    .from("time_entries")
    .select(`
      id,
      operation_id,
      operator_id,
      start_time,
      operator:profiles!inner(full_name)
    `)
    .eq("tenant_id", tenantId)
    .is("end_time", null);

  if (entriesError) {
    logger.error('Database', 'Error fetching active time entries', entriesError);
    throw entriesError;
  }

  return operations.map((operation) => {
    const entry = activeEntries?.find((e) => e.operation_id === operation.id);
    // Ensure the nested operator join is an object with full_name, not an array.
    // PostgREST may return arrays for ambiguous FK relationships.
    const safeEntry = entry
      ? {
          id: entry.id,
          operator_id: entry.operator_id,
          start_time: entry.start_time,
          operator: Array.isArray(entry.operator)
            ? (entry.operator[0] as { full_name: string })
            : (entry.operator as { full_name: string }),
        }
      : undefined;
    return { ...operation, active_time_entry: safeEntry };
  });
}

export async function startTimeTracking(
  operationId: string,
  operatorId: string,
  tenantId: string
) {
  const { data: existingForOperation } = await supabase
    .from("time_entries")
    .select("id")
    .eq("operation_id", operationId)
    .eq("operator_id", operatorId)
    .is("end_time", null);

  // Prevent duplicate entries for same operation (race condition protection)
  if (existingForOperation && existingForOperation.length > 0) {
    logger.debug('Database', 'Time entry already exists for this operation, skipping duplicate');
    return; // Silently succeed - entry already exists
  }

  const { data: activeEntries } = await supabase
    .from("time_entries")
    .select("id, operation_id, operations(operation_name)")
    .eq("operator_id", operatorId)
    .eq("tenant_id", tenantId)
    .neq("operation_id", operationId)
    .is("end_time", null);

  if (activeEntries && activeEntries.length > 0) {
    const activeOperation = activeEntries[0] as ActiveTimeEntryResult;
    throw new Error(
      `Please stop timing on "${activeOperation.operations?.operation_name || 'current operation'}" before starting a new operation`
    );
  }

  const { data: operation } = await supabase
    .from("operations")
    .select(`
      status,
      part_id,
      cell_id,
      operation_name,
      part:parts!inner(
        id,
        part_number,
        job:jobs!inner(
          id,
          job_number
        )
      )
    `)
    .eq("id", operationId)
    .single();

  if (!operation) throw new Error("Operation not found");

  const { data: operator } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", operatorId)
    .single();

  const startedAt = new Date().toISOString();
  const isNewStart = operation.status === "not_started";

  // Create time entry - use a lock by checking again right before insert
  const { data: doubleCheck } = await supabase
    .from("time_entries")
    .select("id")
    .eq("operation_id", operationId)
    .eq("operator_id", operatorId)
    .is("end_time", null);

  if (doubleCheck && doubleCheck.length > 0) {
    logger.debug('Database', 'Time entry created by concurrent request, skipping');
    return;
  }

  const { error: timeError } = await supabase.from("time_entries").insert({
    operation_id: operationId,
    operator_id: operatorId,
    tenant_id: tenantId,
    start_time: startedAt,
  });

  if (timeError) throw timeError;

  if (isNewStart) {
    const { error: statusError } = await supabase
      .from("operations")
      .update({ status: "in_progress" })
      .eq("id", operationId);
    if (statusError) throw statusError;

    const operationData = operation as OperationQueryResult;
    dispatchOperationStarted(tenantId, {
      operation_id: operationId,
      operation_name: operationData.operation_name,
      part_id: operationData.part_id,
      part_number: operationData.part.part_number,
      job_id: operationData.part.job.id,
      job_number: operationData.part.job.job_number,
      operator_id: operatorId,
      operator_name: operator?.full_name || 'Unknown',
      started_at: startedAt,
    }).then(result => {
      if (!result.success) {
        logger.error('Database', 'Failed to dispatch operation.started event', result.errors);
      }
    });
  }

  const { data: part } = await supabase
    .from("parts")
    .select("status, job_id, current_cell_id")
    .eq("id", operation.part_id)
    .single();

  if (!part) return;

  if (part.status === "not_started") {
    const { error: partStatusError } = await supabase
      .from("parts")
      .update({
        status: "in_progress",
        current_cell_id: operation.cell_id
      })
      .eq("id", operation.part_id);
    if (partStatusError) throw partStatusError;
  } else if (part.current_cell_id !== operation.cell_id) {
    const { error: partCellError } = await supabase
      .from("parts")
      .update({ current_cell_id: operation.cell_id })
      .eq("id", operation.part_id);
    if (partCellError) throw partCellError;
  }

  const { data: jobOperations } = await supabase
    .from("operations")
    .select("cell_id, cells!inner(sequence)")
    .eq("tenant_id", tenantId)
    .eq("part_id", operation.part_id)
    .eq("status", "in_progress");

  if (jobOperations && jobOperations.length > 0) {
    // Get the earliest cell (lowest sequence) that has in_progress operations
    const typedOperations = jobOperations as JobOperationResult[];
    const earliestCell = typedOperations.reduce((earliest, o) => {
      return o.cells.sequence < earliest.sequence
        ? { cell_id: o.cell_id, sequence: o.cells.sequence }
        : earliest;
    }, { cell_id: typedOperations[0].cell_id, sequence: typedOperations[0].cells.sequence });

    const { data: job } = await supabase
      .from("jobs")
      .select("status, current_cell_id")
      .eq("id", part.job_id)
      .eq("tenant_id", tenantId)
      .single();

    if (job) {
      const updates: Partial<Pick<Tables<'jobs'>, 'status' | 'current_cell_id'>> = {};

      if (job.status === "not_started") {
        updates.status = "in_progress";
      }

      if (job.current_cell_id !== earliestCell.cell_id) {
        updates.current_cell_id = earliestCell.cell_id;
      }

      if (Object.keys(updates).length > 0) {
        const { error: jobUpdateError } = await supabase
          .from("jobs")
          .update(updates)
          .eq("id", part.job_id);
        if (jobUpdateError) throw jobUpdateError;
      }
    }
  }
}

export async function completeOperation(operationId: string, tenantId: string, operatorId?: string) {
  const { data: activeEntry } = await supabase
    .from("time_entries")
    .select("id, operator_id")
    .eq("operation_id", operationId)
    .is("end_time", null)
    .maybeSingle();

  if (activeEntry) {
    throw new Error("Please stop time tracking before completing the operation");
  }

  const { data: operation } = await supabase
    .from("operations")
    .select(`
      part_id,
      operation_name,
      estimated_time,
      actual_time,
      assigned_operator_id,
      part:parts!inner(
        id,
        part_number,
        job:jobs!inner(
          id,
          job_number
        )
      )
    `)
    .eq("id", operationId)
    .single();

  if (!operation) throw new Error("Operation not found");

  const completedAt = new Date().toISOString();
  const effectiveOperatorId = operatorId || operation.assigned_operator_id;

  let operatorName = 'Unknown';
  if (effectiveOperatorId) {
    const { data: operator } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", effectiveOperatorId)
      .single();
    operatorName = operator?.full_name || 'Unknown';
  }

  const { error: completeOpError } = await supabase
    .from("operations")
    .update({
      status: "completed",
      completed_at: completedAt,
      completion_percentage: 100,
    })
    .eq("id", operationId);
  if (completeOpError) throw completeOpError;

  const operationData = operation as CompleteOperationQueryResult;
  dispatchOperationCompleted(tenantId, {
    operation_id: operationId,
    operation_name: operationData.operation_name,
    part_id: operationData.part_id,
    part_number: operationData.part.part_number,
    job_id: operationData.part.job.id,
    job_number: operationData.part.job.job_number,
    operator_id: effectiveOperatorId || '',
    operator_name: operatorName,
    completed_at: completedAt,
    actual_time: operationData.actual_time || 0,
    estimated_time: operationData.estimated_time || 0,
  }).then(result => {
    if (!result.success) {
      logger.error('Database', 'Failed to dispatch operation.completed event', result.errors);
    }
  });

  const { data: partOperations } = await supabase
    .from("operations")
    .select("status, cell_id, cells!inner(sequence)")
    .eq("part_id", operation.part_id);

  const allCompleted = partOperations?.every((o) => o.status === "completed");
  const inProgressOperations = partOperations?.filter((o) => o.status === "in_progress");

  if (allCompleted) {
    const { data: part } = await supabase
      .from("parts")
      .select("job_id")
      .eq("id", operation.part_id)
      .single();

    const { error: completePartError } = await supabase
      .from("parts")
      .update({
        status: "completed",
        current_cell_id: null  // Clear current cell when complete
      })
      .eq("id", operation.part_id);
    if (completePartError) throw completePartError;

    if (part) {
      const { data: jobParts } = await supabase
        .from("parts")
        .select("status")
        .eq("job_id", part.job_id);

      const allPartsCompleted = jobParts?.every((p) => p.status === "completed");

      if (allPartsCompleted) {
        const { error: completeJobError } = await supabase
          .from("jobs")
          .update({
            status: "completed",
            current_cell_id: null  // Clear current cell when complete
          })
          .eq("id", part.job_id);
        if (completeJobError) throw completeJobError;
      } else {
        await recalculateJobCurrentCell(part.job_id);
      }
    }
  } else if (inProgressOperations && inProgressOperations.length > 0) {
    const typedInProgress = inProgressOperations as PartOperationResult[];
    const earliestCell = typedInProgress.reduce((earliest, o) => {
      return o.cells.sequence < earliest.sequence
        ? { cell_id: o.cell_id, sequence: o.cells.sequence }
        : earliest;
    }, { cell_id: typedInProgress[0].cell_id, sequence: typedInProgress[0].cells.sequence });

    const { error: partCellUpdateError } = await supabase
      .from("parts")
      .update({ current_cell_id: earliestCell.cell_id })
      .eq("id", operation.part_id);
    if (partCellUpdateError) throw partCellUpdateError;

    const { data: part } = await supabase
      .from("parts")
      .select("job_id")
      .eq("id", operation.part_id)
      .single();

    if (part) {
      await recalculateJobCurrentCell(part.job_id);
    }
  }
}

async function recalculateJobCurrentCell(jobId: string) {
  const { data: jobParts } = await supabase
    .from("parts")
    .select("id")
    .eq("job_id", jobId);

  if (!jobParts || jobParts.length === 0) return;

  const partIds = jobParts.map(p => p.id);

  const { data: inProgressOperations } = await supabase
    .from("operations")
    .select("cell_id, cells!inner(sequence)")
    .in("part_id", partIds)
    .eq("status", "in_progress");

  if (inProgressOperations && inProgressOperations.length > 0) {
    const typedOperations = inProgressOperations as JobOperationResult[];
    const earliestCell = typedOperations.reduce((earliest, o) => {
      return o.cells.sequence < earliest.sequence
        ? { cell_id: o.cell_id, sequence: o.cells.sequence }
        : earliest;
    }, { cell_id: typedOperations[0].cell_id, sequence: typedOperations[0].cells.sequence });

    const { error: jobCellError } = await supabase
      .from("jobs")
      .update({ current_cell_id: earliestCell.cell_id })
      .eq("id", jobId);
    if (jobCellError) throw jobCellError;
  } else {
    const { error: jobCellNullError } = await supabase
      .from("jobs")
      .update({ current_cell_id: null })
      .eq("id", jobId);
    if (jobCellNullError) throw jobCellNullError;
  }
}
