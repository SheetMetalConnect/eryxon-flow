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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Per-table response map
const tableResponses: Record<string, any> = {};

const createTableChain = (tableName: string) => {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'is', 'order', 'not', 'single', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
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

const mockStartBatch = vi.fn();
const mockStopBatch = vi.fn();

vi.mock('@/lib/database', () => ({
  startBatchTimeTracking: (...args: any[]) => mockStartBatch(...args),
  stopBatchTimeTracking: (...args: any[]) => mockStopBatch(...args),
}));

import { useBatchActiveTimer, useStartBatchTimer, useStopBatchTimer } from './useBatchTimeTracking';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useBatchActiveTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns null when batchId is undefined', async () => {
    const { result } = renderHook(() => useBatchActiveTimer(undefined), {
      wrapper: createWrapper(),
    });

    // Should be disabled
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns null when no batch operations exist', async () => {
    tableResponses['batch_operations'] = { data: [], error: null };

    const { result } = renderHook(() => useBatchActiveTimer('batch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it('returns null when no active time entries', async () => {
    tableResponses['batch_operations'] = {
      data: [{ operation_id: 'op-1' }, { operation_id: 'op-2' }],
      error: null,
    };
    tableResponses['time_entries'] = { data: [], error: null };

    const { result } = renderHook(() => useBatchActiveTimer('batch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it('returns active timer info when time entries exist', async () => {
    tableResponses['batch_operations'] = {
      data: [{ operation_id: 'op-1' }],
      error: null,
    };
    tableResponses['time_entries'] = {
      data: [
        { id: 'te-1', operation_id: 'op-1', start_time: '2026-03-28T08:00:00Z', operator_id: 'user-1' },
        { id: 'te-2', operation_id: 'op-1', start_time: '2026-03-28T08:05:00Z', operator_id: 'user-2' },
      ],
      error: null,
    };

    const { result } = renderHook(() => useBatchActiveTimer('batch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      isActive: true,
      startTime: '2026-03-28T08:00:00Z',
      operatorId: 'user-1',
      activeCount: 2,
    });
  });
});

describe('useStartBatchTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls startBatchTimeTracking with correct args', async () => {
    mockStartBatch.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStartBatchTimer(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('batch-1');

    expect(mockStartBatch).toHaveBeenCalledWith('batch-1', 'user-1', 'tenant-1');
  });

  it('throws when profile has no tenant_id', async () => {
    const { useProfile } = await import('@/hooks/useProfile');
    vi.mocked(useProfile).mockReturnValueOnce({ ...mockProfile, tenant_id: '' } as any);

    const { result } = renderHook(() => useStartBatchTimer(), {
      wrapper: createWrapper(),
    });

    // The hook checks for falsy tenant_id
    await expect(result.current.mutateAsync('batch-1')).rejects.toThrow();
  });
});

describe('useStopBatchTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls stopBatchTimeTracking and returns result', async () => {
    const mockResult = { totalMinutes: 60, minutesPerOperation: 30, operationsCount: 2 };
    mockStopBatch.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useStopBatchTimer(), {
      wrapper: createWrapper(),
    });

    const res = await result.current.mutateAsync('batch-1');

    expect(mockStopBatch).toHaveBeenCalledWith('batch-1', 'user-1', 'tenant-1');
    expect(res).toEqual(mockResult);
  });
});
