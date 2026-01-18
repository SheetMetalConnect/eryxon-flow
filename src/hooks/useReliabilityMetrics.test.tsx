import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useReliabilityMetrics } from './useReliabilityMetrics';

// Mock Supabase
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
  }),
}));

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useReliabilityMetrics', () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock operations data with planned vs actual dates
    const operationsData = [
      {
        id: 'op1',
        planned_start: yesterday.toISOString(),
        planned_end: now.toISOString(),
        completed_at: now.toISOString(), // On time
        status: 'completed',
        cell_id: 'cell-1',
        cells: { name: 'Cell A' },
        created_at: yesterday.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: 'op2',
        planned_start: yesterday.toISOString(),
        planned_end: yesterday.toISOString(), // Due yesterday
        completed_at: now.toISOString(), // Completed today = late
        status: 'completed',
        cell_id: 'cell-1',
        cells: { name: 'Cell A' },
        created_at: yesterday.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: 'op3',
        planned_start: yesterday.toISOString(),
        planned_end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
        completed_at: now.toISOString(), // On time
        status: 'completed',
        cell_id: 'cell-2',
        cells: { name: 'Cell B' },
        created_at: yesterday.toISOString(),
        updated_at: now.toISOString(),
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  data: operationsData,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns reliability metrics', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.onTimePercentage).toBeDefined();
    expect(result.current.data?.latePercentage).toBeDefined();
    expect(result.current.data?.totalOperations).toBeDefined();
  });

  it('calculates on-time percentage correctly', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 2 out of 3 are on time = 66.7%
    expect(result.current.data?.onTimePercentage).toBeCloseTo(66.7, 0);
    expect(result.current.data?.latePercentage).toBeCloseTo(33.3, 0);
  });

  it('returns operation counts', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.totalOperations).toBe(3);
    expect(result.current.data?.onTimeOperations).toBe(2);
    expect(result.current.data?.lateOperations).toBe(1);
  });

  it('returns weekly trend data', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.weeklyTrend).toBeDefined();
    expect(Array.isArray(result.current.data?.weeklyTrend)).toBe(true);
  });

  it('returns delay trend data', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.delayTrend).toBeDefined();
    expect(Array.isArray(result.current.data?.delayTrend)).toBe(true);
  });

  it('returns metrics by cell', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.byCell).toBeDefined();
    expect(Array.isArray(result.current.data?.byCell)).toBe(true);
  });

  it('accepts custom date range', async () => {
    const { result } = renderHook(() => useReliabilityMetrics(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('handles empty operations data', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.totalOperations).toBe(0);
    // When no operations: onTimeCount=0, totalOps=1 -> 0/1*100 = 0%
    expect(result.current.data?.onTimePercentage).toBe(0);
  });

  it('handles database error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useReliabilityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });
});
