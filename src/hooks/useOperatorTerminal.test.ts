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

const mockUseOperator = vi.fn(() => ({ activeOperator: null }));
vi.mock('@/contexts/OperatorContext', () => ({
  useOperator: (...args: any[]) => mockUseOperator(...args),
}));

vi.mock('@/hooks/useCADProcessing', () => ({
  useCADProcessing: () => ({ processCAD: vi.fn() }),
  isCADServiceEnabled: () => false,
}));

const mockFetchOperationLookupDetails = vi.fn().mockResolvedValue([]);
const mockStartTimeTracking = vi.fn().mockResolvedValue(undefined);
const mockStartBatchTimeTracking = vi.fn().mockResolvedValue(undefined);
const mockStopTimeTracking = vi.fn().mockResolvedValue(undefined);
const mockStopBatchTimeTracking = vi.fn().mockResolvedValue(undefined);
const mockCompleteOperation = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/database', () => ({
  fetchOperationLookupDetails: (...args: any[]) => mockFetchOperationLookupDetails(...args),
  startTimeTracking: (...args: any[]) => mockStartTimeTracking(...args),
  startBatchTimeTracking: (...args: any[]) => mockStartBatchTimeTracking(...args),
  stopTimeTracking: (...args: any[]) => mockStopTimeTracking(...args),
  stopBatchTimeTracking: (...args: any[]) => mockStopBatchTimeTracking(...args),
  completeOperation: (...args: any[]) => mockCompleteOperation(...args),
}));

let cellsResponse: { data: any; error: any } = { data: [], error: null };
let tenantResponse: { data: any; error: any } = {
  data: {
    feature_flags: null,
    factory_opening_time: '07:00:00',
    factory_closing_time: '17:00:00',
    timezone: 'UTC',
  },
  error: null,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => Promise.resolve(table === 'cells' ? cellsResponse : tenantResponse);
      chain.single = () => Promise.resolve(tenantResponse);
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
  operation_type: 'cutting',
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
  operator_mode_summary: {
    active_mode: null,
    has_setup_history: false,
  },
  batch_context: null,
  ...overrides,
});

describe('useOperatorTerminal', () => {
  beforeEach(() => {
    mockFetchOperationLookupDetails.mockReset().mockResolvedValue([]);
    mockStartTimeTracking.mockReset().mockResolvedValue(undefined);
    mockStartBatchTimeTracking.mockReset().mockResolvedValue(undefined);
    mockStopTimeTracking.mockReset().mockResolvedValue(undefined);
    mockStopBatchTimeTracking.mockReset().mockResolvedValue(undefined);
    mockCompleteOperation.mockReset().mockResolvedValue(undefined);
    mockUseProfile.mockReturnValue(mockProfile as any);
    mockUseOperator.mockReturnValue({ activeOperator: null });
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    cellsResponse = { data: [], error: null };
    tenantResponse = {
      data: {
        feature_flags: null,
        factory_opening_time: '07:00:00',
        factory_closing_time: '17:00:00',
        timezone: 'UTC',
      },
      error: null,
    };
    localStorageMock.getItem.mockReturnValue(null);
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
    expect(mockFetchOperationLookupDetails).toHaveBeenCalledWith('tenant-1');
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

    mockFetchOperationLookupDetails.mockResolvedValue([mockOp]);
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
    expect(job.operationType).toBe('cutting');
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

    mockFetchOperationLookupDetails.mockResolvedValue([mockOp]);
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

    mockFetchOperationLookupDetails.mockResolvedValue([op1, op2]);
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
    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp()]);
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

    expect(mockStartTimeTracking).toHaveBeenCalledWith('op-1', 'user-1', 'tenant-1', undefined);
    expect(toast.success).toHaveBeenCalled();
  });

  it('blocks production start when setup is required but not yet recorded', async () => {
    tenantResponse = {
      data: {
        feature_flags: {
          operatorTerminalWorkModes: {
            enabled: true,
            enforceWorkingHours: false,
            setupPrepEnabled: true,
            setupRequired: true,
          },
        },
        factory_opening_time: '07:00:00',
        factory_closing_time: '17:00:00',
        timezone: 'UTC',
      },
      error: null,
    };
    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp()]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedTerminalMode('production');
      result.current.setSelectedJobId('op-1');
    });

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockStartTimeTracking).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('terminal.workModes.errors.setupRequired');
  });

  it('passes a setup mode note when setup prep starts', async () => {
    tenantResponse = {
      data: {
        feature_flags: {
          operatorTerminalWorkModes: {
            enabled: true,
            enforceWorkingHours: false,
            setupPrepEnabled: true,
            setupRequired: true,
          },
        },
        factory_opening_time: '07:00:00',
        factory_closing_time: '17:00:00',
        timezone: 'UTC',
      },
      error: null,
    };
    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp()]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedTerminalMode('setup');
      result.current.setSelectedJobId('op-1');
    });

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockStartTimeTracking).toHaveBeenCalledWith(
      'op-1',
      'user-1',
      'tenant-1',
      'operator-mode:setup',
    );
  });

  it('uses the active shared-terminal operator for persisted mode and time tracking', async () => {
    mockUseOperator.mockReturnValue({
      activeOperator: {
        id: 'operator-2',
        employee_id: 'EMP-002',
        full_name: 'Shared Operator',
        tenant_id: 'tenant-1',
      },
    });
    tenantResponse = {
      data: {
        feature_flags: {
          operatorTerminalWorkModes: {
            enabled: true,
            enforceWorkingHours: false,
            setupPrepEnabled: true,
            setupRequired: true,
          },
        },
        factory_opening_time: '07:00:00',
        factory_closing_time: '17:00:00',
        timezone: 'UTC',
      },
      error: null,
    };
    mockFetchOperationLookupDetails.mockResolvedValue([
      makeBaseOp({
        operator_mode_summary: {
          active_mode: null,
          has_setup_history: true,
        },
      }),
    ]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedTerminalMode('setup');
      result.current.setSelectedJobId('op-1');
    });

    await act(async () => {
      await result.current.handleStart();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'operator_terminal_mode:tenant-1:operator-2',
      'setup',
    );
    expect(mockStartTimeTracking).toHaveBeenCalledWith(
      'op-1',
      'operator-2',
      'tenant-1',
      'operator-mode:setup',
    );
  });

  it('restores terminal mode from operator-specific storage after an operator switch', async () => {
    const activeOperatorState = {
      activeOperator: {
        id: 'operator-1',
        employee_id: 'EMP-001',
        full_name: 'Operator One',
        tenant_id: 'tenant-1',
      },
    };
    mockUseOperator.mockImplementation(() => activeOperatorState);
    tenantResponse = {
      data: {
        feature_flags: {
          operatorTerminalWorkModes: {
            enabled: true,
            enforceWorkingHours: false,
            setupPrepEnabled: true,
            setupRequired: true,
          },
        },
        factory_opening_time: '07:00:00',
        factory_closing_time: '17:00:00',
        timezone: 'UTC',
      },
      error: null,
    };
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'operator_selected_cell') return null;
      if (key === 'operator_terminal_mode:tenant-1:operator-1') return 'setup';
      if (key === 'operator_terminal_mode:tenant-1:operator-2') return 'production';
      return null;
    });

    const { result, rerender } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    await waitFor(() => {
      expect(result.current.selectedTerminalMode).toBe('setup');
    });

    activeOperatorState.activeOperator = {
      id: 'operator-2',
      employee_id: 'EMP-002',
      full_name: 'Operator Two',
      tenant_id: 'tenant-1',
    };

    rerender();

    await act(async () => {
      await result.current.loadData();
    });

    await waitFor(() => {
      expect(result.current.selectedTerminalMode).toBe('production');
    });
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

    mockFetchOperationLookupDetails.mockResolvedValue([op]);
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
    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp()]);
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
    expect(mockFetchOperationLookupDetails).not.toHaveBeenCalled();
  });

  it('splits not_started jobs into inBuffer (first 5) and expected (rest)', async () => {
    const ops = Array.from({ length: 8 }, (_, i) =>
      makeBaseOp({ id: `op-${i}`, part: { ...makeBaseOp().part, id: `p-${i}` } }),
    );

    mockFetchOperationLookupDetails.mockResolvedValue(ops);
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
    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp()]);
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

  it('exposes batch prompt details for multi-operation batches', async () => {
    const batchContext = {
      batch_id: 'batch-1',
      batch_number: 'NEST-001',
      batch_type: 'laser_nesting',
      status: 'ready',
      operations_count: 2,
      material: 'Steel',
      nesting_metadata: null,
      sequence_in_batch: 1,
      parent_batch: {
        id: 'sheet-1',
        batch_number: 'SHEET-01',
        batch_type: 'general',
        status: 'ready',
      },
      members: [
        { operation_id: 'op-1', operation_name: 'Laser Cut', part_id: 'part-1', status: 'not_started', sequence_in_batch: 1 },
        { operation_id: 'op-2', operation_name: 'Laser Cut', part_id: 'part-2', status: 'not_started', sequence_in_batch: 2 },
      ],
    };

    mockFetchOperationLookupDetails.mockResolvedValue([
      makeBaseOp({ batch_context: batchContext }),
      makeBaseOp({
        id: 'op-2',
        part: { ...makeBaseOp().part, id: 'part-2' },
        batch_context: batchContext,
      }),
    ]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedJobId('op-1');
    });

    expect(result.current.selectedBatchPrompt).toMatchObject({
      batchId: 'batch-1',
      batchNumber: 'NEST-001',
      parentBatchNumber: 'SHEET-01',
      totalMembers: 2,
      isBatchActionAvailable: true,
      mode: null,
    });
  });

  it('requires a batch-flow choice before start', async () => {
    const batchContext = {
      batch_id: 'batch-1',
      batch_number: 'NEST-001',
      batch_type: 'laser_nesting',
      status: 'ready',
      operations_count: 2,
      material: 'Steel',
      nesting_metadata: null,
      sequence_in_batch: 1,
      parent_batch: null,
      members: [
        { operation_id: 'op-1', operation_name: 'Laser Cut', part_id: 'part-1', status: 'not_started', sequence_in_batch: 1 },
        { operation_id: 'op-2', operation_name: 'Laser Cut', part_id: 'part-2', status: 'not_started', sequence_in_batch: 2 },
      ],
    };

    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp({ batch_context: batchContext })]);
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

    expect(mockStartTimeTracking).not.toHaveBeenCalled();
    expect(mockStartBatchTimeTracking).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('terminal.batchFlow.chooseMode');
  });

  it('starts batch time tracking when full-batch mode is selected', async () => {
    const batchContext = {
      batch_id: 'batch-1',
      batch_number: 'NEST-001',
      batch_type: 'laser_nesting',
      status: 'ready',
      operations_count: 2,
      material: 'Steel',
      nesting_metadata: null,
      sequence_in_batch: 1,
      parent_batch: null,
      members: [
        { operation_id: 'op-1', operation_name: 'Laser Cut', part_id: 'part-1', status: 'not_started', sequence_in_batch: 1 },
        { operation_id: 'op-2', operation_name: 'Laser Cut', part_id: 'part-2', status: 'not_started', sequence_in_batch: 2 },
      ],
    };

    mockFetchOperationLookupDetails.mockResolvedValue([makeBaseOp({ batch_context: batchContext })]);
    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    act(() => {
      result.current.setSelectedJobId('op-1');
    });

    act(() => {
      result.current.selectBatchMode('batch');
    });

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockStartBatchTimeTracking).toHaveBeenCalledWith('batch-1', 'user-1', 'tenant-1');
    expect(mockStartTimeTracking).not.toHaveBeenCalled();
  });

  it('selects a matching operation from a scanned token', async () => {
    mockFetchOperationLookupDetails.mockResolvedValue([
      makeBaseOp({
        id: 'op-1',
        sequence: 7,
        operation_name: 'Laser Cut',
        part: {
          ...makeBaseOp().part,
          part_number: 'PART-001',
          drawing_no: 'DWG-100',
          job: { id: 'job-1', job_number: 'JOB-100', customer: null, due_date: null, due_date_override: null },
        },
      }),
    ]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    await act(async () => {
      await result.current.handleScannerToken('job-100:part-001:7');
    });

    expect(result.current.selectedJobId).toBe('op-1');
    expect(result.current.scanFeedback).toMatchObject({
      kind: 'success',
      operationId: 'op-1',
    });
  });

  it('fails closed when a scan token matches multiple operations', async () => {
    mockFetchOperationLookupDetails.mockResolvedValue([
      makeBaseOp({ id: 'op-1', part: { ...makeBaseOp().part, part_number: 'PART-001', id: 'part-1' } }),
      makeBaseOp({ id: 'op-2', part: { ...makeBaseOp().part, part_number: 'PART-001', id: 'part-2' } }),
    ]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    await act(async () => {
      await result.current.handleScannerToken('PART-001');
    });

    expect(result.current.selectedJobId).toBeNull();
    expect(result.current.scanFeedback).toMatchObject({
      kind: 'error',
      reason: 'duplicate_match',
      matchCount: 2,
    });
  });

  it('rejects completed operations during scan lookup', async () => {
    mockFetchOperationLookupDetails.mockResolvedValue([
      makeBaseOp({
        id: 'op-1',
        status: 'completed',
        part: {
          ...makeBaseOp().part,
          job: { id: 'job-1', job_number: 'JOB-100', customer: null, due_date: null, due_date_override: null },
        },
      }),
    ]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    await act(async () => {
      await result.current.handleScannerToken('JOB-100');
    });

    expect(result.current.selectedJobId).toBeNull();
    expect(result.current.scanFeedback).toMatchObject({
      kind: 'error',
      reason: 'closed',
    });
  });

  it('rejects operations already active by another operator', async () => {
    mockFetchOperationLookupDetails.mockResolvedValue([
      makeBaseOp({
        id: 'op-1',
        active_time_entry: {
          id: 'te-1',
          operator_id: 'user-2',
          start_time: '2026-03-28T08:00:00Z',
          operator: { full_name: 'Other Operator' },
        },
        part: {
          ...makeBaseOp().part,
          job: { id: 'job-1', job_number: 'JOB-100', customer: null, due_date: null, due_date_override: null },
        },
      }),
    ]);

    const { result } = renderHook(() => useOperatorTerminal());

    await act(async () => {
      await result.current.loadData();
    });

    await act(async () => {
      await result.current.handleScannerToken('JOB-100');
    });

    expect(result.current.selectedJobId).toBeNull();
    expect(result.current.scanFeedback).toMatchObject({
      kind: 'error',
      reason: 'active_by_other_operator',
      activeOperatorName: 'Other Operator',
    });
  });
});
