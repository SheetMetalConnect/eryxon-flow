import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    session: { access_token: 'test-token' },
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
  })),
}));

// Mock supabase
const mockChain: any = {};
const chainMethods = ['select', 'eq', 'single', 'update', 'from'];
for (const m of chainMethods) {
  mockChain[m] = vi.fn(() => mockChain);
}
mockChain.single = vi.fn(() => Promise.resolve({ data: { metadata: {} }, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

// Mock cadBackend config
vi.mock('@/config/cadBackend', () => ({
  getCADConfig: vi.fn(() => ({
    mode: 'custom',
    custom: { enabled: true, url: 'http://localhost:8888', apiKey: 'test-key', timeout: 5000 },
    byob: { enabled: false, url: '', apiKey: '', timeout: 5000, headers: {} },
    frontend: { enabled: true, wasmUrl: '', maxFileSize: 50000000 },
    features: { pmiExtraction: true, thumbnails: false, geometry: true },
  })),
  getActiveBackendUrl: vi.fn(() => 'http://localhost:8888'),
  getActiveApiKey: vi.fn(() => 'test-key'),
  getActiveTimeout: vi.fn(() => 5000),
  isBackendAvailable: vi.fn((mode: string) => mode === 'custom'),
  determineBestBackend: vi.fn(() => 'custom'),
  setCADBackendMode: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  useCADProcessing,
  isCADServiceEnabled,
  getBackendMode,
  decodeFloat32Array,
  decodeUint32Array,
} from './useCADProcessing';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useCADProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingError).toBeNull();
    expect(result.current.backendMode).toBe('custom');
    expect(result.current.isCADServiceEnabled).toBe(true);
    expect(typeof result.current.processCAD).toBe('function');
    expect(typeof result.current.processAndStore).toBe('function');
    expect(typeof result.current.storeProcessedData).toBe('function');
  });

  it('rejects unsupported file formats', async () => {
    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    let cadResult: any;
    await act(async () => {
      cadResult = await result.current.processCAD('http://example.com/file.pdf', 'file.pdf');
    });

    expect(cadResult.success).toBe(false);
    expect(cadResult.error).toContain('Unsupported file format');
  });

  it('processes supported file formats', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        geometry: { meshes: [], bounding_box: { min: [0, 0, 0], max: [1, 1, 1], center: [0.5, 0.5, 0.5], size: [1, 1, 1] }, total_vertices: 100, total_faces: 50 },
        pmi: null,
        thumbnail_base64: null,
        file_hash: 'abc123',
        processing_time_ms: 500,
      }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    let cadResult: any;
    await act(async () => {
      cadResult = await result.current.processCAD('http://example.com/part.step', 'part.step');
    });

    expect(cadResult.success).toBe(true);
    expect(cadResult.geometry.total_vertices).toBe(100);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8888/process',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        }),
      })
    );
  });

  it('handles HTTP errors from backend', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    let cadResult: any;
    await act(async () => {
      cadResult = await result.current.processCAD('http://example.com/part.step', 'part.step');
    });

    expect(cadResult.success).toBe(false);
    expect(cadResult.error).toContain('HTTP 500');
  });

  it('handles auth errors (401/403)', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
    } as any);

    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    let cadResult: any;
    await act(async () => {
      cadResult = await result.current.processCAD('http://example.com/part.stp', 'part.stp');
    });

    expect(cadResult.success).toBe(false);
    expect(cadResult.error).toContain('authentication failed');
  });

  it('returns error when mode is frontend (no backend URL)', async () => {
    const { getCADConfig, getActiveBackendUrl } = await import('@/config/cadBackend');
    vi.mocked(getCADConfig).mockReturnValueOnce({
      mode: 'frontend',
      custom: { enabled: false, url: '', apiKey: '', timeout: 5000 },
      byob: { enabled: false, url: '', apiKey: '', timeout: 5000 },
      frontend: { enabled: true, wasmUrl: '', maxFileSize: 50000000 },
      features: { pmiExtraction: true, thumbnails: false, geometry: true },
    });
    vi.mocked(getActiveBackendUrl).mockReturnValueOnce(null);

    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    let cadResult: any;
    await act(async () => {
      cadResult = await result.current.processCAD('http://example.com/part.step', 'part.step');
    });

    expect(cadResult.success).toBe(false);
    expect(cadResult.error).toContain('No server backend');
  });

  it('accepts all supported extensions', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true, geometry: null, pmi: null, thumbnail_base64: null, file_hash: null, processing_time_ms: 0 }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useCADProcessing(), {
      wrapper: createWrapper(),
    });

    const supportedExtensions = ['step', 'stp', 'iges', 'igs', 'brep'];
    for (const ext of supportedExtensions) {
      await act(async () => {
        const r = await result.current.processCAD(`http://example.com/file.${ext}`, `file.${ext}`);
        expect(r.success).toBe(true);
      });
    }
  });
});

describe('isCADServiceEnabled', () => {
  it('returns true when custom backend is available', () => {
    expect(isCADServiceEnabled()).toBe(true);
  });
});

describe('getBackendMode', () => {
  it('returns current backend mode', () => {
    expect(getBackendMode()).toBe('custom');
  });
});

describe('decodeFloat32Array', () => {
  it('decodes base64 to Float32Array', () => {
    // Create a Float32Array, encode to base64, then decode
    const original = new Float32Array([1.0, 2.0, 3.0]);
    const bytes = new Uint8Array(original.buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    const decoded = decodeFloat32Array(base64);
    expect(decoded.length).toBe(3);
    expect(decoded[0]).toBeCloseTo(1.0);
    expect(decoded[1]).toBeCloseTo(2.0);
    expect(decoded[2]).toBeCloseTo(3.0);
  });
});

describe('decodeUint32Array', () => {
  it('decodes base64 to Uint32Array', () => {
    const original = new Uint32Array([10, 20, 30]);
    const bytes = new Uint8Array(original.buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    const decoded = decodeUint32Array(base64);
    expect(decoded.length).toBe(3);
    expect(decoded[0]).toBe(10);
    expect(decoded[1]).toBe(20);
    expect(decoded[2]).toBe(30);
  });
});
