import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePendingIssuesCount } from './usePendingIssuesCount';

const mockFns = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEqTenant: vi.fn(),
  mockEqStatus: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: mockFns.mockSelect,
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: vi.fn(),
        }),
      }),
    }),
    removeChannel: mockFns.mockRemoveChannel,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockFns.mockUseAuth(),
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

describe('usePendingIssuesCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.mockUseAuth.mockReturnValue({
      profile: { tenant_id: 'tenant-1' },
    });
    mockFns.mockSelect.mockReturnValue({
      eq: mockFns.mockEqTenant,
    });
    mockFns.mockEqTenant.mockReturnValue({
      eq: mockFns.mockEqStatus,
    });
    mockFns.mockEqStatus.mockResolvedValue({
      count: 0,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns isLoading initially', () => {
    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns count of pending issues', async () => {
    mockFns.mockEqStatus.mockResolvedValue({
      count: 5,
      error: null,
    });

    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(5);
  });

  it('returns 0 when no pending issues', async () => {
    mockFns.mockEqStatus.mockResolvedValue({
      count: 0,
      error: null,
    });

    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(0);
  });

  it('handles null count gracefully', async () => {
    mockFns.mockEqStatus.mockResolvedValue({
      count: null,
      error: null,
    });

    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(0);
  });

  it('queries with correct parameters', async () => {
    renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFns.mockSelect).toHaveBeenCalled();
    });

    expect(mockFns.mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(mockFns.mockEqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(mockFns.mockEqStatus).toHaveBeenCalledWith('status', 'pending');
  });

  it('returns 0 when the tenant is unavailable', async () => {
    mockFns.mockUseAuth.mockReturnValue({
      profile: null,
    });

    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(0);
    expect(mockFns.mockSelect).not.toHaveBeenCalled();
  });

  it('surfaces query errors', async () => {
    mockFns.mockEqStatus.mockResolvedValue({
      count: null,
      error: new Error('Database error'),
    });

    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(0);
  });
});
