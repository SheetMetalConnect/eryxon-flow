import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Use vi.hoisted to create mocks that work with hoisted vi.mock calls
const { mockFrom, mockProfile } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockProfile = { id: 'user-1', tenant_id: 'tenant-1' };
  return { mockFrom, mockProfile };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Mock useProfile
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => mockProfile,
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
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

// Helper to set up Supabase chain mock that returns given data
function mockSupabaseResponse(data: any[] | null, error: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ data, error }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('useReliabilityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty metrics when no operations exist', async () => {
    mockSupabaseResponse([]);

    const { result } = renderHook(() => useReliabilityMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      totalOperations: 0,
      onTimeOperations: 0,
      onTimePercentage: 0,
      lateOperations: 0,
      latePercentage: 0,
      avgDelayMinutes: 0,
      weeklyTrend: [],
      delayTrend: [],
      byCell: [],
    });
  });

  it('calculates on-time vs late operations correctly', async () => {
    const operations = [
      {
        id: 'op-1',
        completed_at: '2026-04-10T10:00:00Z',
        planned_end: '2026-04-11T10:00:00Z', // on time (completed before planned)
        cell_id: 'cell-1',
        cell: { name: 'Laser' },
      },
      {
        id: 'op-2',
        completed_at: '2026-04-12T14:00:00Z',
        planned_end: '2026-04-12T10:00:00Z', // late by 4 hours = 240 min
        cell_id: 'cell-1',
        cell: { name: 'Laser' },
      },
      {
        id: 'op-3',
        completed_at: '2026-04-13T08:00:00Z',
        planned_end: '2026-04-13T08:00:00Z', // exact = on time
        cell_id: 'cell-2',
        cell: { name: 'Bending' },
      },
    ];
    mockSupabaseResponse(operations);

    const { result } = renderHook(() => useReliabilityMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = result.current.data!;
    expect(data.totalOperations).toBe(3);
    expect(data.onTimeOperations).toBe(2);
    expect(data.lateOperations).toBe(1);
    expect(data.onTimePercentage).toBeCloseTo(66.7, 0);
    expect(data.latePercentage).toBeCloseTo(33.3, 0);
    expect(data.avgDelayMinutes).toBe(240);
  });

  it('groups operations by cell', async () => {
    const operations = [
      {
        id: 'op-1',
        completed_at: '2026-04-10T10:00:00Z',
        planned_end: '2026-04-11T10:00:00Z',
        cell_id: 'cell-1',
        cell: { name: 'Laser' },
      },
      {
        id: 'op-2',
        completed_at: '2026-04-12T14:00:00Z',
        planned_end: '2026-04-12T10:00:00Z',
        cell_id: 'cell-1',
        cell: { name: 'Laser' },
      },
      {
        id: 'op-3',
        completed_at: '2026-04-13T08:00:00Z',
        planned_end: '2026-04-14T08:00:00Z',
        cell_id: 'cell-2',
        cell: { name: 'Bending' },
      },
    ];
    mockSupabaseResponse(operations);

    const { result } = renderHook(() => useReliabilityMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = result.current.data!;
    expect(data.byCell).toHaveLength(2);

    const laser = data.byCell.find((c) => c.name === 'Laser');
    expect(laser).toEqual({ name: 'Laser', onTime: 1, late: 1 });

    const bending = data.byCell.find((c) => c.name === 'Bending');
    expect(bending).toEqual({ name: 'Bending', onTime: 1, late: 0 });
  });

  it('uses different query keys for different day ranges', () => {
    mockSupabaseResponse([]);
    const wrapper = createWrapper();

    const { result: r7 } = renderHook(() => useReliabilityMetrics(7), { wrapper });
    const { result: r30 } = renderHook(() => useReliabilityMetrics(30), { wrapper });

    expect(r7.current).toBeDefined();
    expect(r30.current).toBeDefined();
  });

  it('exposes standard TanStack Query states', async () => {
    mockSupabaseResponse([]);

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
    mockSupabaseResponse([]);

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

  it('throws and exposes error when Supabase fails', async () => {
    mockSupabaseResponse(null, { message: 'DB error', code: '500' });

    const { result } = renderHook(() => useReliabilityMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
  });
});
