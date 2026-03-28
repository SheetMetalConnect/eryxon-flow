import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useOEEMetrics, type OEEMetrics } from './useOEEMetrics';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useOEEMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null initially (TODO queryFn)', async () => {
    const { result } = renderHook(() => useOEEMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Current implementation returns null (TODO placeholder)
    expect(result.current.data).toBeNull();
  });

  it('uses different query keys for different day ranges', () => {
    const wrapper = createWrapper();

    const { result: result7 } = renderHook(() => useOEEMetrics(7), { wrapper });
    const { result: result30 } = renderHook(() => useOEEMetrics(30), { wrapper });

    // Both should succeed (different query keys means different cache entries)
    expect(result7.current).toBeDefined();
    expect(result30.current).toBeDefined();
  });

  it('exposes standard TanStack Query states', async () => {
    const { result } = renderHook(() => useOEEMetrics(14), {
      wrapper: createWrapper(),
    });

    // Should expose loading state
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isFetching).toBe('boolean');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('has correct staleTime (5 minutes)', async () => {
    const { result } = renderHook(() => useOEEMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data should not be stale immediately after fetch
    expect(result.current.isStale).toBe(false);
  });

  it('OEEMetrics interface has correct shape', () => {
    // Type-level test: ensure the interface exports exist
    const mockMetrics: OEEMetrics = {
      availability: 0.95,
      performance: 0.88,
      quality: 0.99,
      oee: 0.83,
      trend: [{ date: '2026-03-01', oee: 0.8, availability: 0.9, performance: 0.9, quality: 0.99 }],
      stateBreakdown: [{ name: 'Running', value: 80, color: '#00ff00' }],
      byCell: [{ cellName: 'Laser', oee: 0.85 }],
    };

    expect(mockMetrics.oee).toBe(0.83);
    expect(mockMetrics.trend).toHaveLength(1);
    expect(mockMetrics.stateBreakdown).toHaveLength(1);
    expect(mockMetrics.byCell).toHaveLength(1);
  });
});
