import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useOEEMetrics } from './useOEEMetrics';

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

describe('useOEEMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock operations data
    const operationsData = [
      {
        id: 'op1',
        actual_time: 60,
        estimated_time: 50,
        setup_time: 10,
        wait_time: 5,
        status: 'completed',
        completed_at: new Date().toISOString(),
        cell_id: 'cell-1',
        cells: { name: 'Cell A', capacity_hours_per_day: 8 },
      },
      {
        id: 'op2',
        actual_time: 30,
        estimated_time: 35,
        setup_time: 5,
        wait_time: 2,
        status: 'completed',
        completed_at: new Date().toISOString(),
        cell_id: 'cell-1',
        cells: { name: 'Cell A', capacity_hours_per_day: 8 },
      },
      {
        id: 'op3',
        actual_time: null,
        estimated_time: 40,
        setup_time: 5,
        wait_time: 0,
        status: 'in_progress',
        completed_at: null,
        cell_id: 'cell-2',
        cells: { name: 'Cell B', capacity_hours_per_day: 8 },
      },
    ];

    // Mock quantities data
    const quantitiesData = [
      {
        quantity_produced: 100,
        quantity_good: 95,
        quantity_scrap: 5,
        operation_id: 'op1',
        recorded_at: new Date().toISOString(),
      },
      {
        quantity_produced: 50,
        quantity_good: 48,
        quantity_scrap: 2,
        operation_id: 'op2',
        recorded_at: new Date().toISOString(),
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: operationsData,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'operation_quantities') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: quantitiesData,
                error: null,
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
    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns OEE metrics', async () => {
    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.availability).toBeDefined();
    expect(result.current.data?.performance).toBeDefined();
    expect(result.current.data?.quality).toBeDefined();
    expect(result.current.data?.oee).toBeDefined();
  });

  it('calculates quality from quantity data', async () => {
    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Quality = totalGood / totalProduced * 100 = (95+48) / (100+50) * 100 = 143/150 * 100 = 95.33%
    expect(result.current.data?.quality).toBeCloseTo(95.33, 0);
  });

  it('returns state breakdown', async () => {
    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.stateBreakdown).toBeDefined();
    expect(Array.isArray(result.current.data?.stateBreakdown)).toBe(true);
  });

  it('returns trend data', async () => {
    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.trend).toBeDefined();
    expect(Array.isArray(result.current.data?.trend)).toBe(true);
  });

  it('returns metrics by cell', async () => {
    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.byCell).toBeDefined();
    expect(Array.isArray(result.current.data?.byCell)).toBe(true);
  });

  it('accepts custom date range', async () => {
    const { result } = renderHook(() => useOEEMetrics(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('handles empty operations data', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.oee).toBeDefined();
  });

  it('handles database error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useOEEMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });
});
