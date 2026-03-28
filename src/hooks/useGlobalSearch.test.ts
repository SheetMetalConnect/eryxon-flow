import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

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

// Mock search module
const mockJobSearch = vi.fn().mockResolvedValue([]);
const mockPartSearch = vi.fn().mockResolvedValue([]);
const mockOperationSearch = vi.fn().mockResolvedValue([]);
const mockUserSearch = vi.fn().mockResolvedValue([]);
const mockIssueSearch = vi.fn().mockResolvedValue([]);
const mockResourceSearch = vi.fn().mockResolvedValue([]);
const mockMaterialSearch = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/search', () => ({
  searchConfigs: [],
  createSearchFunctions: () => ({
    job: (...args: any[]) => mockJobSearch(...args),
    part: (...args: any[]) => mockPartSearch(...args),
    operation: (...args: any[]) => mockOperationSearch(...args),
    user: (...args: any[]) => mockUserSearch(...args),
    issue: (...args: any[]) => mockIssueSearch(...args),
    resource: (...args: any[]) => mockResourceSearch(...args),
    material: (...args: any[]) => mockMaterialSearch(...args),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useGlobalSearch } from './useGlobalSearch';

describe('useGlobalSearch', () => {
  beforeEach(() => {
    mockJobSearch.mockReset().mockResolvedValue([]);
    mockPartSearch.mockReset().mockResolvedValue([]);
    mockOperationSearch.mockReset().mockResolvedValue([]);
    mockUserSearch.mockReset().mockResolvedValue([]);
    mockIssueSearch.mockReset().mockResolvedValue([]);
    mockResourceSearch.mockReset().mockResolvedValue([]);
    mockMaterialSearch.mockReset().mockResolvedValue([]);
    mockUseProfile.mockReturnValue(mockProfile as any);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useGlobalSearch());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.search).toBe('function');
  });

  it('returns empty results for empty query', async () => {
    const { result } = renderHook(() => useGlobalSearch());

    let results: any[];
    await act(async () => {
      results = await result.current.search('');
    });

    expect(results!).toEqual([]);
    expect(mockJobSearch).not.toHaveBeenCalled();
  });

  it('returns empty results for whitespace-only query', async () => {
    const { result } = renderHook(() => useGlobalSearch());

    let results: any[];
    await act(async () => {
      results = await result.current.search('   ');
    });

    expect(results!).toEqual([]);
  });

  it('returns empty results when no tenant_id', async () => {
    mockUseProfile.mockReturnValue(null);

    const { result } = renderHook(() => useGlobalSearch());

    let results: any[];
    await act(async () => {
      results = await result.current.search('test');
    });

    expect(results!).toEqual([]);
  });

  it('searches all types by default', async () => {
    const { result } = renderHook(() => useGlobalSearch());

    await act(async () => {
      await result.current.search('steel');
    });

    expect(mockJobSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
    expect(mockPartSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
    expect(mockOperationSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
    expect(mockUserSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
    expect(mockIssueSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
    expect(mockResourceSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
    expect(mockMaterialSearch).toHaveBeenCalledWith('steel', 'tenant-1', 10);
  });

  it('filters by specific types when provided', async () => {
    const { result } = renderHook(() => useGlobalSearch());

    await act(async () => {
      await result.current.search('laser', { types: ['job', 'part'] });
    });

    expect(mockJobSearch).toHaveBeenCalled();
    expect(mockPartSearch).toHaveBeenCalled();
    expect(mockOperationSearch).not.toHaveBeenCalled();
    expect(mockUserSearch).not.toHaveBeenCalled();
  });

  it('uses custom limit when provided', async () => {
    const { result } = renderHook(() => useGlobalSearch());

    await act(async () => {
      await result.current.search('test', { limit: 5, types: ['job'] });
    });

    expect(mockJobSearch).toHaveBeenCalledWith('test', 'tenant-1', 5);
  });

  it('returns combined results from multiple search types', async () => {
    const jobResults = [
      { id: 'j-1', type: 'job' as const, title: 'Job 1', subtitle: null, path: '/jobs/j-1' },
    ];
    const partResults = [
      { id: 'p-1', type: 'part' as const, title: 'Part 1', subtitle: null, path: '/parts/p-1' },
    ];

    mockJobSearch.mockResolvedValue(jobResults);
    mockPartSearch.mockResolvedValue(partResults);

    const { result } = renderHook(() => useGlobalSearch());

    let results: any[];
    await act(async () => {
      results = await result.current.search('query', { types: ['job', 'part'] });
    });

    expect(results!).toHaveLength(2);
    expect(results!).toEqual(expect.arrayContaining([...jobResults, ...partResults]));
  });

  it('filters results by status when statuses filter provided', async () => {
    const jobResults = [
      { id: 'j-1', type: 'job' as const, title: 'Job 1', subtitle: null, path: '/jobs/j-1', status: 'active' },
      { id: 'j-2', type: 'job' as const, title: 'Job 2', subtitle: null, path: '/jobs/j-2', status: 'completed' },
    ];

    mockJobSearch.mockResolvedValue(jobResults);

    const { result } = renderHook(() => useGlobalSearch());

    let results: any[];
    await act(async () => {
      results = await result.current.search('test', {
        types: ['job'],
        statuses: ['active'],
      });
    });

    expect(results!).toHaveLength(1);
    expect(results![0].status).toBe('active');
  });

  it('sets loading true during search and false after', async () => {
    let resolveSearch: (v: any) => void;
    mockJobSearch.mockReturnValue(new Promise((r) => { resolveSearch = r; }));

    const { result } = renderHook(() => useGlobalSearch());

    expect(result.current.loading).toBe(false);

    let searchPromise: Promise<any>;
    act(() => {
      searchPromise = result.current.search('test', { types: ['job'] });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSearch!([]);
      await searchPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('sets error when search fails', async () => {
    mockJobSearch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGlobalSearch());

    let results: any[];
    await act(async () => {
      results = await result.current.search('test', { types: ['job'] });
    });

    expect(results!).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('clears previous error on new search', async () => {
    mockJobSearch.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useGlobalSearch());

    await act(async () => {
      await result.current.search('test', { types: ['job'] });
    });

    expect(result.current.error).not.toBeNull();

    mockJobSearch.mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.search('test2', { types: ['job'] });
    });

    expect(result.current.error).toBeNull();
  });
});
