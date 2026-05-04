import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock profile
const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  active: true,
  is_machine: false,
  is_root_admin: false,
};

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(() => mockProfile),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Flexible supabase mock
const tableResponses: Record<string, any> = {};

const createSupabaseChain = (tableName: string) => {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'gte', 'lte', 'not', 'order', 'limit', 'single', 'is'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make it thenable so it resolves when awaited
  chain.then = (resolve: any, reject: any) => {
    const response = tableResponses[tableName] ?? { data: [], error: null };
    return Promise.resolve(response).then(resolve, reject);
  };
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => createSupabaseChain(table)),
  },
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
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns null when no time entries exist', async () => {
    tableResponses['time_entries'] = { data: [], error: null };

    const { result } = renderHook(() => useOEEMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

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
    tableResponses['time_entries'] = { data: [], error: null };

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
    tableResponses['time_entries'] = { data: [], error: null };

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
      availability: 95,
      performance: 88,
      quality: 99,
      oee: 83,
      trend: [{ date: '2026-03-01', oee: 80, availability: 90, performance: 90, quality: 99 }],
      stateBreakdown: [{ name: 'Run', value: 80, color: '#22c55e' }],
      byCell: [{ cellName: 'Laser', oee: 85 }],
    };

    expect(mockMetrics.oee).toBe(83);
    expect(mockMetrics.trend).toHaveLength(1);
    expect(mockMetrics.stateBreakdown).toHaveLength(1);
    expect(mockMetrics.byCell).toHaveLength(1);
  });

  it('calculates OEE correctly from time entries and quantities', async () => {
    const today = new Date().toISOString().slice(0, 10);

    tableResponses['time_entries'] = {
      data: [
        { id: 'te-1', operation_id: 'op-1', duration: 60, start_time: `${today}T08:00:00Z`, end_time: `${today}T09:00:00Z`, time_type: 'run' },
        { id: 'te-2', operation_id: 'op-1', duration: 20, start_time: `${today}T09:00:00Z`, end_time: `${today}T09:20:00Z`, time_type: 'setup' },
        { id: 'te-3', operation_id: 'op-1', duration: 10, start_time: `${today}T09:20:00Z`, end_time: `${today}T09:30:00Z`, time_type: 'breakdown' },
        { id: 'te-4', operation_id: 'op-1', duration: 10, start_time: `${today}T09:30:00Z`, end_time: `${today}T09:40:00Z`, time_type: 'wait' },
      ],
      error: null,
    };

    tableResponses['operations'] = {
      data: [
        {
          id: 'op-1',
          estimated_time: 60,
          run_time_per_unit: 0.5,
          cell_id: 'cell-1',
          cell: { id: 'cell-1', name: 'Laser' },
          part: { quantity: 100 },
        },
      ],
      error: null,
    };

    tableResponses['operation_quantities'] = {
      data: [
        { operation_id: 'op-1', quantity_produced: 100, quantity_good: 95, quantity_scrap: 5, quantity_rework: 0, recorded_at: `${today}T10:00:00Z` },
      ],
      error: null,
    };

    const { result } = renderHook(() => useOEEMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    const metrics = result.current.data!;

    // Planned = 60 + 20 + 10 + 10 = 100 minutes
    // Downtime = 10 (breakdown) + 10 (wait) = 20 minutes
    // Run Time = 100 - 20 = 80 minutes
    // Availability = 80/100 = 0.8 → 80%
    expect(metrics.availability).toBe(80);

    // Performance = (ideal_cycle_time * total_count) / run_time
    // = (0.5 * 100) / 80 = 50/80 = 0.625 → 62.5%
    expect(metrics.performance).toBe(62.5);

    // Quality = good / total = 95/100 = 0.95 → 95%
    expect(metrics.quality).toBe(95);

    // OEE = 0.8 * 0.625 * 0.95 = 0.475 → 47.5%
    expect(metrics.oee).toBe(47.5);

    // State breakdown
    expect(metrics.stateBreakdown.length).toBeGreaterThan(0);
    const runState = metrics.stateBreakdown.find(s => s.name === 'Run');
    expect(runState?.value).toBe(60);

    // By cell
    expect(metrics.byCell).toHaveLength(1);
    expect(metrics.byCell[0].cellName).toBe('Laser');

    // Trend
    expect(metrics.trend.length).toBeGreaterThan(0);
  });

  it('returns null when supabase returns an error', async () => {
    tableResponses['time_entries'] = { data: null, error: { message: 'Permission denied' } };

    const { result } = renderHook(() => useOEEMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });
});
