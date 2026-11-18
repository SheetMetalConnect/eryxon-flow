import { describe, expect, it } from 'vitest';
import { buildOperationScheduleConstraints } from './constraints';
import type { Operation } from './types';

function operation(overrides: Partial<Operation>): Operation {
  return {
    id: 'operation',
    part_id: 'part',
    cell_id: 'cell',
    sequence: 10,
    estimated_time: 60,
    status: 'not_started',
    planned_start: null,
    planned_end: null,
    updated_at: '2026-09-19T10:00:00Z',
    ...overrides,
  };
}

describe('buildOperationScheduleConstraints', () => {
  it('blocks work behind an active predecessor without a known end', () => {
    const constraints = buildOperationScheduleConstraints([
      operation({ id: 'held', sequence: 10, status: 'on_hold' }),
      operation({ id: 'next', sequence: 20 }),
    ]);

    expect(constraints.get('next')).toEqual({ blockedByPredecessor: true });
  });

  it('starts after the latest earlier active operation', () => {
    const constraints = buildOperationScheduleConstraints([
      operation({ id: 'active', sequence: 10, status: 'in_progress', planned_end: '2026-09-23T17:00:00Z' }),
      operation({ id: 'next', sequence: 20 }),
    ], new Date('2026-09-19T12:00:00Z'));

    expect(constraints.get('next')?.earliestStart?.toISOString()).toBe('2026-09-24T17:00:00.000Z');
  });

  it('does not let a later active step constrain an earlier target', () => {
    const constraints = buildOperationScheduleConstraints([
      operation({ id: 'earlier', sequence: 10 }),
      operation({ id: 'later', sequence: 20, status: 'in_progress' }),
    ]);

    expect(constraints.has('earlier')).toBe(false);
  });
});
