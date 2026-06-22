/**
 * Dashboard "needs attention" — derived, read-only signals (no user input).
 *
 * Surfaces what a planner should look at first: rush orders, on-hold operations,
 * and operations that have clocked more time than was scheduled. Pure selection
 * logic is isolated here so it stays testable; fetching lives in the hook.
 */

export interface AttentionOperation {
  id: string;
  operation_name: string;
  status: string | null;
  estimated_time: number;
  actual_time: number | null;
  part?: {
    part_number?: string | null;
    job?: { job_number?: string | null } | null;
  } | null;
}

/** Operations that clocked strictly more than their scheduled (estimated) time. */
export function selectOverScheduledHours(ops: AttentionOperation[]): AttentionOperation[] {
  return ops.filter(
    (o) => o.actual_time != null && o.estimated_time > 0 && o.actual_time > o.estimated_time,
  );
}

/** Minutes over schedule for one operation (0 when on/under or not yet clocked). */
export function minutesOverSchedule(o: AttentionOperation): number {
  if (o.actual_time == null) return 0;
  return Math.max(0, Math.round(o.actual_time - o.estimated_time));
}
