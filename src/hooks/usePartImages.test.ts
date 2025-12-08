import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePartImages } from './usePartImages';

// Mock Supabase
const mockFrom = vi.fn();
const mockStorage = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    storage: {
      from: (...args: any[]) => mockStorage(...args),
    },
  },
}));

// Mock toast and i18n
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('usePartImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock select().eq().single()
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { image_paths: ['path1.jpg', 'path2.jpg'] },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    }));

    // Mock storage operations
    mockStorage.mockImplementation(() => ({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({
        error: null,
      }),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state and functions', () => {
    const { result } = renderHook(() => usePartImages('part-1'));

    expect(result.current.loading).toBe(false);
    expect(typeof result.current.getImagePaths).toBe('function');
    expect(typeof result.current.loadImages).toBe('function');
    expect(typeof result.current.addImages).toBe('function');
    expect(typeof result.current.removeImage).toBe('function');
    expect(typeof result.current.getFirstImageUrl).toBe('function');
  });

  it('getImagePaths fetches image paths from database', async () => {
    const { result } = renderHook(() => usePartImages('part-1'));

    let paths: string[] = [];
    await act(async () => {
      paths = await result.current.getImagePaths();
    });

    expect(paths).toEqual(['path1.jpg', 'path2.jpg']);
    expect(mockFrom).toHaveBeenCalledWith('parts');
  });

  it('getImagePaths returns empty array on error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Fetch error'),
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => usePartImages('part-1'));

    let paths: string[] = [];
    await act(async () => {
      paths = await result.current.getImagePaths();
    });

    expect(paths).toEqual([]);
  });

  it('loadImages returns image info with signed URLs', async () => {
    const { result } = renderHook(() => usePartImages('part-1'));

    let images: any[] = [];
    await act(async () => {
      images = await result.current.loadImages(['path1.jpg', 'path2.jpg']);
    });

    expect(images).toHaveLength(2);
    expect(images[0].path).toBe('path1.jpg');
    expect(images[0].url).toBe('https://example.com/signed-url');
  });

  it('loadImages returns empty array for empty input', async () => {
    const { result } = renderHook(() => usePartImages('part-1'));

    let images: any[] = [];
    await act(async () => {
      images = await result.current.loadImages([]);
    });

    expect(images).toEqual([]);
  });

  it('addImages updates part with new paths', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { image_paths: ['existing.jpg'] },
            error: null,
          }),
        }),
      }),
      update: updateMock,
    }));

    const { result } = renderHook(() => usePartImages('part-1'));

    let success: boolean = false;
    await act(async () => {
      success = await result.current.addImages(['new.jpg']);
    });

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      image_paths: ['existing.jpg', 'new.jpg'],
    });
  });

  it('removeImage deletes from storage and updates part', async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockStorage.mockImplementation(() => ({
      remove: removeMock,
    }));

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { image_paths: ['path1.jpg', 'path2.jpg'] },
            error: null,
          }),
        }),
      }),
      update: updateMock,
    }));

    const { result } = renderHook(() => usePartImages('part-1'));

    let success: boolean = false;
    await act(async () => {
      success = await result.current.removeImage('path1.jpg');
    });

    expect(success).toBe(true);
    expect(removeMock).toHaveBeenCalledWith(['path1.jpg']);
    expect(updateMock).toHaveBeenCalledWith({
      image_paths: ['path2.jpg'],
    });
  });

  it('getFirstImageUrl returns URL for first image', async () => {
    const { result } = renderHook(() => usePartImages('part-1'));

    let url: string | null = null;
    await act(async () => {
      url = await result.current.getFirstImageUrl();
    });

    expect(url).toBe('https://example.com/signed-url');
  });

  it('getFirstImageUrl returns null when no images', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { image_paths: [] },
            error: null,
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => usePartImages('part-1'));

    let url: string | null = null;
    await act(async () => {
      url = await result.current.getFirstImageUrl();
    });

    expect(url).toBeNull();
  });
});
