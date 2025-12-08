import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let observerCallback: IntersectionObserverCallback;
  let observerOptions: IntersectionObserverInit;
  let mockObserver: {
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };

    // Create a proper constructor mock for IntersectionObserver
    const MockIntersectionObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
      observerCallback = callback;
      observerOptions = options || {};
      return {
        root: null,
        rootMargin: '',
        thresholds: [],
        observe: mockObserver.observe,
        unobserve: mockObserver.unobserve,
        disconnect: mockObserver.disconnect,
        takeRecords: vi.fn().mockReturnValue([]),
      };
    });

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns sentinelRef and containerRef', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.sentinelRef).toBe('function');
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
  });

  it('creates IntersectionObserver when sentinelRef is called with element', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: false,
        threshold: 100,
        rootMargin: '50px',
      })
    );

    const element = document.createElement('div');

    // Call sentinelRef with an element to trigger observer creation
    act(() => {
      result.current.sentinelRef(element);
    });

    // Observer should be created and observe called
    expect(mockObserver.observe).toHaveBeenCalledWith(element);
    // The hook uses threshold as rootMargin pixels
    expect(observerOptions.rootMargin).toBe('100px');
    expect(observerOptions.threshold).toBe(0);
  });

  it('calls onLoadMore when element intersects and hasMore is true', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    // Simulate intersection
    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        mockObserver as unknown as IntersectionObserver
      );
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not create observer when hasMore is false', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: false, isLoading: false })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    // Observer should not be created when hasMore is false
    expect(mockObserver.observe).not.toHaveBeenCalled();
  });

  it('does not create observer when isLoading is true', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: true })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    // Observer should not be created when isLoading is true
    expect(mockObserver.observe).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when not intersecting', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    act(() => {
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        mockObserver as unknown as IntersectionObserver
      );
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('observes element when sentinelRef is called', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    expect(mockObserver.observe).toHaveBeenCalledWith(element);
  });

  it('disconnects observer on unmount', () => {
    const onLoadMore = vi.fn();
    const { result, unmount } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    unmount();

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  it('disconnects previous observer when sentinelRef is called again', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    const element1 = document.createElement('div');
    const element2 = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element1);
    });

    act(() => {
      result.current.sentinelRef(element2);
    });

    // Should disconnect when changing elements
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  it('uses default threshold of 100px', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    const element = document.createElement('div');

    act(() => {
      result.current.sentinelRef(element);
    });

    expect(observerOptions.rootMargin).toBe('100px');
  });

  it('handles null node passed to sentinelRef', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );

    // Should not throw when null is passed
    act(() => {
      result.current.sentinelRef(null);
    });

    expect(mockObserver.observe).not.toHaveBeenCalled();
  });
});
