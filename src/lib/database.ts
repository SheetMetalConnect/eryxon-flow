import { supabase } from "@/integrations/supabase/client";
import { triggerOperationStartedWebhook, triggerOperationCompletedWebhook } from "./webhooks";

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
  part: {
    id: string;
    part_number: string;
    material: string;
    quantity: number;
    parent_part_id: string | null;
    file_paths: string[] | null;
    image_paths: string[] | null;
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
    .order("sequence");

  if (operationsError) {
    console.error("Error fetching operations with details:", operationsError);
    throw operationsError;
  }

  if (!operations) {
    console.warn("No operations found for tenant:", tenantId);
    return [];
  }

  // Fetch active time entries
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
    console.error("Error fetching active time entries:", entriesError);
    throw entriesError;
  }

  // Map active entries to operations
  return operations.map((operation) => ({
    ...operation,
    active_time_entry: activeEntries?.find((entry) => entry.operation_id === operation.id),
  }));
}

export async function startTimeTracking(
  operationId: string,
  operatorId: string,
  tenantId: string
) {
  // Check for existing active time entries for this operator
  const { data: activeEntries } = await supabase
    .from("time_entries")
    .select("id, operation_id, operations(operation_name)")
    .eq("operator_id", operatorId)
    .eq("tenant_id", tenantId)
    .is("end_time", null);

  if (activeEntries && activeEntries.length > 0) {
    const activeOperation: any = activeEntries[0];
    throw new Error(
      `Please stop timing on "${activeOperation.operations?.operation_name || 'current operation'}" before starting a new operation`
    );
  }

  // Get operation details including related data for webhook
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

  // Get operator details for webhook
  const { data: operator } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", operatorId)
    .single();

  const startedAt = new Date().toISOString();
  const isNewStart = operation.status === "not_started";

  // Create time entry
  const { error: timeError } = await supabase.from("time_entries").insert({
    operation_id: operationId,
    operator_id: operatorId,
    tenant_id: tenantId,
    start_time: startedAt,
  });

  if (timeError) throw timeError;

  // Update operation status if not started
  if (isNewStart) {
    await supabase
      .from("operations")
      .update({ status: "in_progress" })
      .eq("id", operationId);

    // Trigger webhook for operation started
    const operationData: any = operation;
    triggerOperationStartedWebhook(tenantId, {
      operation_id: operationId,
      operation_name: operationData.operation_name,
      part_id: operationData.part_id,
      part_number: operationData.part.part_number,
      job_id: operationData.part.job.id,
      job_number: operationData.part.job.job_number,
      operator_id: operatorId,
      operator_name: operator?.full_name || 'Unknown',
      started_at: startedAt,
    }).catch(error => {
      console.error('Failed to trigger operation.started webhook:', error);
      // Don't fail the operation if webhook fails
    });
  }

  // Get part details
  const { data: part } = await supabase
    .from("parts")
    .select("status, job_id, current_cell_id")
    .eq("id", operation.part_id)
    .single();

  if (!part) return;

  // Update part status and current_cell_id if not started
  if (part.status === "not_started") {
    await supabase
      .from("parts")
      .update({ 
        status: "in_progress",
        current_cell_id: operation.cell_id 
      })
      .eq("id", operation.part_id);
  } else if (part.current_cell_id !== operation.cell_id) {
    // Update current_cell_id if working on a different cell
    await supabase
      .from("parts")
      .update({ current_cell_id: operation.cell_id })
      .eq("id", operation.part_id);
  }

  // Calculate job's current cell from all in_progress operations
  const { data: jobOperations } = await supabase
    .from("operations")
    .select("cell_id, cells!inner(sequence)")
    .eq("part_id", operation.part_id)
    .eq("status", "in_progress");

  if (jobOperations && jobOperations.length > 0) {
    // Get the earliest cell (lowest sequence) that has in_progress operations
    const earliestCell = jobOperations.reduce((earliest, o: any) => {
      return o.cells.sequence < earliest.sequence 
        ? { cell_id: o.cell_id, sequence: o.cells.sequence }
        : earliest;
    }, { cell_id: jobOperations[0].cell_id, sequence: jobOperations[0].cells.sequence });

    // Update job status and current_cell_id
    const { data: job } = await supabase
      .from("jobs")
      .select("status, current_cell_id")
      .eq("id", part.job_id)
      .single();

    if (job) {
      const updates: any = {};
      
      if (job.status === "not_started") {
        updates.status = "in_progress";
      }
      
      if (job.current_cell_id !== earliestCell.cell_id) {
        updates.current_cell_id = earliestCell.cell_id;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("jobs")
          .update(updates)
          .eq("id", part.job_id);
      }
    }
  }
}

export async function stopTimeTracking(operationId: string, operatorId: string) {
  // Find active time entry
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, start_time, is_paused")
    .eq("operation_id", operationId)
    .eq("operator_id", operatorId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");

  // If paused, close the current pause
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
      const pauseDuration = Math.round((now.getTime() - pausedAt.getTime()) / 1000); // seconds

      await supabase
        .from("time_entry_pauses")
        .update({
          resumed_at: now.toISOString(),
          duration: pauseDuration,
        })
        .eq("id", activePause.id);
    }
  }

  const endTime = new Date();
  const startTime = new Date(entry.start_time);

  // Calculate total pause time
  const { data: pauses } = await supabase
    .from("time_entry_pauses")
    .select("duration")
    .eq("time_entry_id", entry.id)
    .not("duration", "is", null);

  const totalPauseSeconds = pauses?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;

  // Calculate effective duration (total time - pause time)
  const totalSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const effectiveSeconds = totalSeconds - totalPauseSeconds;
  const duration = Math.round(effectiveSeconds / 60); // minutes

  // Update time entry
  await supabase
    .from("time_entries")
    .update({
      end_time: endTime.toISOString(),
      duration,
      is_paused: false,
    })
    .eq("id", entry.id);

  // Update operation actual time
  const { data: operation } = await supabase
    .from("operations")
    .select("actual_time")
    .eq("id", operationId)
    .single();

  if (operation) {
    await supabase
      .from("operations")
      .update({ actual_time: (operation.actual_time || 0) + duration })
      .eq("id", operationId);
  }
}

export async function pauseTimeTracking(timeEntryId: string) {
  // Check if already paused
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, is_paused")
    .eq("id", timeEntryId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");
  if (entry.is_paused) throw new Error("Time tracking is already paused");

  // Create pause record
  const { error: pauseError } = await supabase
    .from("time_entry_pauses")
    .insert({
      time_entry_id: timeEntryId,
      paused_at: new Date().toISOString(),
    });

  if (pauseError) throw pauseError;

  // Update time entry to mark as paused
  await supabase
    .from("time_entries")
    .update({ is_paused: true })
    .eq("id", timeEntryId);
}

export async function resumeTimeTracking(timeEntryId: string) {
  // Check if paused
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, is_paused")
    .eq("id", timeEntryId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");
  if (!entry.is_paused) throw new Error("Time tracking is not paused");

  // Find the active pause
  const { data: pauseRecord } = await supabase
    .from("time_entry_pauses")
    .select("id, paused_at")
    .eq("time_entry_id", timeEntryId)
    .is("resumed_at", null)
    .single();

  if (!pauseRecord) throw new Error("No active pause found");

  const resumedAt = new Date();
  const pausedAt = new Date(pauseRecord.paused_at);
  const pauseDuration = Math.round((resumedAt.getTime() - pausedAt.getTime()) / 1000); // seconds

  // Update pause record
  await supabase
    .from("time_entry_pauses")
    .update({
      resumed_at: resumedAt.toISOString(),
      duration: pauseDuration,
    })
    .eq("id", pauseRecord.id);

  // Update time entry to mark as not paused
  await supabase
    .from("time_entries")
    .update({ is_paused: false })
    .eq("id", timeEntryId);
}

export async function completeOperation(operationId: string, tenantId: string, operatorId?: string) {
  // Check for active time entries
  const { data: activeEntry } = await supabase
    .from("time_entries")
    .select("id, operator_id")
    .eq("operation_id", operationId)
    .is("end_time", null)
    .maybeSingle();

  if (activeEntry) {
    throw new Error("Please stop time tracking before completing the operation");
  }

  // Get operation details including related data for webhook
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

  // Get operator details for webhook
  let operatorName = 'Unknown';
  if (effectiveOperatorId) {
    const { data: operator } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", effectiveOperatorId)
      .single();
    operatorName = operator?.full_name || 'Unknown';
  }

  // Update operation
  await supabase
    .from("operations")
    .update({
      status: "completed",
      completed_at: completedAt,
      completion_percentage: 100,
    })
    .eq("id", operationId);

  // Trigger webhook for operation completed
  const operationData: any = operation;
  triggerOperationCompletedWebhook(tenantId, {
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
  }).catch(error => {
    console.error('Failed to trigger operation.completed webhook:', error);
    // Don't fail the operation if webhook fails
  });

  // Check if all operations in part are completed
  const { data: partOperations } = await supabase
    .from("operations")
    .select("status, cell_id, cells!inner(sequence)")
    .eq("part_id", operation.part_id);

  const allCompleted = partOperations?.every((o) => o.status === "completed");
  const inProgressOperations = partOperations?.filter((o) => o.status === "in_progress");

  if (allCompleted) {
    // All operations complete - mark part as completed
    const { data: part } = await supabase
      .from("parts")
      .select("job_id")
      .eq("id", operation.part_id)
      .single();

    await supabase
      .from("parts")
      .update({ 
        status: "completed",
        current_cell_id: null  // Clear current cell when complete
      })
      .eq("id", operation.part_id);

    // Check if all parts in job are completed
    if (part) {
      const { data: jobParts } = await supabase
        .from("parts")
        .select("status")
        .eq("job_id", part.job_id);

      const allPartsCompleted = jobParts?.every((p) => p.status === "completed");

      if (allPartsCompleted) {
        await supabase
          .from("jobs")
          .update({ 
            status: "completed",
            current_cell_id: null  // Clear current cell when complete
          })
          .eq("id", part.job_id);
      } else {
        // Recalculate job's current_cell_id from remaining in_progress parts
        await recalculateJobCurrentCell(part.job_id);
      }
    }
  } else if (inProgressOperations && inProgressOperations.length > 0) {
    // Recalculate part's current_cell_id from remaining in_progress operations
    const earliestCell = inProgressOperations.reduce((earliest: any, o: any) => {
      return o.cells.sequence < earliest.sequence 
        ? { cell_id: o.cell_id, sequence: o.cells.sequence }
        : earliest;
    }, { cell_id: inProgressOperations[0].cell_id, sequence: (inProgressOperations[0] as any).cells.sequence });

    await supabase
      .from("parts")
      .update({ current_cell_id: earliestCell.cell_id })
      .eq("id", operation.part_id);

    // Also recalculate job's current_cell_id
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
  // Get all in_progress operations across all parts in this job
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
    // Get the earliest cell (lowest sequence) with in_progress operations
    const earliestCell = inProgressOperations.reduce((earliest: any, o: any) => {
      return o.cells.sequence < earliest.sequence
        ? { cell_id: o.cell_id, sequence: o.cells.sequence }
        : earliest;
    }, { cell_id: inProgressOperations[0].cell_id, sequence: (inProgressOperations[0] as any).cells.sequence });

    await supabase
      .from("jobs")
      .update({ current_cell_id: earliestCell.cell_id })
      .eq("id", jobId);
  } else {
    // No in_progress operations, but job isn't complete yet
    await supabase
      .from("jobs")
      .update({ current_cell_id: null })
      .eq("id", jobId);
  }
}

// Assembly Tracking Functions

/**
 * Fetch all child parts for a given parent part
 */
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

/**
 * Fetch parent part for a given part
 */
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

/**
 * Check if all child parts are completed
 */
export async function checkChildPartsCompletion(parentPartId: string, tenantId: string) {
  const { data: childParts, error } = await supabase
    .from("parts")
    .select("id, part_number, status")
    .eq("parent_part_id", parentPartId)
    .eq("tenant_id", tenantId);

  if (error) throw error;
  if (!childParts || childParts.length === 0) {
    return { hasChildren: false, allCompleted: true, incompleteChildren: [] };
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

/**
 * Check for circular references in assembly hierarchy
 * Returns true if creating this relationship would create a cycle
 */
export async function checkCircularReference(
  childPartId: string,
  potentialParentId: string,
  tenantId: string
): Promise<boolean> {
  // Can't be its own parent
  if (childPartId === potentialParentId) return true;

  // Check if the potential parent is actually a descendant of the child
  let currentParentId: string | null = potentialParentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      // Detected a cycle in the existing data
      return true;
    }
    visited.add(currentParentId);

    if (currentParentId === childPartId) {
      // The potential parent is a descendant of the child
      return true;
    }

    // Get the parent of the current parent
    const { data, error } = await supabase
      .from("parts")
      .select("parent_part_id")
      .eq("id", currentParentId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) break;
    currentParentId = data.parent_part_id;
  }

  return false;
}

/**
 * Get assembly tree (all descendants) for a given part
 */
export async function fetchAssemblyTree(partId: string, tenantId: string): Promise<any[]> {
  const tree: any[] = [];
  const queue = [{ id: partId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const { data: children, error } = await supabase
      .from("parts")
      .select(`
        *,
        job:jobs(job_number, customer),
        operations:operations(id, status, operation_name)
      `)
      .eq("parent_part_id", current.id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error fetching assembly tree:", error);
      continue;
    }

    if (children && children.length > 0) {
      for (const child of children) {
        tree.push({ ...child, depth: current.depth + 1 });
        queue.push({ id: child.id, depth: current.depth + 1 });
      }
    }
  }

  return tree;
}

/**
 * Check if a part has dependency warnings (incomplete children)
 */
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
