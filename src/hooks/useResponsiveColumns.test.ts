import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveColumns, useBreakpoint } from './useResponsiveColumns';

describe('useResponsiveColumns', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Reset to default width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('returns all columns visible on desktop', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200 });

    const { result } = renderHook(() =>
      useResponsiveColumns([
        { id: 'name', alwaysVisible: true },
        { id: 'status', hideBelow: 'md' },
        { id: 'details', hideBelow: 'lg' },
      ])
    );

    expect(result.current.columnVisibility).toEqual({
      name: true,
      status: true,
      details: true,
    });
    expect(result.current.isDesktop).toBe(true);
  });

  it('hides columns below breakpoint on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500 });

    const { result } = renderHook(() =>
      useResponsiveColumns([
        { id: 'name', alwaysVisible: true },
        { id: 'status', hideBelow: 'md' },
        { id: 'details', hideBelow: 'sm' },
      ])
    );

    expect(result.current.columnVisibility).toEqual({
      name: true,
      status: false, // Hidden below md (768)
      details: false, // Hidden below sm (640)
    });
    expect(result.current.isMobile).toBe(true);
  });

  it('respects alwaysVisible flag', () => {
    Object.defineProperty(window, 'innerWidth', { value: 320 });

    const { result } = renderHook(() =>
      useResponsiveColumns([
        { id: 'id', alwaysVisible: true },
        { id: 'name', alwaysVisible: true },
      ])
    );

    expect(result.current.columnVisibility.id).toBe(true);
    expect(result.current.columnVisibility.name).toBe(true);
  });

  it('merges with default visibility', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });

    const { result } = renderHook(() =>
      useResponsiveColumns([{ id: 'name', alwaysVisible: true }], { extra: false })
    );

    expect(result.current.columnVisibility.extra).toBe(false);
    expect(result.current.columnVisibility.name).toBe(true);
  });

  it('updates on window resize', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200 });

    const { result } = renderHook(() =>
      useResponsiveColumns([
        { id: 'name', alwaysVisible: true },
        { id: 'details', hideBelow: 'lg' },
      ])
    );

    expect(result.current.columnVisibility.details).toBe(true);
    expect(result.current.isDesktop).toBe(true);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.columnVisibility.details).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  it('correctly identifies tablet breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 900 });

    const { result } = renderHook(() =>
      useResponsiveColumns([{ id: 'name', alwaysVisible: true }])
    );

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('returns window width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280 });

    const { result } = renderHook(() =>
      useResponsiveColumns([{ id: 'name', alwaysVisible: true }])
    );

    expect(result.current.windowWidth).toBe(1280);
  });
});

describe('useBreakpoint', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('identifies mobile breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('identifies tablet breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('identifies desktop breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('returns width property', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.width).toBe(1000);
  });
});
