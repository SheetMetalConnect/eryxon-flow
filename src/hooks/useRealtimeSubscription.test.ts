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
