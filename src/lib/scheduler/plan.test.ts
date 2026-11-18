import { describe, expect, it } from 'vitest';
import { buildSchedulePlanPayload } from './plan';
import type { ScheduledOperation } from './types';

function scheduledOperation(overrides: Partial<ScheduledOperation> = {}): ScheduledOperation {
  return {
    id: 'op-1',
    part_id: 'part-1',
    cell_id: 'cell-1',
    sequence: 1,
    estimated_time: 120,
    status: 'not_started',
    planned_start: '2026-09-21T00:00:00.000Z',
    planned_end: '2026-09-21T23:59:59.999Z',
    updated_at: '2026-09-19T10:00:00.000Z',
    day_allocations: [{ operation_id: 'op-1', cell_id: 'cell-1', date: '2026-09-21', hours_allocated: 2 }],
    scheduling_status: 'scheduled',
    scheduling_failure_reason: null,
    remaining_hours: 0,
    ...overrides,
  };
}

describe('buildSchedulePlanPayload', () => {
  it('places new allocations after already reserved cell capacity', () => {
    const payload = buildSchedulePlanPayload(
      [scheduledOperation()],
      [{ cell_id: 'cell-1', date: '2026-09-21', hours_allocated: 3 }],
      '07:00',
      '17:00',
    );

    expect(payload.allocations).toEqual([expect.objectContaining({
      start_time: '10:00:00',
      end_time: '12:00:00',
    })]);
  });

  it('omits operations that could not be scheduled', () => {
    const payload = buildSchedulePlanPayload([
      scheduledOperation({
        scheduling_status: 'unscheduled',
        scheduling_failure_reason: 'insufficient_capacity',
        remaining_hours: 2,
        planned_start: null,
        planned_end: null,
        day_allocations: [],
      }),
    ], [], '07:00', '17:00');

    expect(payload).toEqual({ operations: [], allocations: [] });
  });

  it('rejects capacity that extends past factory closing time', () => {
    expect(() => buildSchedulePlanPayload(
      [scheduledOperation({ estimated_time: 180, day_allocations: [{ operation_id: 'op-1', cell_id: 'cell-1', date: '2026-09-21', hours_allocated: 3 }] })],
      [{ cell_id: 'cell-1', date: '2026-09-21', hours_allocated: 1 }],
      '07:00',
      '10:00',
    )).toThrow('Cell capacity exceeds factory hours');
  });
});
