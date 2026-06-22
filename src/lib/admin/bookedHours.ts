/**
 * Booked hours — the operator-generated actuals side of the MES.
 *
 * Booked time is the source of truth from `time_entries` (operators clock on/off
 * at the cell), in MINUTES — the same unit as operations.estimated_time (planned).
 * A stopped entry carries `duration`; an active entry (end_time null) is counted
 * as live elapsed. Planned vs booked variance is what a team leader oversees and
 * corrects. Pure + testable; fetching lives in the hook.
 */

export interface BookedTimeEntry {
  operation_id: string;
  duration: number | null; // minutes, set on clock-off
  start_time: string;
  end_time: string | null;
}

const MS_PER_MIN = 60_000;

/** Minutes booked for one entry: stored duration, else end-start, else live elapsed. */
export function entryMinutes(e: BookedTimeEntry, now: number): number {
  if (e.duration != null) return Math.max(0, e.duration);
  const start = Date.parse(e.start_time);
  if (Number.isNaN(start)) return 0;
  const end = e.end_time ? Date.parse(e.end_time) : now;
  return Math.max(0, (end - start) / MS_PER_MIN);
}

/** Total booked minutes across entries (active entries counted live against `now`). */
export function bookedMinutes(entries: BookedTimeEntry[], now: number): number {
  return Math.round(entries.reduce((sum, e) => sum + entryMinutes(e, now), 0));
}

/** Booked minutes grouped by operation_id. */
export function bookedByOperation(entries: BookedTimeEntry[], now: number): Map<string, number> {
  const acc = new Map<string, number>();
  for (const e of entries) {
    acc.set(e.operation_id, (acc.get(e.operation_id) ?? 0) + entryMinutes(e, now));
  }
  for (const [k, v] of acc) acc.set(k, Math.round(v));
  return acc;
}

export interface PlannedVsBooked {
  plannedMinutes: number;
  bookedMinutes: number;
  varianceMinutes: number; // booked - planned; positive = over schedule
  isOverScheduled: boolean;
}

/** Compare planned (estimated_time) against booked for one operation. */
export function plannedVsBooked(plannedMinutes: number, bookedMin: number): PlannedVsBooked {
  const planned = Math.max(0, plannedMinutes || 0);
  const variance = Math.round(bookedMin - planned);
  return {
    plannedMinutes: planned,
    bookedMinutes: Math.round(bookedMin),
    varianceMinutes: variance,
    isOverScheduled: planned > 0 && variance > 0,
  };
}
