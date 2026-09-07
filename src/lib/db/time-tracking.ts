import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

export async function stopTimeTracking(operationId: string, operatorId: string) {
  const { data: operation, error: lookupError } = await supabase.from("operations")
    .select("tenant_id").eq("id", operationId).single();
  if (lookupError) throw lookupError;
  const { error } = await supabase.rpc("transition_operation", {
    p_tenant_id: operation.tenant_id,
    p_operation_id: operationId,
    p_operator_id: operatorId,
    p_action: "stop",
  });
  if (error) throw error;
}

async function changeTimeEntry(timeEntryId: string, action: "stop" | "pause" | "resume") {
  const { data: entry, error: lookupError } = await supabase.from("time_entries")
    .select("tenant_id").eq("id", timeEntryId).single();
  if (lookupError) throw lookupError;
  const { error } = await supabase.rpc("time_entry_action", {
    p_tenant_id: entry.tenant_id,
    p_time_entry_id: timeEntryId,
    p_action: action,
  });
  if (error) throw error;
}

export function adminStopTimeTracking(timeEntryId: string) {
  return changeTimeEntry(timeEntryId, "stop");
}

export function pauseTimeTracking(timeEntryId: string) {
  return changeTimeEntry(timeEntryId, "pause");
}

export function resumeTimeTracking(timeEntryId: string) {
  return changeTimeEntry(timeEntryId, "resume");
}

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
