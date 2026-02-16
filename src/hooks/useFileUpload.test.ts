import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileUpload } from './useFileUpload';

// Mock dependencies
const mockRpc = vi.fn();
const mockStorageFrom = vi.fn();
const mockRemove = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    storage: {
      from: () => mockStorageFrom(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', tenant_id: 'tenant-1' },
    session: { user: { id: 'user-1' } },
  }),
}));

vi.mock('@/lib/upload-with-progress', () => ({
  uploadFileWithProgress: vi.fn().mockResolvedValue({ error: null }),
}));

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock storage quota RPC
    mockRpc.mockImplementation((funcName: string) => {
      if (funcName === 'get_storage_quota') {
        return Promise.resolve({
          data: [{
            current_mb: 50,
            max_mb: 1000,
            remaining_mb: 950,
            used_percentage: 5,
            is_unlimited: false,
          }],
          error: null,
        });
      }
      if (funcName === 'can_upload_file') {
        return Promise.resolve({
          data: [{ allowed: true, reason: '' }],
          error: null,
        });
      }
      if (funcName === 'update_tenant_storage_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockStorageFrom.mockReturnValue({
      remove: mockRemove.mockResolvedValue({ error: null }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toEqual([]);
    expect(result.current.storageQuota).toBeNull();
  });

  it('provides uploadFiles function', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(typeof result.current.uploadFiles).toBe('function');
  });

  it('provides deleteFile function', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(typeof result.current.deleteFile).toBe('function');
  });

  it('provides fetchStorageQuota function', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(typeof result.current.fetchStorageQuota).toBe('function');
  });

  it('provides checkUploadQuota function', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(typeof result.current.checkUploadQuota).toBe('function');
  });

  it('provides resetProgress function', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(typeof result.current.resetProgress).toBe('function');
  });

  it('fetchStorageQuota fetches and returns quota', async () => {
    const { result } = renderHook(() => useFileUpload());

    let quota: any;
    await act(async () => {
      quota = await result.current.fetchStorageQuota();
    });

    expect(mockRpc).toHaveBeenCalledWith('get_storage_quota');
    expect(quota).toEqual({
      currentMB: 50,
      maxMB: 1000,
      remainingMB: 950,
      usedPercentage: 5,
      isUnlimited: false,
    });
  });

  it('fetchStorageQuota handles error', async () => {
    mockRpc.mockImplementation((funcName: string) => {
      if (funcName === 'get_storage_quota') {
        return Promise.resolve({
          data: null,
          error: new Error('RPC error'),
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFileUpload());

    let quota: any;
    await act(async () => {
      quota = await result.current.fetchStorageQuota();
    });

    expect(quota).toBeNull();
    consoleSpy.mockRestore();
  });

  it('checkUploadQuota checks if file can be uploaded', async () => {
    const { result } = renderHook(() => useFileUpload());

    let checkResult: any;
    await act(async () => {
      checkResult = await result.current.checkUploadQuota(1000000);
    });

    expect(mockRpc).toHaveBeenCalledWith('can_upload_file', {
      p_tenant_id: 'tenant-1',
      p_file_size_bytes: 1000000,
    });
    expect(checkResult.allowed).toBe(true);
  });

  it('checkUploadQuota returns not allowed when quota exceeded', async () => {
    mockRpc.mockImplementation((funcName: string) => {
      if (funcName === 'can_upload_file') {
        return Promise.resolve({
          data: [{ allowed: false, reason: 'Storage quota exceeded' }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useFileUpload());

    let checkResult: any;
    await act(async () => {
      checkResult = await result.current.checkUploadQuota(1000000000);
    });

    expect(checkResult.allowed).toBe(false);
    expect(checkResult.reason).toBe('Storage quota exceeded');
  });

  it('deleteFile removes file from storage', async () => {
    const { result } = renderHook(() => useFileUpload());

    let deleteResult: any;
    await act(async () => {
      deleteResult = await result.current.deleteFile('test-bucket', 'test/path.pdf', 5000);
    });

    expect(mockRemove).toHaveBeenCalledWith(['test/path.pdf']);
    expect(deleteResult.success).toBe(true);
  });

  it('deleteFile handles error', async () => {
    mockStorageFrom.mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFileUpload());

    let deleteResult: any;
    await act(async () => {
      deleteResult = await result.current.deleteFile('test-bucket', 'test/path.pdf');
    });

    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toBeTruthy();
    consoleSpy.mockRestore();
  });

  it('resetProgress clears progress array', async () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.progress).toEqual([]);
  });
});
