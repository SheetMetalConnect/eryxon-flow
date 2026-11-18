import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizablePanel } from './useResizablePanel';

describe('useResizablePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default initial state', () => {
    const { result } = renderHook(() => useResizablePanel());

    expect(result.current.collapsed).toBe(false);
    expect(result.current.leftPanelWidth).toBe(70);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.containerRef).toBeDefined();
  });

  it('accepts custom initial width', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initialWidth: 50 }),
    );

    expect(result.current.leftPanelWidth).toBe(50);
  });

  it('toggles collapsed state', () => {
    const { result } = renderHook(() => useResizablePanel());

    expect(result.current.collapsed).toBe(false);

    act(() => {
      result.current.setCollapsed(true);
    });

    expect(result.current.collapsed).toBe(true);

    act(() => {
      result.current.setCollapsed(false);
    });

    expect(result.current.collapsed).toBe(false);
  });

  it('sets isDragging on handleMouseDown', () => {
    const { result } = renderHook(() => useResizablePanel());

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mockEvent);
    });

    expect(result.current.isDragging).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('sets isDragging on handleTouchStart', () => {
    const { result } = renderHook(() => useResizablePanel());

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.handleTouchStart(mockEvent);
    });

    expect(result.current.isDragging).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('adds window event listeners when dragging starts', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { result } = renderHook(() => useResizablePanel());

    act(() => {
      result.current.handleMouseDown({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('stops dragging on mouseup', () => {
    const { result } = renderHook(() => useResizablePanel());

    // Start dragging
    act(() => {
      result.current.handleMouseDown({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    expect(result.current.isDragging).toBe(true);

    // Simulate mouseup
    act(() => {
      window.dispatchEvent(new Event('mouseup'));
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('clamps width to minWidth and maxWidth on mousemove', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initialWidth: 60, minWidth: 30, maxWidth: 80 }),
    );

    // Set up a mock container with known dimensions
    const mockRect = { left: 0, width: 1000 } as DOMRect;
    Object.defineProperty(result.current.containerRef, 'current', {
      value: {
        getBoundingClientRect: () => mockRect,
      },
      writable: true,
    });

    // Start dragging
    act(() => {
      result.current.handleMouseDown({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    // Move mouse to 10% (below minWidth of 30)
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 100 }),
      );
    });

    expect(result.current.leftPanelWidth).toBe(30); // clamped to min

    // Move mouse to 90% (above maxWidth of 80)
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 900 }),
      );
    });

    expect(result.current.leftPanelWidth).toBe(80); // clamped to max

    // Move mouse to 50% (within range)
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 500 }),
      );
    });

    expect(result.current.leftPanelWidth).toBe(50);
  });

  it('does not update width when not dragging', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initialWidth: 60 }),
    );

    const mockRect = { left: 0, width: 1000 } as DOMRect;
    Object.defineProperty(result.current.containerRef, 'current', {
      value: { getBoundingClientRect: () => mockRect },
      writable: true,
    });

    // Move mouse without starting drag
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 400 }),
      );
    });

    expect(result.current.leftPanelWidth).toBe(60); // unchanged
  });

  it('removes event listeners on cleanup', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { result, unmount } = renderHook(() => useResizablePanel());

    // Start dragging to add listeners
    act(() => {
      result.current.handleMouseDown({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('uses default options when none provided', () => {
    const { result } = renderHook(() => useResizablePanel());

    expect(result.current.leftPanelWidth).toBe(70); // default initialWidth
  });

  it('handles touch move for resize', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initialWidth: 60, minWidth: 30, maxWidth: 80 }),
    );

    const mockRect = { left: 0, width: 1000 } as DOMRect;
    Object.defineProperty(result.current.containerRef, 'current', {
      value: { getBoundingClientRect: () => mockRect },
      writable: true,
    });

    // Start dragging via touch
    act(() => {
      result.current.handleTouchStart({
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent);
    });

    // Simulate touchmove
    act(() => {
      const touchEvent = new Event('touchmove') as any;
      touchEvent.touches = [{ clientX: 500 }];
      window.dispatchEvent(touchEvent);
    });

    expect(result.current.leftPanelWidth).toBe(50);
  });
});
