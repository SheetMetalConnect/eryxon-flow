import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeSubscription } from './useRealtimeSubscription';

const mockRemoveChannel = vi.fn();
const mockChannel = {
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

let changeHandler:
  | ((payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void)
  | undefined;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => mockChannel,
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    changeHandler = undefined;

    mockChannel.on.mockImplementation((_, __, callback) => {
      changeHandler = callback;
      return mockChannel;
    });
    mockChannel.subscribe.mockImplementation(() => mockChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps pending notifications across rerenders and invokes the latest callback', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = renderHook(({ callback }) => useRealtimeSubscription({
      channelName: 'stable-channel',
      tables: [{ table: 'issues', filter: 'tenant_id=eq.tenant-1' }],
      onDataChange: callback,
      debounceMs: 100,
    }), { initialProps: { callback: first } });

    act(() => { changeHandler?.({ eventType: 'UPDATE' }); vi.advanceTimersByTime(50); });
    rerender({ callback: latest });
    act(() => { vi.advanceTimersByTime(50); });

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it('replaces the subscription and discards old tenant notifications when the filter changes', () => {
    const onDataChange = vi.fn();
    const { rerender } = renderHook(({ tenant }) => useRealtimeSubscription({
      channelName: 'tenant-channel',
      tables: [{ table: 'issues', filter: `tenant_id=eq.${tenant}` }],
      onDataChange,
      debounceMs: 100,
    }), { initialProps: { tenant: 'tenant-1' } });

    act(() => { changeHandler?.({ eventType: 'UPDATE' }); });
    rerender({ tenant: 'tenant-2' });
    act(() => { vi.advanceTimersByTime(100); });
    expect(onDataChange).not.toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel.on).toHaveBeenLastCalledWith('postgres_changes',
      { table: 'issues', schema: 'public', event: '*', filter: 'tenant_id=eq.tenant-2' }, expect.any(Function));
  });

  it('cancels pending debounced callbacks on unmount', () => {
    const onDataChange = vi.fn();

    const { unmount } = renderHook(() =>
      useRealtimeSubscription({
        channelName: 'test-channel',
        tables: [{ table: 'issues' }],
        onDataChange,
        debounceMs: 50,
      })
    );

    act(() => {
      changeHandler?.({ eventType: 'INSERT' });
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onDataChange).not.toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
