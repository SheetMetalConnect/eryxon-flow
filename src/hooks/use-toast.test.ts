import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, reducer } from './use-toast';

describe('toast reducer', () => {
  const initialState = { toasts: [] };

  it('ADD_TOAST adds a toast to the beginning', () => {
    const newToast = {
      id: '1',
      title: 'Test Toast',
      open: true,
    };

    const result = reducer(initialState, {
      type: 'ADD_TOAST',
      toast: newToast,
    });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].title).toBe('Test Toast');
  });

  it('ADD_TOAST limits to TOAST_LIMIT', () => {
    const state = {
      toasts: [{ id: '1', title: 'Existing', open: true }],
    };

    const newToast = {
      id: '2',
      title: 'New Toast',
      open: true,
    };

    const result = reducer(state as any, {
      type: 'ADD_TOAST',
      toast: newToast,
    });

    // TOAST_LIMIT is 1, so should only have the new toast
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST updates an existing toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Original', open: true }],
    };

    const result = reducer(state as any, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });

    expect(result.toasts[0].title).toBe('Updated');
    expect(result.toasts[0].open).toBe(true);
  });

  it('UPDATE_TOAST does not affect other toasts', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(state as any, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });

    expect(result.toasts[1].title).toBe('Toast 2');
  });

  it('DISMISS_TOAST sets open to false for specific toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Test', open: true }],
    };

    const result = reducer(state as any, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    });

    expect(result.toasts[0].open).toBe(false);
  });

  it('DISMISS_TOAST without id dismisses all toasts', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(state as any, {
      type: 'DISMISS_TOAST',
    });

    expect(result.toasts.every((t: any) => !t.open)).toBe(true);
  });

  it('REMOVE_TOAST removes a specific toast', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(state as any, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('REMOVE_TOAST without id removes all toasts', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(state as any, {
      type: 'REMOVE_TOAST',
    });

    expect(result.toasts).toHaveLength(0);
  });
});

describe('toast function', () => {
  it('returns id, dismiss, and update functions', () => {
    const result = toast({ title: 'Test' });

    expect(result.id).toBeDefined();
    expect(typeof result.dismiss).toBe('function');
    expect(typeof result.update).toBe('function');
  });

  it('generates unique IDs for each toast', () => {
    const toast1 = toast({ title: 'Toast 1' });
    const toast2 = toast({ title: 'Toast 2' });

    expect(toast1.id).not.toBe(toast2.id);
  });
});

describe('useToast hook', () => {
  it('returns toast state and functions', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toBeDefined();
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('adds toast when toast function is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'Test Description',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
  });

  it('dismiss function dismisses toasts', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      const created = result.current.toast({ title: 'Test' });
      toastId = created.id;
    });

    act(() => {
      result.current.dismiss(toastId!);
    });

    expect(result.current.toasts[0]?.open).toBe(false);
  });

  it('dismiss without id dismisses all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts.every(t => !t.open)).toBe(true);
  });

  it('update function updates existing toast', () => {
    const { result } = renderHook(() => useToast());

    let toastResult: { id: string; update: (props: any) => void };
    act(() => {
      toastResult = result.current.toast({ title: 'Original' });
    });

    act(() => {
      toastResult.update({ id: toastResult.id, title: 'Updated' });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });

  it('toast with variant sets variant correctly', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Error Toast',
        variant: 'destructive',
      });
    });

    expect(result.current.toasts[0].variant).toBe('destructive');
  });

  it('toast with action includes action', () => {
    const { result } = renderHook(() => useToast());
    const action = { altText: 'Undo', onClick: vi.fn() };

    act(() => {
      result.current.toast({
        title: 'With Action',
        action: action as any,
      });
    });

    expect(result.current.toasts[0].action).toBeDefined();
  });
});
