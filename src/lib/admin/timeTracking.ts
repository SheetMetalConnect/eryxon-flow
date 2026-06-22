/**
 * Time-tracking rollups — read-only reporting over booked actuals.
 *
 * Pure aggregation for the admin Time Tracking page: it takes the time_entries in
 * a date range (already joined to operation -> part -> job + operator name) and
 * folds them two ways — by operator (who worked how long) and by job/order
 * (booked vs planned per operation). All minute math reuses bookedHours.ts; this
 * module only groups and totals. No fetching, no writes. Minutes throughout
 * (same unit as operations.estimated_time), matching the booked-time convention.
 */
import { entryMinutes, plannedVsBooked, type PlannedVsBooked } from "./bookedHours";

/** One time entry enriched with the operator + operation/part/job context for reporting. */
export interface TrackedTimeEntry {
  operation_id: string;
  operator_id: string;
  operator_name: string | null;
  duration: number | null; // minutes, set on clock-off
  start_time: string;
  end_time: string | null; // null = still running (active now)
  operation_name: string | null;
  estimated_time: number; // planned minutes for the operation
  job_id: string | null;
  job_number: string | null;
  customer: string | null;
}

/** Per-operator rollup for the "operator hours" view. */
export interface OperatorRollup {
  operatorId: string;
  operatorName: string | null;
  bookedMinutes: number;
  entryCount: number;
  activeCount: number; // entries with no end_time, counted live
}

/** One operation row inside a job drill-down, with planned-vs-booked variance. */
export interface JobOperationRollup {
  operationId: string;
  operationName: string | null;
  variance: PlannedVsBooked;
}

/** Per-job rollup for the "track hours on jobs" view (expandable to operations). */
export interface JobRollup {
  jobId: string;
  jobNumber: string | null;
  customer: string | null;
  bookedMinutes: number;
  plannedMinutes: number;
  entryCount: number;
  operations: JobOperationRollup[];
}

export interface TimeTrackingTotals {
  bookedMinutes: number;
  entryCount: number;
  activeCount: number;
  operatorCount: number;
  jobCount: number;
}

export interface TimeTrackingRollup {
  byOperator: OperatorRollup[];
  byJob: JobRollup[];
  totals: TimeTrackingTotals;
}

const UNASSIGNED_JOB = "__unassigned__";

/** Group tracked entries by operator: booked minutes, entry count, active-now count. */
export function rollupByOperator(entries: TrackedTimeEntry[], now: number): OperatorRollup[] {
  const acc = new Map<string, OperatorRollup>();
  for (const e of entries) {
    let row = acc.get(e.operator_id);
    if (!row) {
      row = {
        operatorId: e.operator_id,
        operatorName: e.operator_name,
        bookedMinutes: 0,
        entryCount: 0,
        activeCount: 0,
      };
      acc.set(e.operator_id, row);
    }
    row.bookedMinutes += entryMinutes(e, now);
    row.entryCount += 1;
    if (e.end_time === null) row.activeCount += 1;
  }
  const rows = [...acc.values()];
  for (const r of rows) r.bookedMinutes = Math.round(r.bookedMinutes);
  rows.sort((a, b) => b.bookedMinutes - a.bookedMinutes);
  return rows;
}

/**
 * Group tracked entries by job, then by operation within each job, computing
 * booked vs planned per operation (plannedVsBooked). Planned per operation is
 * counted once (estimated_time is a property of the operation, not the entry).
 */
export function rollupByJob(entries: TrackedTimeEntry[], now: number): JobRollup[] {
  const jobs = new Map<string, JobRollup>();
  // operation -> { jobKey, name, planned, booked } so each operation appears once.
  const ops = new Map<string, { jobKey: string; name: string | null; planned: number; booked: number }>();

  for (const e of entries) {
    const jobKey = e.job_id ?? UNASSIGNED_JOB;
    let job = jobs.get(jobKey);
    if (!job) {
      job = {
        jobId: e.job_id ?? "",
        jobNumber: e.job_number,
        customer: e.customer,
        bookedMinutes: 0,
        plannedMinutes: 0,
        entryCount: 0,
        operations: [],
      };
      jobs.set(jobKey, job);
    }
    job.bookedMinutes += entryMinutes(e, now);
    job.entryCount += 1;

    let op = ops.get(e.operation_id);
    if (!op) {
      op = { jobKey, name: e.operation_name, planned: Math.max(0, e.estimated_time || 0), booked: 0 };
      ops.set(e.operation_id, op);
    }
    op.booked += entryMinutes(e, now);
  }

  // Sum planned per job from the de-duplicated operations, and attach op rollups.
  for (const [operationId, op] of ops) {
    const job = jobs.get(op.jobKey);
    if (!job) continue;
    job.plannedMinutes += op.planned;
    job.operations.push({
      operationId,
      operationName: op.name,
      variance: plannedVsBooked(op.planned, op.booked),
    });
  }

  const rows = [...jobs.values()];
  for (const r of rows) {
    r.bookedMinutes = Math.round(r.bookedMinutes);
    r.plannedMinutes = Math.round(r.plannedMinutes);
    r.operations.sort((a, b) => b.variance.bookedMinutes - a.variance.bookedMinutes);
  }
  rows.sort((a, b) => b.bookedMinutes - a.bookedMinutes);
  return rows;
}

/** Full rollup: per-operator, per-job, and overall totals. */
export function rollupTimeTracking(entries: TrackedTimeEntry[], now: number): TimeTrackingRollup {
  const byOperator = rollupByOperator(entries, now);
  const byJob = rollupByJob(entries, now);
  const bookedTotal = byOperator.reduce((sum, o) => sum + o.bookedMinutes, 0);
  const activeTotal = byOperator.reduce((sum, o) => sum + o.activeCount, 0);
  return {
    byOperator,
    byJob,
    totals: {
      bookedMinutes: Math.round(bookedTotal),
      entryCount: entries.length,
      activeCount: activeTotal,
      operatorCount: byOperator.length,
      jobCount: byJob.length,
    },
  };
}
