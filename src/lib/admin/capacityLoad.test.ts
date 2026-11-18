import { describe, it, expect } from 'vitest';
import {
  cellLoadHours,
  countingAllocations,
  countingOperations,
  isParked,
  type CapacityAllocation,
  type CapacityFallbackOperation,
} from './capacityLoad';

const alloc = (hours: number, status: string | null): CapacityAllocation => ({
  hours_allocated: hours,
  operation: { status },
});

const fallbackOp = (minutes: number, status: string | null): CapacityFallbackOperation => ({
  estimated_time: minutes,
  status,
});

describe('isParked', () => {
  it('treats only on_hold as parked (Yellow Card)', () => {
    expect(isParked('on_hold')).toBe(true);
    expect(isParked('in_progress')).toBe(false);
    expect(isParked('not_started')).toBe(false);
    expect(isParked(null)).toBe(false);
    expect(isParked(undefined)).toBe(false);
  });
});

describe('countingAllocations / countingOperations', () => {
  it('removes Yellow Card (on_hold) allocations from the grid', () => {
    const list = [alloc(2, 'in_progress'), alloc(3, 'on_hold'), alloc(1, 'not_started')];
    expect(countingAllocations(list).map((a) => a.hours_allocated)).toEqual([2, 1]);
  });

  it('removes Yellow Card (on_hold) operations from the fallback grid', () => {
    const list = [fallbackOp(60, 'in_progress'), fallbackOp(120, 'on_hold')];
    expect(countingOperations(list).map((o) => o.estimated_time)).toEqual([60]);
  });
});

describe('cellLoadHours — Yellow Card releases capacity', () => {
  it('an on_hold allocation contributes 0 (allocation path)', () => {
    // 4h active + 5h parked => only the 4h counts.
    expect(cellLoadHours([alloc(4, 'in_progress'), alloc(5, 'on_hold')], [])).toBe(4);
  });

  it('a cell whose only allocation is on_hold loads 0, not the parked hours', () => {
    expect(cellLoadHours([alloc(8, 'on_hold')], [])).toBe(0);
  });

  it('an on_hold operation contributes 0 (fallback path)', () => {
    // 120 min active = 2h; 180 min parked excluded.
    expect(
      cellLoadHours([], [fallbackOp(120, 'in_progress'), fallbackOp(180, 'on_hold')]),
    ).toBe(2);
  });

  it('falls back to planned operations only when no counting allocation exists', () => {
    // The single allocation is parked, so the fallback ops drive the load.
    expect(cellLoadHours([alloc(8, 'on_hold')], [fallbackOp(60, 'in_progress')])).toBe(1);
  });

  it('sums normal allocations unchanged when nothing is parked', () => {
    expect(cellLoadHours([alloc(2, 'in_progress'), alloc(3, 'not_started')], [])).toBe(5);
  });
});
