import { describe, it, expect } from 'vitest';
import { CapacityTracker } from './capacity';
import { CalendarService } from './calendar';

const mockCell = { id: 'c1', capacity_hours_per_day: 8 } as any;

describe('CapacityTracker', () => {
  it('returns base capacity on a working day', () => {
    const cal = new CalendarService();
    const tracker = new CapacityTracker([mockCell], cal);
    expect(tracker.getCellCapacityForDay('c1', new Date('2026-03-30'))).toBe(8);
  });

  it('returns 0 capacity on weekend', () => {
    const cal = new CalendarService();
    const tracker = new CapacityTracker([mockCell], cal);
    expect(tracker.getCellCapacityForDay('c1', new Date('2026-03-29'))).toBe(0);
  });

  it('tracks used hours and computes available', () => {
    const cal = new CalendarService();
    const tracker = new CapacityTracker([mockCell], cal);
    tracker.addUsedHours('c1', '2026-03-30', 3);
    expect(tracker.getAvailableCapacity('c1', new Date('2026-03-30'))).toBe(5);
  });
});
