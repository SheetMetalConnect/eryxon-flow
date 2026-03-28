import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock profile
const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  active: true,
  is_machine: false,
  is_root_admin: false,
};

const mockUseProfile = vi.fn(() => mockProfile as any);
vi.mock('@/hooks/useProfile', () => ({
  useProfile: (...args: any[]) => mockUseProfile(...args),
}));

vi.mock('@/contexts/OperatorContext', () => ({
  useOperator: () => ({ activeOperator: null }),
}));

vi.mock('@/hooks/useCADProcessing', () => ({
  useCADProcessing: () => ({ processCAD: vi.fn() }),
  isCADServiceEnabled: () => false,
}));

const mockFetchOperationsWithDetails = vi.fn().mockResolvedValue([]);
const mockStartTimeTracking = vi.fn().mockResolvedValue(undefined);
const mockStopTimeTracking = vi.fn().mockResolvedValue(undefined);
const mockCompleteOperation = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/database', () => ({
  fetchOperationsWithDetails: (...args: any[]) => mockFetchOperationsWithDetails(...args),
  startTimeTracking: (...args: any[]) => mockStartTimeTracking(...args),
  stopTimeTracking: (...args: any[]) => mockStopTimeTracking(...args),
  completeOperation: (...args: any[]) => mockCompleteOperation(...args),
}));

let cellsResponse: { data: any; error: any } = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => Promise.resolve(cellsResponse);
      return chain;
    },
    channel: () => {
      const ch: any = {};
      ch.on = () => ch;
      ch.subscribe = () => ch;
      return ch;
    },
    removeChannel: () => {},
    storage: {
      from: () => ({
        createSignedUrl: () => Promise.resolve({ data: null }),
      }),
    },
  },
}));

// Stable t function reference to prevent infinite useEffect loops
const stableT = (key: string) => key;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { useOperatorTerminal } from './useOperatorTerminal';
import { toast } from 'sonner';

const makeBaseOp = (overrides: Record<string, any> = {}) => ({
  id: 'op-1',
  operation_name: 'Op',
  sequence: 1,
  estimated_time: 1,
  actual_time: 0,
  status: 'not_started' as const,
  completion_percentage: 0,
  notes: null,
  assigned_operator_id: null,
  cell_id: 'cell-1',
  planned_start: null,
  part: {
    id: 'part-1',
    part_number: 'P',
    material: '',
    quantity: 1,
    parent_part_id: null,
    file_paths: null,
    image_paths: null,
    drawing_no: null,
    cnc_program_name: null,
    is_bullet_card: null,
    job: { id: 'j-1', job_number: 'J', customer: null, due_date: null, due_date_override: null },
  },
  cell: { id: 'cell-1', name: 'Cell', color: null, sequence: 1 },
  active_time_entry: undefined,
  ...overrides,
});

describe('useOperatorTerminal', () => {
  beforeEach(() => {
    mockFetchOperationsWithDetails.mockReset().mockResolvedValue([]);
    mockStartTimeTracking.mockReset().mockResolvedValue(undefined);
    mockStopTimeTracking.mockReset().mockResolvedValue(undefined);
    mockCompleteOperation.mockReset().mockResolvedValue(undefined);
    mockUseProfile.mockReturnValue(mockProfile as any);
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    cellsResponse = { data: [], error: null };
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useOperatorTerminal());
    expect(result.current.loading).toBe(true);
  });

  it('exposes loadData function that fetches operations and cells', async () => {
    // Render without waiting for initial load
    const { result } = renderHook(() => useOperatorTerminal());

    // Call loadData explicitly
    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.loading).toBe(false);
    expect(mockFetchOperationsWithDetails).toHaveBeenCalledWith('tenant-1');
  });

  it('returns empty job lists when no operations loaded', async () => {
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.filteredJobs).toEqual([]);
    expect(result.current.inProcessJobs).toEqual([]);
    expect(result.current.inBufferJobs).toEqual([]);
    expect(result.current.expectedJobs).toEqual([]);
  });

  it('maps operations to terminal jobs correctly', async () => {
    const mockOp = makeBaseOp({
      id: 'op-1',
      operation_name: 'Laser Cut',
      estimated_time: 10,
      actual_time: 3,
      planned_start: '2026-04-01',
      part: {
        id: 'part-1',
        part_number: 'P-001',
        material: 'Steel',
        quantity: 5,
        parent_part_id: null,
        file_paths: ['drawing.pdf', 'model.step'],
        image_paths: null,
        drawing_no: 'DWG-001',
        cnc_program_name: null,
        is_bullet_card: false,
        job: { id: 'job-1', job_number: 'J-001', customer: 'Customer A', due_date: '2026-05-01', due_date_override: null },
      },
      cell: { id: 'cell-1', name: 'Laser Cell', color: '#ff0000', sequence: 1 },
    });

    mockFetchOperationsWithDetails.mockResolvedValue([mockOp]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.filteredJobs).toHaveLength(1);

    const job = result.current.filteredJobs[0];
    expect(job.id).toBe('op-1');
    expect(job.jobCode).toBe('J-001');
    expect(job.description).toBe('P-001');
    expect(job.material).toBe('Steel');
    expect(job.quantity).toBe(5);
    expect(job.currentOp).toBe('Laser Cut');
    expect(job.hasPdf).toBe(true);
    expect(job.hasModel).toBe(true);
    expect(job.status).toBe('in_buffer');
    expect(job.hours).toBe(7);
    expect(job.cellName).toBe('Laser Cell');
    expect(job.cellColor).toBe('#ff0000');
    expect(job.drawingNo).toBe('DWG-001');
    expect(job.plannedStart).toBe('2026-04-01');
  });

  it('sets in_progress status when active_time_entry exists', async () => {
    const mockOp = makeBaseOp({
      active_time_entry: {
        id: 'te-1',
        operator_id: 'user-1',
        start_time: '2026-03-28T08:00:00Z',
        operator: { full_name: 'Test User' },
      },
    });

    mockFetchOperationsWithDetails.mockResolvedValue([mockOp]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.filteredJobs[0].status).toBe('in_progress');
    expect(result.current.filteredJobs[0].isCurrentUserClocked).toBe(true);
    expect(result.current.filteredJobs[0].activeOperatorName).toBe('Test User');
  });

  it('handles cell change and saves to localStorage', async () => {
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.handleCellChange('cell-1');
    });

    expect(result.current.selectedCellId).toBe('cell-1');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('operator_selected_cell', 'cell-1');
  });

  it('filters jobs by selected cell', async () => {
    const op1 = makeBaseOp({ id: 'op-1', cell_id: 'cell-1', cell: { id: 'cell-1', name: 'C1', color: null, sequence: 1 }, part: { ...makeBaseOp().part, id: 'p1' } });
    const op2 = makeBaseOp({ id: 'op-2', cell_id: 'cell-2', cell: { id: 'cell-2', name: 'C2', color: null, sequence: 2 }, part: { ...makeBaseOp().part, id: 'p2' } });

    mockFetchOperationsWithDetails.mockResolvedValue([op1, op2]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.filteredJobs).toHaveLength(2);

    act(() => {
      result.current.handleCellChange('cell-1');
    });

    expect(result.current.filteredJobs).toHaveLength(1);
    expect(result.current.filteredJobs[0].cellId).toBe('cell-1');
  });

  it('handleStart calls startTimeTracking', async () => {
    mockFetchOperationsWithDetails.mockResolvedValue([makeBaseOp()]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedJobId('op-1');
    });

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockStartTimeTracking).toHaveBeenCalledWith('op-1', 'user-1', 'tenant-1');
    expect(toast.success).toHaveBeenCalled();
  });

  it('handlePause calls stopTimeTracking', async () => {
    const op = makeBaseOp({
      status: 'in_progress',
      active_time_entry: {
        id: 'te-1',
        operator_id: 'user-1',
        start_time: '2026-03-28T08:00:00Z',
        operator: { full_name: 'Test User' },
      },
    });

    mockFetchOperationsWithDetails.mockResolvedValue([op]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedJobId('op-1');
    });

    await act(async () => {
      await result.current.handlePause();
    });

    expect(mockStopTimeTracking).toHaveBeenCalledWith('op-1', 'user-1');
  });

  it('handleComplete calls completeOperation and clears selection', async () => {
    mockFetchOperationsWithDetails.mockResolvedValue([makeBaseOp()]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedJobId('op-1');
    });

    expect(result.current.selectedJob).not.toBeNull();

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockCompleteOperation).toHaveBeenCalledWith('op-1', 'tenant-1', 'user-1');
    expect(result.current.selectedJobId).toBeNull();
  });

  it('does not load data when no tenant_id', async () => {
    mockUseProfile.mockReturnValue(null);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    // loadData returns early when no tenant_id
    expect(mockFetchOperationsWithDetails).not.toHaveBeenCalled();
  });

  it('splits not_started jobs into inBuffer (first 5) and expected (rest)', async () => {
    const ops = Array.from({ length: 8 }, (_, i) =>
      makeBaseOp({ id: `op-${i}`, part: { ...makeBaseOp().part, id: `p-${i}` } }),
    );

    mockFetchOperationsWithDetails.mockResolvedValue(ops);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.inBufferJobs).toHaveLength(5);
    expect(result.current.expectedJobs).toHaveLength(3);
    expect(result.current.inBufferJobs.every(j => j.status === 'in_buffer')).toBe(true);
    expect(result.current.expectedJobs.every(j => j.status === 'expected')).toBe(true);
  });

  it('shows error toast when startTimeTracking fails', async () => {
    mockFetchOperationsWithDetails.mockResolvedValue([makeBaseOp()]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    mockStartTimeTracking.mockRejectedValueOnce(new Error('Already clocked'));

    act(() => {
      result.current.setSelectedJobId('op-1');
    });

    await act(async () => {
      await result.current.handleStart();
    });

    expect(toast.error).toHaveBeenCalledWith('Already clocked');
  });
});
