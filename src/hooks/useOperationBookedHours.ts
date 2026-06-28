import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryKeys, StaleTime } from "@/lib/queryClient";
import { logger } from "@/lib/logger";
import {
  bookedMinutes,
  plannedVsBooked,
  type BookedTimeEntry,
  type PlannedVsBooked,
} from "@/lib/admin/bookedHours";

/**
 * Booked hours for a single operation — the operator-generated actuals side.
 *
 * Reads `time_entries` (booked truth) and sums them via `bookedHours.ts`.
 * Active entries (end_time null) are counted live against `now`, so an
 * operation being worked on right now shows growing booked time. The planned
 * vs booked comparison is display-only — GUIDE, don't gate.
 */

/** One booked time entry with the operator/start/end drill-down fields. */
export interface OperationBookedEntry extends BookedTimeEntry {
  id: string;
  operator_id: string;
  operator_name: string | null;
  /** Live minutes for this entry, computed against the same `now`. */
  minutes: number;
  /** True when the entry is still running (no end_time). */
  isActive: boolean;
}

export interface OperationBookedHours {
  /** Individual entries for the drill-down, newest first. */
  entries: OperationBookedEntry[];
  /** Total booked minutes across all entries (active counted live). */
  totalMinutes: number;
  /** Count of entries still running. */
  activeCount: number;
  /** Planned vs booked variance for this operation (display only). */
  plannedVsBooked: PlannedVsBooked;
  isLoading: boolean;
}

interface TimeEntryRow {
  id: string;
  operation_id: string;
  operator_id: string;
  duration: number | null;
  start_time: string;
  end_time: string | null;
  operator?: { full_name: string | null } | { full_name: string | null }[] | null;
}

const EMPTY_PLAN: PlannedVsBooked = {
  plannedMinutes: 0,
  bookedMinutes: 0,
  varianceMinutes: 0,
  isOverScheduled: false,
};

/**
 * @param operationId   the operation to sum booked time for
 * @param plannedMinutes operations.estimated_time (planned, minutes) for variance
 */
export function useOperationBookedHours(
  operationId: string | undefined,
  plannedMinutes: number,
): OperationBookedHours {
  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.operations.bookedHours(operationId ?? ""),
    enabled: Boolean(operationId),
    // Active entries are counted live, so keep this fresh.
    staleTime: StaleTime.VERY_SHORT,
    queryFn: async (): Promise<{ entries: OperationBookedEntry[]; totalMinutes: number }> => {
      if (!operationId) return { entries: [], totalMinutes: 0 };

      const { data: rows, error } = await supabase
        .from("time_entries")
        .select(
          "id, operation_id, operator_id, duration, start_time, end_time, operator:profiles!time_entries_operator_id_fkey(full_name)",
        )
        .eq("operation_id", operationId)
        .order("start_time", { ascending: false });

      if (error) {
        logger.error("Database", "Error fetching operation booked hours", error);
        throw error;
      }

      // Capture one `now` for the whole snapshot — fetch is impure already,
      // so live-elapsed for active entries is anchored here, not at render.
      const now = Date.now();

      // For still-running entries, pull their pauses so the live elapsed
      // subtracts paused time — matching what clock-off stores, so the figure
      // doesn't drop the moment the operator stops.
      const activeIds = ((rows ?? []) as TimeEntryRow[])
        .filter((row) => row.end_time === null)
        .map((row) => row.id);
      const pausedSecondsByEntry = new Map<string, number>();
      if (activeIds.length > 0) {
        const { data: pauseRows } = await supabase
          .from("time_entry_pauses")
          .select("time_entry_id, paused_at, resumed_at, duration")
          .in("time_entry_id", activeIds);
        for (const pause of pauseRows ?? []) {
          const seconds =
            pause.duration != null
              ? pause.duration
              : pause.resumed_at == null
                ? Math.max(0, (now - Date.parse(pause.paused_at)) / 1000)
                : 0;
          pausedSecondsByEntry.set(
            pause.time_entry_id,
            (pausedSecondsByEntry.get(pause.time_entry_id) ?? 0) + seconds,
          );
        }
      }

      const baseEntries: BookedTimeEntry[] = [];
      const entries = ((rows ?? []) as TimeEntryRow[]).map((row) => {
        const operator = Array.isArray(row.operator) ? row.operator[0] : row.operator;
        const entry: BookedTimeEntry = {
          operation_id: row.operation_id,
          duration: row.duration,
          start_time: row.start_time,
          end_time: row.end_time,
          pausedSeconds: pausedSecondsByEntry.get(row.id) ?? 0,
        };
        baseEntries.push(entry);
        return {
          ...entry,
          id: row.id,
          operator_id: row.operator_id,
          operator_name: operator?.full_name ?? null,
          minutes: bookedMinutes([entry], now),
          isActive: row.end_time === null,
        };
      });

      // Sum once over all entries (matches bookedHours.ts rounding semantics).
      return { entries, totalMinutes: bookedMinutes(baseEntries, now) };
    },
  });

  const entries = data?.entries ?? [];
  const totalMinutes = data?.totalMinutes ?? 0;
  const activeCount = entries.filter((e) => e.isActive).length;

  return {
    entries,
    totalMinutes,
    activeCount,
    plannedVsBooked: operationId
      ? plannedVsBooked(plannedMinutes, totalMinutes)
      : EMPTY_PLAN,
    isLoading,
  };
}
