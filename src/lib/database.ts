import { supabase } from "@/integrations/supabase/client";
import { dispatchOperationStarted, dispatchOperationCompleted, dispatchEvent, EventContext } from "./event-dispatch";
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
      const updates: { status?: string; current_cell_id?: string } = {};

      if (job.status === "not_started") {
        updates.status = "in_progress";
      }

      if (job.current_cell_id !== earliestCell.cell_id) {
        updates.current_cell_id = earliestCell.cell_id;
      }

      if (Object.keys(updates).length > 0) {
        const { error: jobUpdateError } = await supabase
          .from("jobs")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(updates as any)
          .eq("id", part.job_id);
        if (jobUpdateError) throw jobUpdateError;
      }
    }
  }
}

export async function stopTimeTracking(operationId: string, operatorId: string) {
  // Find active time entries (may be multiple due to race conditions)
  const { data: entries } = await supabase
    .from("time_entries")
    .select("id, start_time, is_paused")
    .eq("operation_id", operationId)
    .eq("operator_id", operatorId)
    .is("end_time", null)
    .order("start_time", { ascending: false });

  if (!entries || entries.length === 0) throw new Error("No active time entry found");

  const entry = entries[0];

  if (entries.length > 1) {
    logger.debug('Database', `Found ${entries.length} duplicate time entries, closing all`);
    const now = new Date();
    for (let i = 1; i < entries.length; i++) {
      const dupEntry = entries[i];
      const startTime = new Date(dupEntry.start_time);
      const duration = Math.round((now.getTime() - startTime.getTime()) / 1000);
      const { error: dupError } = await supabase
        .from("time_entries")
        .update({ end_time: now.toISOString(), duration })
        .eq("id", dupEntry.id);
      if (dupError) throw dupError;
    }
  }

  if (entry.is_paused) {
    const { data: activePause } = await supabase
      .from("time_entry_pauses")
      .select("id, paused_at")
      .eq("time_entry_id", entry.id)
      .is("resumed_at", null)
      .maybeSingle();

    if (activePause) {
      const now = new Date();
      const pausedAt = new Date(activePause.paused_at);
      const pauseDuration = Math.round((now.getTime() - pausedAt.getTime()) / 1000);

      const { error: closePauseError } = await supabase
        .from("time_entry_pauses")
        .update({
          resumed_at: now.toISOString(),
          duration: pauseDuration,
        })
        .eq("id", activePause.id);
      if (closePauseError) throw closePauseError;
    }
  }

  const endTime = new Date();
  const startTime = new Date(entry.start_time);

  const { data: pauses } = await supabase
    .from("time_entry_pauses")
    .select("duration")
    .eq("time_entry_id", entry.id)
    .not("duration", "is", null);

  const totalPauseSeconds = pauses?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;

  // Effective duration = total elapsed time minus paused time
  const totalSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const effectiveSeconds = totalSeconds - totalPauseSeconds;
  const duration = Math.round(effectiveSeconds / 60);

  const { error: updateEntryError } = await supabase
    .from("time_entries")
    .update({
      end_time: endTime.toISOString(),
      duration,
      is_paused: false,
    })
    .eq("id", entry.id);
  if (updateEntryError) throw updateEntryError;

  const { data: operation } = await supabase
    .from("operations")
    .select("actual_time")
    .eq("id", operationId)
    .single();

  if (operation) {
    const { error: actualTimeError } = await supabase
      .from("operations")
      .update({ actual_time: (operation.actual_time || 0) + duration })
      .eq("id", operationId);
    if (actualTimeError) throw actualTimeError;
  }
}

/**
 * Admin function to stop time tracking by time entry ID
 * Used when admins need to stop an operator's forgotten clocking
 */
export async function adminStopTimeTracking(timeEntryId: string) {
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, start_time, is_paused, operation_id, operator_id")
    .eq("id", timeEntryId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");

  if (entry.is_paused) {
    const { data: activePause } = await supabase
      .from("time_entry_pauses")
      .select("id, paused_at")
      .eq("time_entry_id", entry.id)
      .is("resumed_at", null)
      .maybeSingle();

    if (activePause) {
      const now = new Date();
      const pausedAt = new Date(activePause.paused_at);
      const pauseDuration = Math.round((now.getTime() - pausedAt.getTime()) / 1000);

      const { error: adminClosePauseError } = await supabase
        .from("time_entry_pauses")
        .update({
          resumed_at: now.toISOString(),
          duration: pauseDuration,
        })
        .eq("id", activePause.id);
      if (adminClosePauseError) throw adminClosePauseError;
    }
  }

  const endTime = new Date();
  const startTime = new Date(entry.start_time);

  const { data: pauses } = await supabase
    .from("time_entry_pauses")
    .select("duration")
    .eq("time_entry_id", entry.id)
    .not("duration", "is", null);

  const totalPauseSeconds = pauses?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;

  const totalSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const effectiveSeconds = totalSeconds - totalPauseSeconds;
  const duration = Math.round(effectiveSeconds / 60);

  const { error: adminUpdateEntryError } = await supabase
    .from("time_entries")
    .update({
      end_time: endTime.toISOString(),
      duration,
      is_paused: false,
    })
    .eq("id", entry.id);
  if (adminUpdateEntryError) throw adminUpdateEntryError;

  const { data: operation } = await supabase
    .from("operations")
    .select("actual_time")
    .eq("id", entry.operation_id)
    .single();

  if (operation) {
    const { error: adminActualTimeError } = await supabase
      .from("operations")
      .update({ actual_time: (operation.actual_time || 0) + duration })
      .eq("id", entry.operation_id);
    if (adminActualTimeError) throw adminActualTimeError;
  }
}

/**
 * Stop all active time entries for a tenant (admin function)
 * Used for end-of-day cleanup or auto-stop at factory closing time
 */
export async function stopAllActiveTimeEntries(tenantId: string): Promise<number> {
  const { data: activeEntries, error: fetchError } = await supabase
    .from("time_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("end_time", null);

  if (fetchError) throw fetchError;
  if (!activeEntries || activeEntries.length === 0) return 0;

  let stoppedCount = 0;
  for (const entry of activeEntries) {
    try {
      await adminStopTimeTracking(entry.id);
      stoppedCount++;
    } catch (error) {
      logger.error('Database', `Failed to stop time entry ${entry.id}`, error);
    }
  }

  return stoppedCount;
}

export async function pauseTimeTracking(timeEntryId: string) {
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, is_paused")
    .eq("id", timeEntryId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");
  if (entry.is_paused) throw new Error("Time tracking is already paused");

  const { error: pauseError } = await supabase
    .from("time_entry_pauses")
    .insert({
      time_entry_id: timeEntryId,
      paused_at: new Date().toISOString(),
    });

  if (pauseError) throw pauseError;

  const { error: markPausedError } = await supabase
    .from("time_entries")
    .update({ is_paused: true })
    .eq("id", timeEntryId);
  if (markPausedError) throw markPausedError;
}

export async function resumeTimeTracking(timeEntryId: string) {
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, is_paused")
    .eq("id", timeEntryId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");
  if (!entry.is_paused) throw new Error("Time tracking is not paused");

  const { data: pauseRecord } = await supabase
    .from("time_entry_pauses")
    .select("id, paused_at")
    .eq("time_entry_id", timeEntryId)
    .is("resumed_at", null)
    .single();

  if (!pauseRecord) throw new Error("No active pause found");

  const resumedAt = new Date();
  const pausedAt = new Date(pauseRecord.paused_at);
  const pauseDuration = Math.round((resumedAt.getTime() - pausedAt.getTime()) / 1000);

  const { error: resumePauseError } = await supabase
    .from("time_entry_pauses")
    .update({
      resumed_at: resumedAt.toISOString(),
      duration: pauseDuration,
    })
    .eq("id", pauseRecord.id);
  if (resumePauseError) throw resumePauseError;

  const { error: markResumedError } = await supabase
    .from("time_entries")
    .update({ is_paused: false })
    .eq("id", timeEntryId);
  if (markResumedError) throw markResumedError;
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

export async function fetchChildParts(parentPartId: string, tenantId: string) {
  const { data, error } = await supabase
    .from("parts")
    .select(`
      *,
      job:jobs(job_number, customer),
      operations:operations(id, status, operation_name)
    `)
    .eq("parent_part_id", parentPartId)
    .eq("tenant_id", tenantId)
    .order("part_number");

  if (error) throw error;
  return data || [];
}

export async function fetchParentPart(partId: string, tenantId: string) {
  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("parent_part_id")
    .eq("id", partId)
    .eq("tenant_id", tenantId)
    .single();

  if (partError) throw partError;
  if (!part?.parent_part_id) return null;

  const { data: parentPart, error: parentError } = await supabase
    .from("parts")
    .select(`
      *,
      job:jobs(job_number, customer),
      operations:operations(id, status, operation_name)
    `)
    .eq("id", part.parent_part_id)
    .eq("tenant_id", tenantId)
    .single();

  if (parentError) throw parentError;
  return parentPart;
}

export async function checkChildPartsCompletion(parentPartId: string, tenantId: string) {
  const { data: childParts, error } = await supabase
    .from("parts")
    .select("id, part_number, status")
    .eq("parent_part_id", parentPartId)
    .eq("tenant_id", tenantId);

  if (error) throw error;
  if (!childParts || childParts.length === 0) {
    return { hasChildren: false, allCompleted: true, incompleteChildren: [] as { id: string; part_number: string; status: string }[] };
  }

  const incompleteChildren = childParts.filter(p => p.status !== "completed");
  const allCompleted = incompleteChildren.length === 0;

  return {
    hasChildren: true,
    allCompleted,
    incompleteChildren,
    totalChildren: childParts.length,
    completedChildren: childParts.length - incompleteChildren.length,
  };
}

export async function checkAssemblyDependencies(partId: string, tenantId: string) {
  const childrenStatus = await checkChildPartsCompletion(partId, tenantId);

  return {
    hasDependencies: childrenStatus.hasChildren,
    dependenciesMet: childrenStatus.allCompleted,
    warnings: childrenStatus.incompleteChildren.map(child => ({
      partId: child.id,
      partNumber: child.part_number,
      status: child.status,
      message: `Child part ${child.part_number} is not yet completed (${child.status})`
    }))
  };
}

/**
 * Start batch time tracking (stapelscannen)
 * Creates a time entry for each operation in the batch simultaneously.
 * When stopped, the total time is divided equally across all operations.
 */
export async function startBatchTimeTracking(
  batchId: string,
  operatorId: string,
  tenantId: string
) {
  const { data: batch, error: batchError } = await supabase
    .from("operation_batches")
    .select("status")
    .eq("id", batchId)
    .eq("tenant_id", tenantId)
    .single();

  if (batchError) throw batchError;
  if (!batch) throw new Error("batches.errors.notFound");
  if (batch.status === "in_progress") throw new Error("batches.errors.alreadyActive");
  if (batch.status === "completed" || batch.status === "cancelled") {
    throw new Error("batches.errors.alreadyClosed");
  }

  const { data: activeEntries } = await supabase
    .from("time_entries")
    .select("id, operation_id")
    .eq("operator_id", operatorId)
    .eq("tenant_id", tenantId)
    .is("end_time", null);

  if (activeEntries && activeEntries.length > 0) {
    throw new Error("batches.errors.operatorBusy");
  }

  const { data: batchOps, error: batchOpsError } = await supabase
    .from("batch_operations")
    .select("operation_id")
    .eq("batch_id", batchId)
    .eq("tenant_id", tenantId);

  if (batchOpsError) throw batchOpsError;
  if (!batchOps || batchOps.length === 0) {
    throw new Error("batches.errors.noOperations");
  }

  const now = new Date().toISOString();

  const timeEntries = batchOps.map((bo) => ({
    operation_id: bo.operation_id,
    operator_id: operatorId,
    tenant_id: tenantId,
    start_time: now,
    time_type: "run",
    notes: `batch:${batchId}`,
  }));

  const { error: insertError } = await supabase
    .from("time_entries")
    .insert(timeEntries);

  if (insertError) throw insertError;

  const { error: batchStatusError } = await supabase
    .from("operation_batches")
    .update({
      status: "in_progress",
      started_at: now,
      started_by: operatorId,
    })
    .eq("id", batchId)
    .eq("tenant_id", tenantId)
    .in("status", ["draft", "ready"]);
  if (batchStatusError) throw batchStatusError;

  const opIds = batchOps.map((bo) => bo.operation_id);
  const { error: opsStatusError } = await supabase
    .from("operations")
    .update({ status: "in_progress" })
    .in("id", opIds)
    .eq("tenant_id", tenantId)
    .eq("status", "not_started");
  if (opsStatusError) throw opsStatusError;
}

/**
 * Stop batch time tracking and distribute time equally (stapelscannen)
 * Calculates total elapsed time, divides by number of operations,
 * and updates each operation's actual_time accordingly.
 */
export async function stopBatchTimeTracking(
  batchId: string,
  operatorId: string,
  tenantId: string
) {
  const { data: batchOps, error: batchOpsError } = await supabase
    .from("batch_operations")
    .select("operation_id")
    .eq("batch_id", batchId)
    .eq("tenant_id", tenantId);

  if (batchOpsError) throw batchOpsError;
  if (!batchOps || batchOps.length === 0) {
    throw new Error("batches.errors.noOperations");
  }

  const opIds = batchOps.map((bo) => bo.operation_id);
  const endTime = new Date();

  const { data: activeEntries, error: entriesError } = await supabase
    .from("time_entries")
    .select("id, operation_id, start_time")
    .eq("operator_id", operatorId)
    .eq("tenant_id", tenantId)
    .in("operation_id", opIds)
    .is("end_time", null);

  if (entriesError) throw entriesError;
  if (!activeEntries || activeEntries.length === 0) {
    throw new Error("batches.errors.noActiveEntries");
  }

  const startTimes = activeEntries.map((e) => new Date(e.start_time).getTime());
  const batchStartTime = Math.min(...startTimes);
  const totalSeconds = Math.round((endTime.getTime() - batchStartTime) / 1000);
  const totalMinutes = Math.round(totalSeconds / 60);

  // Distribute time preserving the total: base minutes per operation + remainder
  const baseMinutes = Math.floor(totalMinutes / opIds.length);
  const remainder = totalMinutes - baseMinutes * opIds.length;

  const opMinutesMap = new Map<string, number>();
  opIds.forEach((opId, index) => {
    opMinutesMap.set(opId, baseMinutes + (index < remainder ? 1 : 0));
  });

  for (const entry of activeEntries) {
    const allocated = opMinutesMap.get(entry.operation_id) ?? baseMinutes;
    const { error: closeEntryError } = await supabase
      .from("time_entries")
      .update({
        end_time: endTime.toISOString(),
        duration: allocated,
        is_paused: false,
      })
      .eq("id", entry.id)
      .eq("tenant_id", tenantId);
    if (closeEntryError) throw closeEntryError;
  }

  for (const opId of opIds) {
    const allocated = opMinutesMap.get(opId) ?? baseMinutes;
    const { data: operation } = await supabase
      .from("operations")
      .select("actual_time")
      .eq("id", opId)
      .eq("tenant_id", tenantId)
      .single();

    if (operation) {
      const { error: opTimeError } = await supabase
        .from("operations")
        .update({ actual_time: (operation.actual_time || 0) + allocated })
        .eq("id", opId)
        .eq("tenant_id", tenantId);
      if (opTimeError) throw opTimeError;
    }
  }

  const { error: batchCompleteError } = await supabase
    .from("operation_batches")
    .update({
      actual_time: totalMinutes,
      status: "completed",
      completed_at: endTime.toISOString(),
      completed_by: operatorId,
    })
    .eq("id", batchId)
    .eq("tenant_id", tenantId);
  if (batchCompleteError) throw batchCompleteError;

  return {
    totalMinutes,
    minutesPerOperation: baseMinutes,
    operationsCount: opIds.length,
  };
}
