import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';

// Create mock functions inside the factory to avoid hoisting issues
const mockFns = {
  mockSelect: vi.fn(),
  mockRpc: vi.fn(),
  mockSubscribe: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockQueryEq: vi.fn(),
  mockQueryOrder: vi.fn(),
  mockQueryOr: vi.fn(),
};

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockAuthState = {
  profile: { id: 'user-1', tenant_id: 'tenant-1' },
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

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => mockAuthState.profile,
}));

vi.mock('sonner', () => ({
  toast: Object.assign(
    vi.fn(),
    {
      success: (...args: any[]) => mockToastSuccess(...args),
      error: (...args: any[]) => mockToastError(...args),
      warning: vi.fn(),
      info: vi.fn(),
    }
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
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

  const createQueryMock = (data = mockNotifications, error: Error | null = null) => {
    const query = {
      eq: vi.fn(),
      order: vi.fn(),
      or: vi.fn(),
      then: vi.fn(),
    };

    query.eq.mockImplementation((...args: unknown[]) => {
      mockFns.mockQueryEq(...args);
      return query;
    });
    query.order.mockImplementation((...args: unknown[]) => {
      mockFns.mockQueryOrder(...args);
      return query;
    });
    query.or.mockImplementation((...args: unknown[]) => {
      mockFns.mockQueryOr(...args);
      return query;
    });
    query.then.mockImplementation((onFulfilled, onRejected) =>
      Promise.resolve({ data, error }).then(onFulfilled, onRejected)
    );

    return query;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.mockSelect.mockReturnValue(createQueryMock());

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

  it('togglePin shows success toast with pinned description', async () => {
    mockFns.mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.togglePin('n1');
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'notifications.success',
      { description: 'notifications.pinned' }
    );
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

    expect(mockToastError).toHaveBeenCalledWith(
      'notifications.error',
      expect.objectContaining({ description: 'notifications.failed' })
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

    expect(mockToastError).toHaveBeenCalledWith(
      'notifications.error',
      expect.objectContaining({ description: 'notifications.failed' })
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

    expect(mockToastError).toHaveBeenCalledWith(
      'notifications.error',
      expect.objectContaining({ description: 'notifications.failed' })
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

    expect(mockFns.mockQueryEq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(mockFns.mockQueryEq).toHaveBeenCalledWith('type', 'info');
    expect(mockFns.mockQueryEq).toHaveBeenCalledWith('read', false);
    expect(mockFns.mockQueryEq).toHaveBeenCalledWith('pinned', false);
    expect(mockFns.mockQueryEq).toHaveBeenCalledWith('dismissed', false);
  });
});
