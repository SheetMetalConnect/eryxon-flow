import { describe, it, expect } from 'vitest';
import { OperationAllocator } from './allocator';
import { CalendarService } from './calendar';
import { CapacityTracker } from './capacity';

const mockCell = { id: 'c1', capacity_hours_per_day: 8 } as any;

describe('OperationAllocator', () => {
  it('allocates a small operation within one day', () => {
    const cal = new CalendarService();
    const cap = new CapacityTracker([mockCell], cal);
    const alloc = new OperationAllocator(cal, cap);

    const result = alloc.allocate('c1', 'op1', 4, new Date('2026-03-30'));
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].hours_allocated).toBe(4);
    expect(result.allocations[0].date).toBe('2026-03-30');
  });

  it('overflows to next working day when exceeding capacity', () => {
    const cal = new CalendarService();
    const cap = new CapacityTracker([mockCell], cal);
    const alloc = new OperationAllocator(cal, cap);

    const result = alloc.allocate('c1', 'op1', 12, new Date('2026-03-30'));
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].hours_allocated).toBe(8);
    expect(result.allocations[1].hours_allocated).toBe(4);
  });

  it('skips weekends', () => {
    const cal = new CalendarService();
    const cap = new CapacityTracker([mockCell], cal);
    const alloc = new OperationAllocator(cal, cap);

    // Friday 2026-04-03
    const result = alloc.allocate('c1', 'op1', 12, new Date('2026-04-03'));
    expect(result.allocations[0].date).toBe('2026-04-03');
    expect(result.allocations[1].date).toBe('2026-04-06'); // Monday
  });
});
