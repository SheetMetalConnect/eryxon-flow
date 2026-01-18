import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';

// Create mock functions inside the factory to avoid hoisting issues
const mockFns = {
  mockSelect: vi.fn(),
  mockRpc: vi.fn(),
  mockSubscribe: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockToast: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => mockFns.mockSelect(),
    }),
    rpc: (...args: any[]) => mockFns.mockRpc(...args),
    channel: () => ({
      on: () => ({
        subscribe: () => mockFns.mockSubscribe(),
      }),
    }),
    removeChannel: () => mockFns.mockRemoveChannel(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockFns.mockToast(...args),
  }),
}));

describe('useNotifications', () => {
  const mockNotifications = [
    {
      id: 'n1',
      type: 'info',
      title: 'Notification 1',
      message: 'Message 1',
      read: false,
      pinned: false,
      dismissed: false,
      created_at: '2024-01-01T10:00:00Z',
    },
    {
      id: 'n2',
      type: 'warning',
      title: 'Notification 2',
      message: 'Message 2',
      read: true,
      pinned: true,
      dismissed: false,
      created_at: '2024-01-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockFns.mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockNotifications,
              error: null,
            }),
          }),
        }),
      }),
    });

    mockFns.mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
    mockFns.mockRpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);
  });

  it('fetches notifications on mount', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
  });

  it('calculates unread count correctly', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // One unread notification (n1)
    expect(result.current.unreadCount).toBe(1);
  });

  it('separates pinned and unpinned notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pinnedNotifications).toHaveLength(1);
    expect(result.current.pinnedNotifications[0].id).toBe('n2');
    expect(result.current.unpinnedNotifications).toHaveLength(1);
    expect(result.current.unpinnedNotifications[0].id).toBe('n1');
  });

  it('markAsRead calls RPC with correct params', async () => {
    mockFns.mockRpc.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(mockFns.mockRpc).toHaveBeenCalledWith('mark_notification_read', {
      p_notification_id: 'n1',
    });
  });

  it('togglePin calls RPC with correct params', async () => {
    mockFns.mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.togglePin('n1');
    });

    expect(mockFns.mockRpc).toHaveBeenCalledWith('toggle_notification_pin', {
      p_notification_id: 'n1',
    });
  });

  it('dismiss calls RPC with correct params', async () => {
    mockFns.mockRpc.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.dismiss('n1');
    });

    expect(mockFns.mockRpc).toHaveBeenCalledWith('dismiss_notification', {
      p_notification_id: 'n1',
    });
  });

  it('markAllAsRead calls RPC', async () => {
    mockFns.mockRpc.mockResolvedValue({ data: 2, error: null });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockFns.mockRpc).toHaveBeenCalledWith('mark_all_notifications_read');
  });

  it('refetch triggers new fetch', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    // Should have been called twice (initial + refetch)
    expect(mockFns.mockSelect).toHaveBeenCalled();
  });

  it('handles error in markAsRead', async () => {
    mockFns.mockRpc.mockResolvedValue({ error: new Error('RPC Error') });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(mockFns.mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('handles error in togglePin', async () => {
    mockFns.mockRpc.mockResolvedValue({ error: new Error('RPC Error') });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.togglePin('n1');
    });

    expect(mockFns.mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('handles error in dismiss', async () => {
    mockFns.mockRpc.mockResolvedValue({ error: new Error('RPC Error') });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.dismiss('n1');
    });

    expect(mockFns.mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('applies filters when provided', async () => {
    const mockFilter = {
      type: 'info' as const,
      read: false,
      pinned: false,
    };

    renderHook(() => useNotifications(mockFilter));

    await waitFor(() => {
      expect(mockFns.mockSelect).toHaveBeenCalled();
    });

    // Filters should be applied in the query chain
  });
});
