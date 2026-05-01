import { supabase } from "@/integrations/supabase/client";

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
