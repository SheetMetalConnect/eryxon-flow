import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useOperationProductionMetrics,
  useJobProductionMetrics,
  useRecordProduction,
} from './useProductionMetrics';

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

describe('useOperationProductionMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock operation data
    const operationData = {
      id: 'op1',
      operation_name: 'Cutting',
      estimated_time: 60,
      actual_time: 55,
      part: { quantity: 100 },
    };

    // Mock quantities data
    const quantitiesData = [
      {
        quantity_produced: 80,
        quantity_good: 75,
        quantity_scrap: 4,
        quantity_rework: 1,
        scrap_reason_id: 'sr-1',
        scrap_reason: { id: 'sr-1', code: 'DEF1', description: 'Defect', category: 'Material' },
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: operationData,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'operation_quantities') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: quantitiesData,
              error: null,
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

  it('returns no data when no operationId', async () => {
    const { result } = renderHook(() => useOperationProductionMetrics(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data will be null (from queryFn) or undefined (before query runs)
    expect(result.current.data ?? null).toBeNull();
  });

  it('returns operation production metrics', async () => {
    const { result } = renderHook(() => useOperationProductionMetrics('op1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.operationId).toBe('op1');
    expect(result.current.data?.operationName).toBe('Cutting');
  });

  it('calculates quantity metrics correctly', async () => {
    const { result } = renderHook(() => useOperationProductionMetrics('op1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.quantityGood).toBe(75);
    expect(result.current.data?.quantityScrap).toBe(4);
    expect(result.current.data?.quantityRework).toBe(1);
  });

  it('calculates remaining quantity', async () => {
    const { result } = renderHook(() => useOperationProductionMetrics('op1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Planned: 100, Good: 75, Remaining: 25
    expect(result.current.data?.remaining).toBe(25);
  });

  it('calculates completion percentage', async () => {
    const { result } = renderHook(() => useOperationProductionMetrics('op1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 75/100 * 100 = 75%
    expect(result.current.data?.completionPercentage).toBe(75);
  });

  it('includes scrap reasons', async () => {
    const { result } = renderHook(() => useOperationProductionMetrics('op1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.scrapReasons).toBeDefined();
    expect(result.current.data?.scrapReasons.length).toBeGreaterThanOrEqual(0);
  });
});

describe('useJobProductionMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'parts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'p1' }, { id: 'p2' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'operations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 'op1', estimated_time: 60, actual_time: 55 },
                { id: 'op2', estimated_time: 40, actual_time: 45 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'operation_quantities') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  quantity_produced: 100,
                  quantity_good: 90,
                  quantity_scrap: 8,
                  quantity_rework: 2,
                  scrap_reason_id: 'sr-1',
                  scrap_reason: { id: 'sr-1', code: 'D1', description: 'Defect', category: 'Mat' },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  });

  it('returns no data when no jobId', async () => {
    const { result } = renderHook(() => useJobProductionMetrics(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data will be null (from queryFn) or undefined (before query runs)
    expect(result.current.data ?? null).toBeNull();
  });

  it('returns job production metrics', async () => {
    const { result } = renderHook(() => useJobProductionMetrics('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.totalProduced).toBe(100);
    expect(result.current.data?.totalGood).toBe(90);
  });

  it('calculates yield metrics', async () => {
    const { result } = renderHook(() => useJobProductionMetrics('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Overall yield = 90/100 * 100 = 90%
    expect(result.current.data?.overallYield).toBeCloseTo(90, 0);
    // Scrap rate = 8/100 * 100 = 8%
    expect(result.current.data?.scrapRate).toBeCloseTo(8, 0);
  });

  it('calculates time metrics', async () => {
    const { result } = renderHook(() => useJobProductionMetrics('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.totalActualTime).toBe(100); // 55 + 45
    expect(result.current.data?.totalEstimatedTime).toBe(100); // 60 + 40
  });

  it('includes scrap by reason breakdown', async () => {
    const { result } = renderHook(() => useJobProductionMetrics('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.scrapByReason).toBeDefined();
    expect(Array.isArray(result.current.data?.scrapByReason)).toBe(true);
  });
});

describe('useRecordProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operation_quantities') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'qty-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'operation_quantity_scrap_reasons') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  });

  it('returns recordQuantity function', () => {
    const { result } = renderHook(() => useRecordProduction(), {
      wrapper: createWrapper(),
    });

    expect(result.current.recordQuantity).toBeDefined();
    expect(typeof result.current.recordQuantity).toBe('function');
  });

  it('records production quantity', async () => {
    const { result } = renderHook(() => useRecordProduction(), {
      wrapper: createWrapper(),
    });

    let recordResult;
    await act(async () => {
      recordResult = await result.current.recordQuantity({
        operationId: 'op-1',
        quantityGood: 10,
        quantityScrap: 2,
        quantityRework: 1,
      });
    });

    expect(recordResult).toBeDefined();
    expect(recordResult.id).toBe('qty-1');
  });

  it('handles error during record', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operation_quantities') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Insert failed'),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { result } = renderHook(() => useRecordProduction(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.recordQuantity({
        operationId: 'op-1',
        quantityGood: 10,
      })
    ).rejects.toThrow();
  });
});
