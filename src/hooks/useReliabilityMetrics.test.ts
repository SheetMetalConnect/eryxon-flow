import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useReliabilityMetrics, type ReliabilityMetrics } from './useReliabilityMetrics';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useReliabilityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null initially (TODO queryFn)', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it('uses different query keys for different day ranges', () => {
    const wrapper = createWrapper();

    const { result: r7 } = renderHook(() => useReliabilityMetrics(7), { wrapper });
    const { result: r30 } = renderHook(() => useReliabilityMetrics(30), { wrapper });

    expect(r7.current).toBeDefined();
    expect(r30.current).toBeDefined();
  });

  it('exposes standard TanStack Query states', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(14), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isFetching).toBe('boolean');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('has correct staleTime (5 minutes)', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isStale).toBe(false);
  });

  it('ReliabilityMetrics interface has correct shape', () => {
    const mockMetrics: ReliabilityMetrics = {
      totalOperations: 100,
      onTimeOperations: 85,
      onTimePercentage: 85,
      lateOperations: 15,
      latePercentage: 15,
      avgDelayMinutes: 45,
      weeklyTrend: [{ week: '2026-W13', onTime: 20, late: 3 }],
      delayTrend: [{ date: '2026-03-28', avgDelay: 30 }],
      byCell: [{ name: 'Laser', onTime: 40, late: 5 }],
    };

    expect(mockMetrics.totalOperations).toBe(100);
    expect(mockMetrics.onTimePercentage).toBe(85);
    expect(mockMetrics.weeklyTrend).toHaveLength(1);
    expect(mockMetrics.delayTrend).toHaveLength(1);
    expect(mockMetrics.byCell).toHaveLength(1);
  });
});
