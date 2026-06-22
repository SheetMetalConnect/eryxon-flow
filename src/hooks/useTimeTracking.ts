import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StaleTime } from "@/lib/queryClient";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/lib/logger";
import {
  rollupTimeTracking,
  type TrackedTimeEntry,
  type TimeTrackingRollup,
} from "@/lib/admin/timeTracking";

/**
 * Time-tracking report data — read-only booked actuals over a date range.
 *
 * Loads tenant-scoped `time_entries` between `from` and `to`, joined to
 * operation -> part -> job and the operator name, then folds them into the
 * per-operator and per-job rollups via `timeTracking.ts` (which reuses
 * `bookedHours.ts` for all minute math). Active entries (end_time null) are
 * counted live against one captured `now`. No writes, no enforcement.
 */

// Supabase may return a to-one relation as an object or a single-element array,
// depending on how the FK is resolved; `one()` normalizes either to a value.
type Rel<T> = T | T[] | null;

interface JoinedJob {
  id: string;
  job_number: string | null;
  customer: string | null;
}
interface JoinedPart {
  job: Rel<JoinedJob>;
}
interface JoinedOperation {
  operation_name: string | null;
  estimated_time: number | null;
  part: Rel<JoinedPart>;
}
interface JoinedRow {
  operation_id: string;
  operator_id: string;
  duration: number | null;
  start_time: string;
  end_time: string | null;
  operator: Rel<{ full_name: string | null }>;
  operation: Rel<JoinedOperation>;
}

function one<T>(v: Rel<T> | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const EMPTY: TimeTrackingRollup = {
  byOperator: [],
  byJob: [],
  totals: { bookedMinutes: 0, entryCount: 0, activeCount: 0, operatorCount: 0, jobCount: 0 },
};

export interface UseTimeTrackingResult {
  rollup: TimeTrackingRollup;
  isLoading: boolean;
  isError: boolean;
}

/**
 * @param from inclusive range start (clock-on at or after this instant)
 * @param to   exclusive range end (clock-on before this instant)
 */
export function useTimeTracking(from: Date, to: Date): UseTimeTrackingResult {
  const profile = useProfile();
  const tenantId = profile?.tenant_id ?? "";
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["timeTracking", "report", tenantId, fromIso, toIso] as const,
    enabled: Boolean(tenantId),
    // Active entries are counted live; keep the report fresh.
    staleTime: StaleTime.VERY_SHORT,
    queryFn: async (): Promise<TimeTrackingRollup> => {
      const { data: rows, error } = await supabase
        .from("time_entries")
        .select(
          `
          operation_id,
          operator_id,
          duration,
          start_time,
          end_time,
          operator:profiles!time_entries_operator_id_fkey(full_name),
          operation:operations!time_entries_task_id_fkey(
            operation_name,
            estimated_time,
            part:parts(
              job:jobs(id, job_number, customer)
            )
          )
        `
        )
        .eq("tenant_id", tenantId)
        .gte("start_time", fromIso)
        .lt("start_time", toIso)
        .order("start_time", { ascending: false });

      if (error) {
        logger.error("Database", "Error fetching time-tracking report", error);
        throw error;
      }

      // Anchor live-elapsed for active entries to one instant for the snapshot.
      const now = Date.now();
      const entries: TrackedTimeEntry[] = ((rows ?? []) as JoinedRow[]).map((row) => {
        const operator = one(row.operator);
        const operation = one(row.operation);
        const part = one(operation?.part);
        const job = one(part?.job);

        return {
          operation_id: row.operation_id,
          operator_id: row.operator_id,
          operator_name: operator?.full_name ?? null,
          duration: row.duration,
          start_time: row.start_time,
          end_time: row.end_time,
          operation_name: operation?.operation_name ?? null,
          estimated_time: operation?.estimated_time ?? 0,
          job_id: job?.id ?? null,
          job_number: job?.job_number ?? null,
          customer: job?.customer ?? null,
        };
      });

      return rollupTimeTracking(entries, now);
    },
  });

  return { rollup: data ?? EMPTY, isLoading, isError };
}
