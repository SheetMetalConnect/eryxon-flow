import { describe, it, expect } from 'vitest';
import {
  entryMinutes,
  bookedMinutes,
  bookedByOperation,
  plannedVsBooked,
  type BookedTimeEntry,
} from './bookedHours';

const NOW = Date.parse('2026-06-22T12:00:00.000Z');
const e = (o: Partial<BookedTimeEntry>): BookedTimeEntry => ({
  operation_id: 'op1', duration: null, start_time: '2026-06-22T11:00:00.000Z', end_time: null, ...o,
});

describe('entryMinutes', () => {
  it('uses stored duration when present', () => {
    expect(entryMinutes(e({ duration: 45 }), NOW)).toBe(45);
  });
  it('computes end - start when stopped without duration', () => {
    expect(entryMinutes(e({ end_time: '2026-06-22T11:30:00.000Z' }), NOW)).toBe(30);
  });
  it('counts an active entry as live elapsed against now', () => {
    expect(entryMinutes(e({ start_time: '2026-06-22T11:00:00.000Z' }), NOW)).toBe(60);
  });
});

describe('bookedMinutes / bookedByOperation', () => {
  it('sums mixed stopped + active entries', () => {
    const entries = [e({ duration: 20 }), e({ end_time: '2026-06-22T11:15:00.000Z' }), e({})];
    expect(bookedMinutes(entries, NOW)).toBe(20 + 15 + 60);
  });
  it('groups by operation', () => {
    const m = bookedByOperation([e({ operation_id: 'a', duration: 10 }), e({ operation_id: 'a', duration: 5 }), e({ operation_id: 'b', duration: 7 })], NOW);
    expect(m.get('a')).toBe(15);
    expect(m.get('b')).toBe(7);
  });
});

describe('plannedVsBooked', () => {
  it('flags over-scheduled when booked exceeds planned', () => {
    expect(plannedVsBooked(60, 90)).toMatchObject({ varianceMinutes: 30, isOverScheduled: true });
  });
  it('is not over when on or under planned', () => {
    expect(plannedVsBooked(60, 60).isOverScheduled).toBe(false);
    expect(plannedVsBooked(60, 30).isOverScheduled).toBe(false);
  });
  it('never flags over when there is no plan', () => {
    expect(plannedVsBooked(0, 100).isOverScheduled).toBe(false);
  });
});
