import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

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
