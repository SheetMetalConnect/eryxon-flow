import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerPagination, useInfinitePagination } from './useServerPagination';

describe('useServerPagination', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useServerPagination());

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 20,
    });
    expect(result.current.sorting).toEqual({
      column: null,
      direction: 'asc',
    });
  });

  it('initializes with custom values', () => {
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageSize: 50,
        initialPageIndex: 2,
        initialSortColumn: 'name',
        initialSortDirection: 'desc',
        totalCount: 100,
      })
    );

    expect(result.current.pagination.pageSize).toBe(50);
    expect(result.current.pagination.pageIndex).toBe(2);
    expect(result.current.sorting.column).toBe('name');
    expect(result.current.sorting.direction).toBe('desc');
  });

  it('calculates page count correctly', () => {
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageSize: 10,
        totalCount: 45,
      })
    );

    expect(result.current.pageCount).toBe(5);
  });

  it('calculates range correctly', () => {
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageSize: 20,
        initialPageIndex: 2,
      })
    );

    expect(result.current.range).toEqual({ from: 40, to: 59 });
  });

  it('setPageIndex updates pagination', () => {
    const onPaginationChange = vi.fn();
    const { result } = renderHook(() =>
      useServerPagination({ onPaginationChange })
    );

    act(() => {
      result.current.setPageIndex(3);
    });

    expect(result.current.pagination.pageIndex).toBe(3);
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 3,
      pageSize: 20,
    });
  });

  it('setPageIndex clamps to 0', () => {
    const { result } = renderHook(() => useServerPagination());

    act(() => {
      result.current.setPageIndex(-5);
    });

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it('setPageSize resets to first page', () => {
    const onPaginationChange = vi.fn();
    const { result } = renderHook(() =>
      useServerPagination({ initialPageIndex: 5, onPaginationChange })
    );

    act(() => {
      result.current.setPageSize(50);
    });

    expect(result.current.pagination.pageIndex).toBe(0);
    expect(result.current.pagination.pageSize).toBe(50);
  });

  it('setSorting resets to first page', () => {
    const onSortingChange = vi.fn();
    const onPaginationChange = vi.fn();
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageIndex: 3,
        onSortingChange,
        onPaginationChange,
      })
    );

    act(() => {
      result.current.setSorting('name', 'desc');
    });

    expect(result.current.sorting).toEqual({ column: 'name', direction: 'desc' });
    expect(result.current.pagination.pageIndex).toBe(0);
    expect(onSortingChange).toHaveBeenCalled();
    expect(onPaginationChange).toHaveBeenCalled();
  });

  it('nextPage increments page index', () => {
    const { result } = renderHook(() =>
      useServerPagination({ totalCount: 100 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.pagination.pageIndex).toBe(1);
  });

  it('nextPage does nothing at last page', () => {
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageIndex: 4,
        initialPageSize: 20,
        totalCount: 100, // 5 pages total (0-4)
      })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.pagination.pageIndex).toBe(4);
  });

  it('previousPage decrements page index', () => {
    const { result } = renderHook(() =>
      useServerPagination({ initialPageIndex: 3 })
    );

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.pagination.pageIndex).toBe(2);
  });

  it('previousPage does nothing at first page', () => {
    const { result } = renderHook(() => useServerPagination());

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it('firstPage navigates to page 0', () => {
    const { result } = renderHook(() =>
      useServerPagination({ initialPageIndex: 5 })
    );

    act(() => {
      result.current.firstPage();
    });

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it('lastPage navigates to last page', () => {
    const { result } = renderHook(() =>
      useServerPagination({ totalCount: 100, initialPageSize: 20 })
    );

    act(() => {
      result.current.lastPage();
    });

    expect(result.current.pagination.pageIndex).toBe(4);
  });

  it('canPreviousPage is false on first page', () => {
    const { result } = renderHook(() => useServerPagination());

    expect(result.current.canPreviousPage).toBe(false);
  });

  it('canPreviousPage is true when not on first page', () => {
    const { result } = renderHook(() =>
      useServerPagination({ initialPageIndex: 2 })
    );

    expect(result.current.canPreviousPage).toBe(true);
  });

  it('canNextPage is true when more pages exist', () => {
    const { result } = renderHook(() =>
      useServerPagination({ totalCount: 100 })
    );

    expect(result.current.canNextPage).toBe(true);
  });

  it('canNextPage is false on last page', () => {
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageIndex: 4,
        totalCount: 100,
        initialPageSize: 20,
      })
    );

    expect(result.current.canNextPage).toBe(false);
  });

  it('getOffsetLimit returns correct values', () => {
    const { result } = renderHook(() =>
      useServerPagination({
        initialPageIndex: 2,
        initialPageSize: 25,
      })
    );

    expect(result.current.getOffsetLimit()).toEqual({
      offset: 50,
      limit: 25,
    });
  });
});

describe('useInfinitePagination', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useInfinitePagination());

    expect(result.current.currentPage).toBe(0);
    expect(result.current.loadedCount).toBe(20);
  });

  it('calculates totalPages correctly', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 100, pageSize: 20 })
    );

    expect(result.current.totalPages).toBe(5);
  });

  it('hasMore is true when more pages exist', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 100, pageSize: 20 })
    );

    expect(result.current.hasMore).toBe(true);
  });

  it('hasMore is false when all items loaded', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 15, pageSize: 20 })
    );

    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore increments page and loaded count', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 100, pageSize: 20 })
    );

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.loadedCount).toBe(40);
  });

  it('loadMore does nothing when no more items', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 15, pageSize: 20 })
    );

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.currentPage).toBe(0);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 100, pageSize: 20 })
    );

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });

    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentPage).toBe(0);
    expect(result.current.loadedCount).toBe(20);
  });

  it('getRanges returns all loaded ranges', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 100, pageSize: 20 })
    );

    act(() => {
      result.current.loadMore();
    });

    const ranges = result.current.getRanges();
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({ from: 0, to: 19 });
    expect(ranges[1]).toEqual({ from: 20, to: 39 });
  });

  it('getNextRange returns next page range', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 100, pageSize: 20 })
    );

    const nextRange = result.current.getNextRange();
    expect(nextRange).toEqual({ from: 20, to: 39 });
  });

  it('getNextRange returns null when no more pages', () => {
    const { result } = renderHook(() =>
      useInfinitePagination({ totalCount: 15, pageSize: 20 })
    );

    expect(result.current.getNextRange()).toBeNull();
  });
});
