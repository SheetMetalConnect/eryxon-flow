import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCellQRMMetrics,
  useNextCellCapacity,
  usePartRouting,
  useJobRouting,
  useMultipleJobsRouting,
  useAllCellsQRMMetrics,
} from './useQRMMetrics';

// Mock Supabase
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: mockSubscribe,
        }),
        subscribe: mockSubscribe,
      }),
    }),
  },
}));

describe('useCellQRMMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: {
        wip_count: 5,
        wip_limit: 10,
        utilization: 0.8,
        avg_wait_time: 15,
        throughput_rate: 12,
      },
      error: null,
    });
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null metrics when no cellId', () => {
    const { result } = renderHook(() => useCellQRMMetrics(null, 'tenant-1'));

    expect(result.current.metrics).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns null metrics when no tenantId', () => {
    const { result } = renderHook(() => useCellQRMMetrics('cell-1', null));

    expect(result.current.metrics).toBeNull();
  });

  it('fetches metrics for cell', async () => {
    const { result } = renderHook(() => useCellQRMMetrics('cell-1', 'tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_cell_qrm_metrics', {
      cell_id_param: 'cell-1',
      tenant_id_param: 'tenant-1',
    });
  });

  it('returns metrics data', async () => {
    const { result } = renderHook(() => useCellQRMMetrics('cell-1', 'tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('handles error from RPC', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('RPC error'),
    });

    const { result } = renderHook(() => useCellQRMMetrics('cell-1', 'tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe('useNextCellCapacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: {
        next_cell_id: 'cell-2',
        available_capacity: 5,
        current_wip: 3,
      },
      error: null,
    });
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  it('returns null when no currentCellId', () => {
    const { result } = renderHook(() => useNextCellCapacity(null, 'tenant-1'));

    expect(result.current.capacity).toBeNull();
  });

  it('fetches next cell capacity', async () => {
    const { result } = renderHook(() => useNextCellCapacity('cell-1', 'tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRpc).toHaveBeenCalledWith('check_next_cell_capacity', {
      current_cell_id: 'cell-1',
      tenant_id_param: 'tenant-1',
    });
  });
});

describe('usePartRouting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: [
        { cell_id: 'c1', cell_name: 'Cell A', sequence: 1, status: 'completed' },
        { cell_id: 'c2', cell_name: 'Cell B', sequence: 2, status: 'in_progress' },
      ],
      error: null,
    });
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  it('returns empty routing when no partId', () => {
    const { result } = renderHook(() => usePartRouting(null));

    expect(result.current.routing).toEqual([]);
  });

  it('fetches part routing', async () => {
    const { result } = renderHook(() => usePartRouting('part-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_part_routing', {
      p_part_id: 'part-1',
    });
  });

  it('groups operations by cell', async () => {
    const { result } = renderHook(() => usePartRouting('part-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.routing.length).toBeGreaterThan(0);
    expect(result.current.routing[0]).toHaveProperty('cell_name');
    expect(result.current.routing[0]).toHaveProperty('operation_count');
  });
});

describe('useJobRouting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'op1',
              status: 'completed',
              sequence: 1,
              cell_id: 'c1',
              cells: { id: 'c1', name: 'Cell A', color: '#ff0000', sequence: 1 },
              parts: { id: 'p1', job_id: 'job-1' },
            },
          ],
          error: null,
        }),
      }),
    }));
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  it('returns empty routing when no jobId', () => {
    const { result } = renderHook(() => useJobRouting(null));

    expect(result.current.routing).toEqual([]);
  });

  it('fetches job routing', async () => {
    const { result } = renderHook(() => useJobRouting('job-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('operations');
  });

  it('returns routing data sorted by sequence', async () => {
    const { result } = renderHook(() => useJobRouting('job-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.routing.length).toBeGreaterThan(0);
    expect(result.current.routing[0]).toHaveProperty('cell_name');
  });
});

describe('useMultipleJobsRouting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'op1',
              status: 'completed',
              sequence: 1,
              cell_id: 'c1',
              cells: { id: 'c1', name: 'Cell A', color: null, sequence: 1 },
              parts: { id: 'p1', job_id: 'job-1' },
            },
          ],
          error: null,
        }),
      }),
    }));
  });

  it('returns empty routings for empty jobIds array', () => {
    const { result } = renderHook(() => useMultipleJobsRouting([]));

    expect(result.current.routings).toEqual({});
  });

  it('fetches routings for multiple jobs', async () => {
    const { result } = renderHook(() => useMultipleJobsRouting(['job-1', 'job-2']));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('operations');
  });
});

describe('useAllCellsQRMMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'c1' }, { id: 'c2' }],
            error: null,
          }),
        }),
      }),
    }));

    mockRpc.mockResolvedValue({
      data: { wip_count: 5, wip_limit: 10 },
      error: null,
    });

    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  it('returns empty metrics when no tenantId', () => {
    const { result } = renderHook(() => useAllCellsQRMMetrics(null));

    expect(result.current.cellsMetrics).toEqual({});
  });

  it('fetches metrics for all active cells', async () => {
    const { result } = renderHook(() => useAllCellsQRMMetrics('tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('cells');
  });
});
