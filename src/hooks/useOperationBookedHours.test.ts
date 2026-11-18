import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { bookedMinutes, type BookedTimeEntry } from '@/lib/admin/bookedHours';

// Rows the mocked supabase queries resolve with, per table.
let timeEntryRows: Array<Record<string, unknown>> = [];
let pauseRows: Array<Record<string, unknown>> = [];

// Chainable supabase mock: from(table).select().eq().order()/.in() resolves to
// { data, error }, routing by table so the pauses lookup is independent.
const createChain = (table: string) => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'in']) {
    chain[m] = vi.fn(() => chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({
      data: table === 'time_entry_pauses' ? pauseRows : timeEntryRows,
      error: null,
    }).then(resolve);
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn((table: string) => createChain(table)) },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useOperationBookedHours } from './useOperationBookedHours';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

const NOW = Date.parse('2026-06-22T12:00:00.000Z');

describe('useOperationBookedHours', () => {
  // Pin Date.now() only — leave the timer system real so React Query's
  // scheduling (and waitFor) keeps working.
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    timeEntryRows = [];
    pauseRows = [];
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('is idle / empty when no operationId', () => {
    const { result } = renderHook(() => useOperationBookedHours(undefined, 60), {
      wrapper: createWrapper(),
    });
    expect(result.current.entries).toEqual([]);
    expect(result.current.totalMinutes).toBe(0);
    expect(result.current.activeCount).toBe(0);
  });

  it('sums stopped entries to match bookedHours.ts', async () => {
    timeEntryRows = [
      { id: 't1', operation_id: 'op-1', operator_id: 'u1', duration: 20, start_time: '2026-06-22T11:00:00.000Z', end_time: '2026-06-22T11:20:00.000Z', operator: { full_name: 'Alice' } },
      { id: 't2', operation_id: 'op-1', operator_id: 'u2', duration: null, start_time: '2026-06-22T11:00:00.000Z', end_time: '2026-06-22T11:15:00.000Z', operator: { full_name: 'Bob' } },
    ];

    const { result } = renderHook(() => useOperationBookedHours('op-1', 60), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    const expected: BookedTimeEntry[] = [
      { operation_id: 'op-1', duration: 20, start_time: '2026-06-22T11:00:00.000Z', end_time: '2026-06-22T11:20:00.000Z' },
      { operation_id: 'op-1', duration: null, start_time: '2026-06-22T11:00:00.000Z', end_time: '2026-06-22T11:15:00.000Z' },
    ];
    expect(result.current.totalMinutes).toBe(bookedMinutes(expected, NOW));
    expect(result.current.totalMinutes).toBe(35);
    expect(result.current.activeCount).toBe(0);
  });

  it('counts an active entry (no end_time) live against now', async () => {
    timeEntryRows = [
      { id: 't1', operation_id: 'op-1', operator_id: 'u1', duration: null, start_time: '2026-06-22T11:00:00.000Z', end_time: null, operator: { full_name: 'Alice' } },
    ];

    const { result } = renderHook(() => useOperationBookedHours('op-1', 30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    // 11:00 -> 12:00 = 60 min live.
    expect(result.current.totalMinutes).toBe(60);
    expect(result.current.activeCount).toBe(1);
    expect(result.current.entries[0].isActive).toBe(true);
  });

  it('subtracts an active entry’s pauses from its live booked time', async () => {
    timeEntryRows = [
      { id: 't1', operation_id: 'op-1', operator_id: 'u1', duration: null, start_time: '2026-06-22T11:00:00.000Z', end_time: null, operator: { full_name: 'Alice' } },
    ];
    // 15 min (900s) of closed pause within the 60-min live window → 45 min.
    pauseRows = [
      { time_entry_id: 't1', paused_at: '2026-06-22T11:10:00.000Z', resumed_at: '2026-06-22T11:25:00.000Z', duration: 900 },
    ];

    const { result } = renderHook(() => useOperationBookedHours('op-1', 30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    expect(result.current.totalMinutes).toBe(45);
    expect(result.current.activeCount).toBe(1);
  });

  it('flags over-planned via plannedVsBooked without gating', async () => {
    timeEntryRows = [
      { id: 't1', operation_id: 'op-1', operator_id: 'u1', duration: 90, start_time: '2026-06-22T10:00:00.000Z', end_time: '2026-06-22T11:30:00.000Z', operator: { full_name: 'Alice' } },
    ];

    const { result } = renderHook(() => useOperationBookedHours('op-1', 60), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    expect(result.current.plannedVsBooked.plannedMinutes).toBe(60);
    expect(result.current.plannedVsBooked.bookedMinutes).toBe(90);
    expect(result.current.plannedVsBooked.varianceMinutes).toBe(30);
    expect(result.current.plannedVsBooked.isOverScheduled).toBe(true);
  });
});
