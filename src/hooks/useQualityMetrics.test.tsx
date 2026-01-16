import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useQualityMetrics, useScrapReasonUsage, useJobQualityMetrics, usePartQualityMetrics } from './useQualityMetrics';

// Mock Supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();

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

describe('useQualityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock quantities query
    const quantitiesData = [
      {
        quantity_produced: 100,
        quantity_good: 90,
        quantity_scrap: 8,
        quantity_rework: 2,
        scrap_reason_id: 'sr-1',
        scrap_reason: { code: 'DEF1', description: 'Defect 1', category: 'Material' },
      },
      {
        quantity_produced: 50,
        quantity_good: 48,
        quantity_scrap: 2,
        quantity_rework: 0,
        scrap_reason_id: 'sr-2',
        scrap_reason: { code: 'DEF2', description: 'Defect 2', category: 'Process' },
      },
    ];

    // Mock issues query
    const issuesData = [
      { id: 'i1', status: 'pending', severity: 'high' },
      { id: 'i2', status: 'approved', severity: 'medium' },
      { id: 'i3', status: 'pending', severity: 'critical' },
    ];

    mockFrom.mockImplementation((table: string) => {
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
      if (table === 'issues') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: issuesData,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calculates production totals correctly', async () => {
    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.totalProduced).toBe(150);
    expect(result.current.data?.totalGood).toBe(138);
    expect(result.current.data?.totalScrap).toBe(10);
    expect(result.current.data?.totalRework).toBe(2);
  });

  it('calculates yield metrics correctly', async () => {
    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Overall yield = 138/150 * 100 = 92%
    expect(result.current.data?.overallYield).toBeCloseTo(92, 0);
    // Scrap rate = 10/150 * 100 = 6.67%
    expect(result.current.data?.scrapRate).toBeCloseTo(6.67, 0);
    // Rework rate = 2/150 * 100 = 1.33%
    expect(result.current.data?.reworkRate).toBeCloseTo(1.33, 0);
  });

  it('groups scrap by category', async () => {
    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.scrapByCategory).toBeDefined();
    expect(result.current.data?.scrapByCategory.length).toBeGreaterThan(0);
  });

  it('calculates issue metrics correctly', async () => {
    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.issueMetrics.total).toBe(3);
    expect(result.current.data?.issueMetrics.pending).toBe(2);
    expect(result.current.data?.issueMetrics.bySeverity.critical).toBe(1);
    expect(result.current.data?.issueMetrics.bySeverity.high).toBe(1);
  });
});

describe('useScrapReasonUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const scrapReasons = [
      { id: 'sr-1', code: 'DEF1', description: 'Defect 1', category: 'Material', active: true },
      { id: 'sr-2', code: 'DEF2', description: 'Defect 2', category: 'Process', active: true },
    ];

    const quantities = [
      { scrap_reason_id: 'sr-1', quantity_scrap: 10, recorded_at: '2024-01-01' },
      { scrap_reason_id: 'sr-1', quantity_scrap: 5, recorded_at: '2024-01-02' },
      { scrap_reason_id: 'sr-2', quantity_scrap: 3, recorded_at: '2024-01-01' },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'scrap_reasons') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: scrapReasons,
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
              not: vi.fn().mockResolvedValue({
                data: quantities,
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

  it('returns scrap reason usage statistics', async () => {
    const { result } = renderHook(() => useScrapReasonUsage(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
  });

  it('calculates usage count and total quantity', async () => {
    const { result } = renderHook(() => useScrapReasonUsage(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const sr1 = result.current.data?.find((r) => r.id === 'sr-1');
    expect(sr1?.usageCount).toBe(2);
    expect(sr1?.totalScrapQuantity).toBe(15);
  });
});

describe('useJobQualityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock data for optimized single-query approach (with joins)
    // The new implementation uses a single query with nested joins
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operation_quantities') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  quantity_produced: 100,
                  quantity_good: 95,
                  quantity_scrap: 4,
                  quantity_rework: 1,
                  operation: { id: 'op1', part: { job_id: 'job-1' } },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'issues') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'i1', status: 'pending', severity: 'high' }],
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
    const { result } = renderHook(() => useJobQualityMetrics(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data will be null (from queryFn) or undefined (before query runs)
    expect(result.current.data ?? null).toBeNull();
  });

  it('calculates job quality metrics with optimized query', async () => {
    const { result } = renderHook(() => useJobQualityMetrics('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.totalProduced).toBe(100);
    expect(result.current.data?.yieldRate).toBeCloseTo(95, 0);
    expect(result.current.data?.issueCount).toBe(1);
  });

  it('uses optimized single query for quantities (performance test)', async () => {
    const { result } = renderHook(() => useJobQualityMetrics('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // First call should be for operation_quantities (with joins)
    // Second call should be for issues
    // Not 4 calls (parts, operations, operation_quantities, issues)
    expect(mockFrom).toHaveBeenCalledWith('operation_quantities');
    expect(mockFrom).toHaveBeenCalledWith('issues');
  });
});

describe('usePartQualityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'op1' }],
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
                { quantity_produced: 50, quantity_good: 48, quantity_scrap: 2, quantity_rework: 0 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'issues') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
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

  it('returns no data when no partId', async () => {
    const { result } = renderHook(() => usePartQualityMetrics(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data will be null (from queryFn) or undefined (before query runs)
    expect(result.current.data ?? null).toBeNull();
  });

  it('calculates part quality metrics', async () => {
    const { result } = renderHook(() => usePartQualityMetrics('part-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.totalProduced).toBe(50);
    expect(result.current.data?.yieldRate).toBeCloseTo(96, 0);
  });
});
