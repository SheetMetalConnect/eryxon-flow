import { describe, it, expect } from 'vitest';
import { selectOverScheduledHours, minutesOverSchedule, type AttentionOperation } from './dashboardAttention';

const op = (over: Partial<AttentionOperation>): AttentionOperation => ({
  id: 'x', operation_name: 'Laser', status: 'in_progress', estimated_time: 60, actual_time: null, ...over,
});

describe('selectOverScheduledHours', () => {
  it('keeps only operations clocked strictly over their estimate', () => {
    const ops = [
      op({ id: 'a', estimated_time: 60, actual_time: 90 }), // over
      op({ id: 'b', estimated_time: 60, actual_time: 60 }), // exactly on
      op({ id: 'c', estimated_time: 60, actual_time: 30 }), // under
      op({ id: 'd', estimated_time: 60, actual_time: null }), // not clocked
    ];
    expect(selectOverScheduledHours(ops).map((o) => o.id)).toEqual(['a']);
  });

  it('ignores operations with no estimate (avoids false positives)', () => {
    expect(selectOverScheduledHours([op({ estimated_time: 0, actual_time: 10 })])).toEqual([]);
  });
});

describe('minutesOverSchedule', () => {
  it('returns the rounded overage, clamped at 0', () => {
    expect(minutesOverSchedule(op({ estimated_time: 60, actual_time: 92.4 }))).toBe(32);
    expect(minutesOverSchedule(op({ estimated_time: 60, actual_time: 30 }))).toBe(0);
    expect(minutesOverSchedule(op({ estimated_time: 60, actual_time: null }))).toBe(0);
  });
});
