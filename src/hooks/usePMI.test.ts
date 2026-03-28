import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock session
vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    user: { id: 'user-1' },
    session: { access_token: 'test-token' },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Per-table response map
const tableResponses: Record<string, any> = {};

const createTableChain = (tableName: string) => {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'order', 'not', 'limit', 'update'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: any, reject: any) => {
    const resp = tableResponses[tableName] ?? { data: [], error: null };
    return Promise.resolve(resp).then(resolve, reject);
  };
  chain.single = vi.fn(() => Promise.resolve(tableResponses[tableName] ?? { data: null, error: null }));
  return chain;
};

const mockChannel = {
  on: vi.fn(() => mockChannel),
  subscribe: vi.fn(() => mockChannel),
  unsubscribe: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => createTableChain(table)),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

import { usePMI, usePMIExtraction, isPMIServiceEnabled } from './usePMI';
import type { PMIData, PMIMetadata } from './usePMI';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('isPMIServiceEnabled', () => {
  it('returns false when env var is not set', () => {
    // In test env, VITE_PMI_SERVICE_URL is not set
    expect(isPMIServiceEnabled()).toBe(false);
  });
});

describe('usePMI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in tableResponses) delete tableResponses[key];
  });

  it('returns null data when partId is undefined', async () => {
    const { result } = renderHook(() => usePMI(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.pmiData).toBeNull();
    expect(result.current.hasPMI).toBe(false);
    expect(result.current.pmiSummary).toBeNull();
  });

  it('fetches PMI metadata from parts table', async () => {
    const mockPMI: PMIData = {
      version: '1.0',
      dimensions: [
        {
          id: 'd-1',
          type: 'linear',
          value: 25.4,
          unit: 'mm',
          text: '25.4',
          position: { x: 0, y: 0, z: 0 },
          leader_points: [],
        },
      ],
      geometric_tolerances: [],
      datums: [{ id: 'dat-A', label: 'A', position: { x: 0, y: 0, z: 0 } }],
      surface_finishes: [],
      notes: [{ id: 'n-1', type: 'note', text: 'Deburr all edges', position: { x: 0, y: 0, z: 0 } }],
      graphical_pmi: [],
    };

    const mockMetadata: PMIMetadata = {
      pmi: mockPMI,
      pmi_status: 'complete',
      pmi_extracted_at: '2026-03-28T10:00:00Z',
      pmi_processing_time_ms: 1200,
    };

    tableResponses['parts'] = {
      data: { metadata: mockMetadata },
      error: null,
    };

    const { result } = renderHook(() => usePMI('part-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingPMI).toBe(false);
    });

    expect(result.current.pmiData).toEqual(mockPMI);
    expect(result.current.hasPMI).toBe(true);
    expect(result.current.pmiSummary).toEqual({
      dimensionCount: 1,
      toleranceCount: 0,
      datumCount: 1,
      surfaceFinishCount: 0,
      noteCount: 1,
      graphicalCount: 0,
      total: 3,
    });
    expect(result.current.pmiExtractedAt).toBe('2026-03-28T10:00:00Z');
    expect(result.current.pmiProcessingTime).toBe(1200);
  });

  it('returns hasPMI=false when PMI data has no items', async () => {
    const emptyPMI: PMIData = {
      version: '1.0',
      dimensions: [],
      geometric_tolerances: [],
      datums: [],
      surface_finishes: [],
      notes: [],
      graphical_pmi: [],
    };

    tableResponses['parts'] = {
      data: { metadata: { pmi: emptyPMI, pmi_status: 'complete' } },
      error: null,
    };

    const { result } = renderHook(() => usePMI('part-2'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingPMI).toBe(false);
    });

    expect(result.current.hasPMI).toBe(false);
    expect(result.current.pmiSummary?.total).toBe(0);
  });

  it('returns null metadata when part has no pmi in metadata', async () => {
    tableResponses['parts'] = {
      data: { metadata: null },
      error: null,
    };

    const { result } = renderHook(() => usePMI('part-3'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingPMI).toBe(false);
    });

    expect(result.current.pmiData).toBeNull();
    expect(result.current.hasPMI).toBe(false);
  });

  it('sets up realtime subscription when partId is provided', async () => {
    tableResponses['parts'] = {
      data: { metadata: null },
      error: null,
    };

    const { supabase } = await import('@/integrations/supabase/client');

    renderHook(() => usePMI('part-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith('pmi-status-part-1');
    });
  });

  it('extractPMIAsync returns error when service not configured', async () => {
    tableResponses['parts'] = {
      data: { metadata: null },
      error: null,
    };

    const { result } = renderHook(() => usePMI('part-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingPMI).toBe(false);
    });

    const res = await result.current.extractPMIAsync('https://example.com/file.step', 'part.step');
    expect(res.accepted).toBe(false);
    expect(res.error).toBe('PMI service not configured');
  });

  it('extractPMIAsync rejects non-STEP files (service check comes first)', async () => {
    tableResponses['parts'] = {
      data: { metadata: null },
      error: null,
    };

    const { result } = renderHook(() => usePMI('part-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingPMI).toBe(false);
    });

    // Service not configured takes precedence over file type check
    const res = await result.current.extractPMIAsync('https://example.com/file.stl', 'part.stl');
    expect(res.accepted).toBe(false);
    expect(res.error).toBe('PMI service not configured');
  });

  it('extractPMI returns error when service not configured', async () => {
    tableResponses['parts'] = {
      data: { metadata: null },
      error: null,
    };

    const { result } = renderHook(() => usePMI('part-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingPMI).toBe(false);
    });

    const res = await result.current.extractPMI('https://example.com/file.step', 'part.step');
    expect(res.success).toBe(false);
    expect(res.error).toBe('PMI service not configured');
  });
});

describe('usePMIExtraction', () => {
  it('returns isEnabled=false when service not configured', () => {
    const { result } = renderHook(() => usePMIExtraction());
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isExtracting).toBe(false);
    expect(result.current.extractionError).toBeNull();
  });

  it('extract returns error for non-STEP files', async () => {
    const { result } = renderHook(() => usePMIExtraction());

    const res = await result.current.extract('https://example.com/file.obj', 'model.obj');
    expect(res.success).toBe(false);
    expect(res.pmi).toBeNull();
  });

  it('extract returns error when service not configured', async () => {
    const { result } = renderHook(() => usePMIExtraction());

    const res = await result.current.extract('https://example.com/file.step', 'part.step');
    expect(res.success).toBe(false);
    expect(res.error).toBe('PMI service not configured');
  });
});
