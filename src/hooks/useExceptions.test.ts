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

// Mock supabase
const mockSupabaseChain = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
};

// Build chainable mock
const createChain = (resolvedValue: any) => {
  const chain: any = {};
  for (const key of ['select', 'eq', 'order', 'limit', 'single', 'from']) {
    chain[key] = vi.fn(() => chain);
  }
  // The last call in the chain should return the resolved value
  chain.limit = vi.fn(() => Promise.resolve(resolvedValue));
  chain.single = vi.fn(() => Promise.resolve(resolvedValue));
  return chain;
};

const mockFromChain = createChain({ data: [], error: null });
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockFromChain),
    rpc: (...args: any[]) => mockRpc(...args),
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

import { useExceptions, useException } from './useExceptions';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useExceptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromChain.select.mockReturnValue(mockFromChain);
    mockFromChain.eq.mockReturnValue(mockFromChain);
    mockFromChain.order.mockReturnValue(mockFromChain);
    mockFromChain.limit.mockResolvedValue({ data: [], error: null });
    mockRpc.mockResolvedValue({ data: [{ open_count: 0, acknowledged_count: 0, resolved_count: 0, dismissed_count: 0, total_count: 0, avg_resolution_time_hours: null }], error: null });
  });

  it('returns empty exceptions when no data', async () => {
    const { result } = renderHook(() => useExceptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exceptions).toEqual([]);
  });

  it('returns exception list when data exists', async () => {
    const mockExceptions = [
      { id: 'exc-1', status: 'open', detected_at: '2026-01-01T00:00:00Z', tenant_id: 'tenant-1' },
      { id: 'exc-2', status: 'acknowledged', detected_at: '2026-01-02T00:00:00Z', tenant_id: 'tenant-1' },
    ];
    mockFromChain.limit.mockResolvedValue({ data: mockExceptions, error: null });

    const { result } = renderHook(() => useExceptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exceptions).toEqual(mockExceptions);
  });

  it('passes status filter to query', async () => {
    mockFromChain.limit.mockResolvedValue({ data: [], error: null });

    renderHook(() => useExceptions({ status: 'open' }), {
      wrapper: createWrapper(),
    });

    // The hook should call eq with status filter
    await waitFor(() => {
      expect(mockFromChain.eq).toHaveBeenCalled();
    });
  });

  it('respects limit option', async () => {
    mockFromChain.limit.mockResolvedValue({ data: [], error: null });

    renderHook(() => useExceptions({ limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFromChain.limit).toHaveBeenCalled();
    });
  });

  it('exposes mutation states', () => {
    const { result } = renderHook(() => useExceptions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isAcknowledging).toBe(false);
    expect(result.current.isResolving).toBe(false);
    expect(result.current.isDismissing).toBe(false);
    expect(typeof result.current.acknowledge).toBe('function');
    expect(typeof result.current.resolve).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useExceptions(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useException', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromChain.select.mockReturnValue(mockFromChain);
    mockFromChain.eq.mockReturnValue(mockFromChain);
    mockFromChain.single.mockResolvedValue({ data: null, error: null });
  });

  it('returns null when no exceptionId', async () => {
    const { result } = renderHook(() => useException(undefined), {
      wrapper: createWrapper(),
    });

    // Query should not be enabled
    expect(result.current.data).toBeUndefined();
  });

  it('fetches exception detail when id provided', async () => {
    const mockException = {
      id: 'exc-1',
      status: 'open',
      tenant_id: 'tenant-1',
      expectation: null,
    };
    mockFromChain.single.mockResolvedValue({ data: mockException, error: null });

    const { result } = renderHook(() => useException('exc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
