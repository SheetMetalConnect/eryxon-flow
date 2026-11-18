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
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'single', 'insert', 'update', 'delete'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make chain thenable for queries that don't call .single()
  chain.then = (resolve: any, reject: any) => {
    const resp = tableResponses[tableName] ?? { data: [], error: null };
    return Promise.resolve(resp).then(resolve, reject);
  };
  chain.single = vi.fn(() => Promise.resolve(tableResponses[tableName] ?? { data: null, error: null }));
  chain.order = vi.fn(() => {
    // Return a thenable that also has chain methods
    const ordered: any = { ...chain };
    ordered.then = (resolve: any, reject: any) => {
      const resp = tableResponses[tableName] ?? { data: [], error: null };
      return Promise.resolve(resp).then(resolve, reject);
    };
    return ordered;
  });
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => createTableChain(table)),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useBatches, useBatch, useBatchOperations, useCreateBatch, useUpdateBatchStatus, useDeleteBatch } from './useBatches';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useBatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns empty array when no batches', async () => {
    tableResponses['operation_batches'] = { data: [], error: null };

    const { result } = renderHook(() => useBatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns batch list', async () => {
    const mockBatches = [
      { id: 'batch-1', batch_number: 'B-001', status: 'draft', batch_type: 'laser_nesting' },
      { id: 'batch-2', batch_number: 'B-002', status: 'in_progress', batch_type: 'tube_batch' },
    ];
    tableResponses['operation_batches'] = { data: mockBatches, error: null };

    const { result } = renderHook(() => useBatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockBatches);
  });

  it('applies status filter', async () => {
    tableResponses['operation_batches'] = { data: [], error: null };

    const { result } = renderHook(() => useBatches({ status: 'draft' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('applies batch_type filter', async () => {
    tableResponses['operation_batches'] = { data: [], error: null };

    const { result } = renderHook(() => useBatches({ batch_type: 'laser_nesting' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('applies cell_id filter', async () => {
    tableResponses['operation_batches'] = { data: [], error: null };

    const { result } = renderHook(() => useBatches({ cell_id: 'cell-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('is disabled without tenant_id', async () => {
    const { useProfile } = await import('@/hooks/useProfile');
    vi.mocked(useProfile).mockReturnValueOnce(null);

    const { result } = renderHook(() => useBatches(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns undefined when no batchId', () => {
    const { result } = renderHook(() => useBatch(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('fetches batch detail', async () => {
    const batch = { id: 'batch-1', batch_number: 'B-001', status: 'draft' };
    tableResponses['operation_batches'] = { data: batch, error: null };

    const { result } = renderHook(() => useBatch('batch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(batch);
  });
});

describe('useBatchOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns undefined when no batchId', () => {
    const { result } = renderHook(() => useBatchOperations(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('fetches operations for a batch', async () => {
    const ops = [
      { id: 'bo-1', batch_id: 'batch-1', operation_id: 'op-1', sequence_in_batch: 1 },
    ];
    tableResponses['batch_operations'] = { data: ops, error: null };

    const { result } = renderHook(() => useBatchOperations('batch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useCreateBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes mutate function', () => {
    const { result } = renderHook(() => useCreateBatch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(result.current.isPending).toBe(false);
  });
});

describe('useUpdateBatchStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes mutate function', () => {
    const { result } = renderHook(() => useUpdateBatchStatus(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutate).toBe('function');
    expect(result.current.isPending).toBe(false);
  });
});

describe('useDeleteBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes mutate function', () => {
    const { result } = renderHook(() => useDeleteBatch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutate).toBe('function');
    expect(result.current.isPending).toBe(false);
  });
});
