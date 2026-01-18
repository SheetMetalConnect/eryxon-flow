import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePartIssues } from './usePartIssues';

// Mock Supabase
const mockRpc = vi.fn();
const mockChannel = vi.fn();
const mockOn = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: vi.fn(),
        }),
      }),
    }),
  },
}));

describe('usePartIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: [{ total_count: 0, pending_count: 0, highest_severity: null }],
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns default state when no partId', async () => {
    const { result } = renderHook(() => usePartIssues(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalCount).toBe(0);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.highestSeverity).toBeNull();
  });

  it('fetches issue summary for part', async () => {
    mockRpc.mockResolvedValue({
      data: [{ total_count: 5, pending_count: 3, highest_severity: 'high' }],
      error: null,
    });

    const { result } = renderHook(() => usePartIssues('part-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalCount).toBe(5);
    expect(result.current.pendingCount).toBe(3);
    expect(result.current.highestSeverity).toBe('high');
  });

  it('calls RPC with correct parameters', async () => {
    renderHook(() => usePartIssues('part-123'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });

    expect(mockRpc).toHaveBeenCalledWith('get_part_issue_summary', {
      part_id_param: 'part-123',
    });
  });

  it('handles empty data response', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => usePartIssues('part-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalCount).toBe(0);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.highestSeverity).toBeNull();
  });

  it('handles error response', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('RPC error'),
    });

    const { result } = renderHook(() => usePartIssues('part-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalCount).toBe(0);
    expect(result.current.pendingCount).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('converts string counts to numbers', async () => {
    mockRpc.mockResolvedValue({
      data: [{ total_count: '10', pending_count: '5', highest_severity: 'medium' }],
      error: null,
    });

    const { result } = renderHook(() => usePartIssues('part-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalCount).toBe(10);
    expect(result.current.pendingCount).toBe(5);
  });

  it('refetches when partId changes', async () => {
    const { rerender } = renderHook(
      ({ partId }) => usePartIssues(partId),
      { initialProps: { partId: 'part-1' } }
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    rerender({ partId: 'part-2' });

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    expect(mockRpc).toHaveBeenLastCalledWith('get_part_issue_summary', {
      part_id_param: 'part-2',
    });
  });
});
