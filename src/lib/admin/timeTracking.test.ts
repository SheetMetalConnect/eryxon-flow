import { describe, it, expect } from 'vitest';
import {
  rollupByOperator,
  rollupByJob,
  rollupTimeTracking,
  type TrackedTimeEntry,
} from './timeTracking';

const NOW = Date.parse('2026-06-22T12:00:00.000Z');

const e = (o: Partial<TrackedTimeEntry>): TrackedTimeEntry => ({
  operation_id: 'op1',
  operator_id: 'u1',
  operator_name: 'Alice',
  duration: null,
  start_time: '2026-06-22T11:00:00.000Z',
  end_time: null,
  operation_name: 'Cut',
  estimated_time: 60,
  job_id: 'j1',
  job_number: 'JOB-1',
  customer: 'Acme',
  ...o,
});

describe('rollupByOperator', () => {
  it('sums booked minutes, counts entries and active-now per operator', () => {
    const rows = rollupByOperator(
      [
        e({ operator_id: 'u1', operator_name: 'Alice', duration: 30, end_time: '2026-06-22T11:30:00.000Z' }),
        e({ operator_id: 'u1', operator_name: 'Alice' }), // active: 11:00 -> now = 60 live
        e({ operator_id: 'u2', operator_name: 'Bob', duration: 15, end_time: '2026-06-22T11:15:00.000Z' }),
      ],
      NOW
    );
    const alice = rows.find(r => r.operatorId === 'u1')!;
    const bob = rows.find(r => r.operatorId === 'u2')!;
    expect(alice.bookedMinutes).toBe(90); // 30 stored + 60 live
    expect(alice.entryCount).toBe(2);
    expect(alice.activeCount).toBe(1);
    expect(bob.bookedMinutes).toBe(15);
    expect(bob.activeCount).toBe(0);
  });

  it('sorts operators by booked minutes descending', () => {
    const rows = rollupByOperator(
      [
        e({ operator_id: 'small', duration: 10, end_time: '2026-06-22T11:10:00.000Z' }),
        e({ operator_id: 'big', duration: 200, end_time: '2026-06-22T11:30:00.000Z' }),
      ],
      NOW
    );
    expect(rows[0].operatorId).toBe('big');
  });
});

describe('rollupByJob', () => {
  it('groups booked hours by job and drills down to operations', () => {
    const rows = rollupByJob(
      [
        e({ job_id: 'j1', job_number: 'JOB-1', operation_id: 'a', estimated_time: 60, duration: 30, end_time: '2026-06-22T11:30:00.000Z' }),
        e({ job_id: 'j1', job_number: 'JOB-1', operation_id: 'a', estimated_time: 60, duration: 50, end_time: '2026-06-22T11:50:00.000Z' }),
        e({ job_id: 'j2', job_number: 'JOB-2', operation_id: 'b', estimated_time: 100, duration: 20, end_time: '2026-06-22T11:20:00.000Z' }),
      ],
      NOW
    );
    const j1 = rows.find(r => r.jobId === 'j1')!;
    expect(j1.bookedMinutes).toBe(80); // 30 + 50 on the same operation
    expect(j1.plannedMinutes).toBe(60); // planned counted once for op 'a'
    expect(j1.entryCount).toBe(2);
    expect(j1.operations).toHaveLength(1);
    expect(j1.operations[0].variance.isOverScheduled).toBe(true); // 80 booked > 60 planned
    expect(j1.operations[0].variance.varianceMinutes).toBe(20);

    const j2 = rows.find(r => r.jobId === 'j2')!;
    expect(j2.operations[0].variance.isOverScheduled).toBe(false); // 20 < 100
  });

  it('does not double-count planned across multiple entries on one operation', () => {
    const rows = rollupByJob(
      [
        e({ operation_id: 'x', estimated_time: 40, duration: 10, end_time: '2026-06-22T11:10:00.000Z' }),
        e({ operation_id: 'x', estimated_time: 40, duration: 10, end_time: '2026-06-22T11:10:00.000Z' }),
      ],
      NOW
    );
    expect(rows[0].plannedMinutes).toBe(40);
  });

  it('buckets entries with no job under an empty job id', () => {
    const rows = rollupByJob([e({ job_id: null, job_number: null, duration: 5, end_time: '2026-06-22T11:05:00.000Z' })], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].jobId).toBe('');
  });
});

describe('rollupTimeTracking', () => {
  it('returns operator, job, and overall totals together', () => {
    const result = rollupTimeTracking(
      [
        e({ operator_id: 'u1', job_id: 'j1', operation_id: 'a', duration: 30, end_time: '2026-06-22T11:30:00.000Z' }),
        e({ operator_id: 'u2', job_id: 'j2', operation_id: 'b' }), // active, 60 live
      ],
      NOW
    );
    expect(result.totals.bookedMinutes).toBe(90); // 30 + 60
    expect(result.totals.entryCount).toBe(2);
    expect(result.totals.activeCount).toBe(1);
    expect(result.totals.operatorCount).toBe(2);
    expect(result.totals.jobCount).toBe(2);
  });
});
