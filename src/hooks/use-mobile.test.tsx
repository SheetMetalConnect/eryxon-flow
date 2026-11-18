import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let changeHandler: ((e: { matches: boolean }) => void) | null = null;

  beforeEach(() => {
    changeHandler = null;
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: window.innerWidth < 768,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: any) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('returns true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns false for exactly 768px (breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true for 767px (just below breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('updates when window is resized', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      if (changeHandler) {
        changeHandler({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it('sets up matchMedia listener on mount', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    renderHook(() => useIsMobile());

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('cleans up listener on unmount', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    const removeEventListener = vi.fn();

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
