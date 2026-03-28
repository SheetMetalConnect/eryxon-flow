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

// Per-table response map
const tableResponses: Record<string, any> = {};

const createTableChain = (tableName: string) => {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'order', 'not', 'single', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make chain thenable (for queries that don't end with .single())
  chain.then = (resolve: any, reject: any) => {
    const resp = tableResponses[tableName] ?? { data: [], error: null };
    return Promise.resolve(resp).then(resolve, reject);
  };
  chain.single = vi.fn(() => Promise.resolve(tableResponses[tableName] ?? { data: null, error: null }));
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => createTableChain(table)),
  },
}));

import { useQualityMetrics, useScrapReasonUsage, useJobQualityMetrics, usePartQualityMetrics } from './useQualityMetrics';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useQualityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('calculates metrics from production data', async () => {
    tableResponses['operation_quantities'] = {
      data: [
        { quantity_produced: 100, quantity_good: 90, quantity_scrap: 7, quantity_rework: 3, scrap_reason_id: 'sr-1', scrap_reason: { code: 'DIM', description: 'Dimension error', category: 'Machining' } },
        { quantity_produced: 50, quantity_good: 48, quantity_scrap: 2, quantity_rework: 0, scrap_reason_id: 'sr-1', scrap_reason: { code: 'DIM', description: 'Dimension error', category: 'Machining' } },
      ],
      error: null,
    };
    tableResponses['issues'] = {
      data: [
        { id: 'i-1', status: 'pending', severity: 'critical' },
        { id: 'i-2', status: 'approved', severity: 'high' },
        { id: 'i-3', status: 'closed', severity: 'low' },
        { id: 'i-4', status: 'pending', severity: 'medium' },
      ],
      error: null,
    };

    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const metrics = result.current.data;
    expect(metrics).toBeDefined();
    if (metrics) {
      expect(metrics.totalProduced).toBe(150);
      expect(metrics.totalGood).toBe(138);
      expect(metrics.totalScrap).toBe(9);
      expect(metrics.totalRework).toBe(3);

      // Yield: 138/150 * 100 = 92%
      expect(metrics.overallYield).toBeCloseTo(92, 0);
      // Scrap rate: 9/150 * 100 = 6%
      expect(metrics.scrapRate).toBeCloseTo(6, 0);
      // Rework rate: 3/150 * 100 = 2%
      expect(metrics.reworkRate).toBeCloseTo(2, 0);

      // Issue metrics
      expect(metrics.issueMetrics.total).toBe(4);
      expect(metrics.issueMetrics.pending).toBe(2);
      expect(metrics.issueMetrics.approved).toBe(1);
      expect(metrics.issueMetrics.closed).toBe(1);
      expect(metrics.issueMetrics.bySeverity.critical).toBe(1);
      expect(metrics.issueMetrics.bySeverity.high).toBe(1);
      expect(metrics.issueMetrics.bySeverity.medium).toBe(1);
      expect(metrics.issueMetrics.bySeverity.low).toBe(1);

      // Scrap by category
      expect(metrics.scrapByCategory).toHaveLength(1);
      expect(metrics.scrapByCategory[0].category).toBe('Machining');
      expect(metrics.scrapByCategory[0].quantity).toBe(9);

      // Top scrap reasons
      expect(metrics.topScrapReasons).toHaveLength(1);
      expect(metrics.topScrapReasons[0].code).toBe('DIM');
      expect(metrics.topScrapReasons[0].quantity).toBe(9);
    }
  });

  it('handles zero production data', async () => {
    tableResponses['operation_quantities'] = { data: [], error: null };
    tableResponses['issues'] = { data: [], error: null };

    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const metrics = result.current.data;
    expect(metrics).toBeDefined();
    if (metrics) {
      expect(metrics.totalProduced).toBe(0);
      expect(metrics.totalGood).toBe(0);
      expect(metrics.overallYield).toBe(100); // 100% when no production
      expect(metrics.scrapRate).toBe(0);
      expect(metrics.issueMetrics.total).toBe(0);
    }
  });

  it('is disabled without tenant_id', async () => {
    const { useProfile } = await import('@/hooks/useProfile');
    vi.mocked(useProfile).mockReturnValueOnce(null);

    const { result } = renderHook(() => useQualityMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useScrapReasonUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns scrap reason usage data', async () => {
    tableResponses['scrap_reasons'] = {
      data: [
        { id: 'sr-1', code: 'DIM', description: 'Dimension error', category: 'Machining', active: true },
        { id: 'sr-2', code: 'SUR', description: 'Surface defect', category: 'Finishing', active: true },
      ],
      error: null,
    };
    tableResponses['operation_quantities'] = {
      data: [
        { scrap_reason_id: 'sr-1', quantity_scrap: 5, recorded_at: '2026-01-15T00:00:00Z' },
        { scrap_reason_id: 'sr-1', quantity_scrap: 3, recorded_at: '2026-02-01T00:00:00Z' },
      ],
      error: null,
    };

    const { result } = renderHook(() => useScrapReasonUsage(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = result.current.data;
    expect(data).toBeDefined();
    if (data) {
      expect(data).toHaveLength(2);
      const dimReason = data.find((r) => r.code === 'DIM');
      expect(dimReason?.usageCount).toBe(2);
      expect(dimReason?.totalScrapQuantity).toBe(8);
      expect(dimReason?.lastUsed).toBe('2026-02-01T00:00:00Z');

      const surReason = data.find((r) => r.code === 'SUR');
      expect(surReason?.usageCount).toBe(0);
      expect(surReason?.totalScrapQuantity).toBe(0);
      expect(surReason?.lastUsed).toBeNull();
    }
  });
});

describe('useJobQualityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns undefined when no jobId', () => {
    const { result } = renderHook(() => useJobQualityMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('is disabled when no jobId', () => {
    const { result } = renderHook(() => useJobQualityMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('usePartQualityMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns undefined when no partId', () => {
    const { result } = renderHook(() => usePartQualityMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('is disabled when no partId', () => {
    const { result } = renderHook(() => usePartQualityMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
