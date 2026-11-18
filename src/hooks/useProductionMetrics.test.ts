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

// Flexible supabase mock with per-table responses
const tableResponses: Record<string, any> = {};
const createSupabaseChain = (tableName: string) => {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal methods resolve with table-specific data
  chain.single = vi.fn(() => Promise.resolve(tableResponses[tableName] ?? { data: null, error: null }));
  // For non-single queries, resolve as array
  const arrayResolve = () => Promise.resolve(tableResponses[tableName] ?? { data: [], error: null });
  chain.eq = vi.fn(() => {
    const innerChain = { ...chain };
    innerChain.eq = chain.eq;
    // When eq is called, subsequent calls should still be chainable
    return chain;
  });
  chain.in = vi.fn(() => chain);
  // Override: when the chain ends without .single(), it should auto-resolve
  chain.then = (resolve: any, reject: any) => {
    return arrayResolve().then(resolve, reject);
  };
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => createSupabaseChain(table)),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useOperationProductionMetrics, useJobProductionMetrics, useRecordProduction } from './useProductionMetrics';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useOperationProductionMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset table responses
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns undefined when no operationId', () => {
    const { result } = renderHook(() => useOperationProductionMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('fetches operation metrics when operationId provided', async () => {
    tableResponses['operations'] = {
      data: {
        id: 'op-1',
        operation_name: 'Laser Cut',
        estimated_time: 60,
        actual_time: 50,
        part: { quantity: 100 },
      },
      error: null,
    };
    tableResponses['operation_quantities'] = {
      data: [
        { quantity_produced: 50, quantity_good: 45, quantity_scrap: 3, quantity_rework: 2, scrap_reason_id: null, scrap_reason: null },
      ],
      error: null,
    };

    const { result } = renderHook(() => useOperationProductionMetrics('op-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('is disabled when profile has no tenant_id', async () => {
    const { useProfile } = await import('@/hooks/useProfile');
    vi.mocked(useProfile).mockReturnValueOnce(null);

    const { result } = renderHook(() => useOperationProductionMetrics('op-1'), {
      wrapper: createWrapper(),
    });

    // Should not fetch because enabled=false
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useJobProductionMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns undefined when no jobId', () => {
    const { result } = renderHook(() => useJobProductionMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('is disabled when no jobId provided', () => {
    const { result } = renderHook(() => useJobProductionMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useRecordProduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns recordQuantity function', () => {
    const { result } = renderHook(() => useRecordProduction(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.recordQuantity).toBe('function');
  });

  it('throws when no profile tenant_id', async () => {
    const { useProfile } = await import('@/hooks/useProfile');
    vi.mocked(useProfile).mockReturnValueOnce(null);

    const { result } = renderHook(() => useRecordProduction(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.recordQuantity({
        operationId: 'op-1',
        quantityGood: 10,
      })
    ).rejects.toThrow('Not authenticated');
  });
});
