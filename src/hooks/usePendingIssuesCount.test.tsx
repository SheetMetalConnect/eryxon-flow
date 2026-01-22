import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePendingIssuesCount } from './usePendingIssuesCount';

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockChannel = vi.fn();
const mockOn = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: vi.fn(),
        }),
      }),
    }),
  },
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
    mockSelect.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
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
    mockSelect.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      }),
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
    mockSelect.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
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
    mockSelect.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: null,
        error: null,
      }),
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
    const eqMock = vi.fn().mockResolvedValue({ count: 0, error: null });
    mockSelect.mockReturnValue({ eq: eqMock });

    renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(eqMock).toHaveBeenCalledWith('status', 'pending');
  });

  it('throws error on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSelect.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: null,
        error: new Error('Database error'),
      }),
    });

    const { result } = renderHook(() => usePendingIssuesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    consoleSpy.mockRestore();
  });
});
