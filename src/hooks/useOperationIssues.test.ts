import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOperationIssues } from './useOperationIssues';

// Create mock functions object to avoid hoisting issues
const mockFns = {
  mockSelect: vi.fn(),
  mockSubscribe: vi.fn(),
  mockRemoveChannel: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => mockFns.mockSelect(),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => mockFns.mockSubscribe(),
      }),
    }),
    removeChannel: () => mockFns.mockRemoveChannel(),
  },
}));

describe('useOperationIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFns.mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    mockFns.mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() =>
      useOperationIssues('op-1', 'tenant-1')
    );

    expect(result.current.loading).toBe(true);
  });

  it('returns empty issues when no operationId', async () => {
    const { result } = renderHook(() => useOperationIssues('', 'tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.issues).toEqual([]);
  });

  it('returns empty issues when no tenantId', async () => {
    const { result } = renderHook(() => useOperationIssues('op-1', undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.issues).toEqual([]);
  });

  it('fetches issues for operation', async () => {
    const mockIssues = [
      { id: '1', severity: 'high', status: 'pending', description: 'Issue 1', created_at: '2024-01-01' },
      { id: '2', severity: 'low', status: 'resolved', description: 'Issue 2', created_at: '2024-01-02' },
    ];

    mockFns.mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockIssues,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() =>
      useOperationIssues('op-1', 'tenant-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.issues).toHaveLength(2);
  });

  it('calculates pending issues correctly', async () => {
    const mockIssues = [
      { id: '1', severity: 'high', status: 'pending', description: 'Issue 1', created_at: '2024-01-01' },
      { id: '2', severity: 'low', status: 'resolved', description: 'Issue 2', created_at: '2024-01-02' },
      { id: '3', severity: 'medium', status: 'pending', description: 'Issue 3', created_at: '2024-01-03' },
    ];

    mockFns.mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockIssues,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() =>
      useOperationIssues('op-1', 'tenant-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pendingIssues).toHaveLength(2);
    expect(result.current.pendingCount).toBe(2);
  });

  it('calculates highest severity correctly', async () => {
    const mockIssues = [
      { id: '1', severity: 'low', status: 'pending', description: 'Issue 1', created_at: '2024-01-01' },
      { id: '2', severity: 'critical', status: 'pending', description: 'Issue 2', created_at: '2024-01-02' },
      { id: '3', severity: 'medium', status: 'pending', description: 'Issue 3', created_at: '2024-01-03' },
    ];

    mockFns.mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockIssues,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() =>
      useOperationIssues('op-1', 'tenant-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.highestSeverity).toBe('critical');
  });

  it('returns null highestSeverity when no pending issues', async () => {
    const mockIssues = [
      { id: '1', severity: 'high', status: 'resolved', description: 'Issue 1', created_at: '2024-01-01' },
    ];

    mockFns.mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockIssues,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() =>
      useOperationIssues('op-1', 'tenant-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.highestSeverity).toBeNull();
  });

  it('severity ordering is correct', async () => {
    // Test that critical > high > medium > low
    const testCases = [
      { issues: [{ severity: 'high', status: 'pending' }, { severity: 'medium', status: 'pending' }], expected: 'high' },
      { issues: [{ severity: 'low', status: 'pending' }, { severity: 'medium', status: 'pending' }], expected: 'medium' },
      { issues: [{ severity: 'low', status: 'pending' }], expected: 'low' },
    ];

    for (const testCase of testCases) {
      const mockIssues = testCase.issues.map((i, idx) => ({
        id: String(idx),
        severity: i.severity,
        status: i.status,
        description: `Issue ${idx}`,
        created_at: '2024-01-01',
      }));

      mockFns.mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockIssues,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() =>
        useOperationIssues('op-1', 'tenant-1')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.highestSeverity).toBe(testCase.expected);
    }
  });
});
