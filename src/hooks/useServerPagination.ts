import { useState, useCallback, useMemo, useEffect } from "react";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  column: string | null;
  direction: "asc" | "desc";
}

export interface ServerPaginationOptions<T> {
  /** Initial page size */
  initialPageSize?: number;
  /** Initial page index (0-based) */
  initialPageIndex?: number;
  /** Initial sort column */
  initialSortColumn?: string | null;
  /** Initial sort direction */
  initialSortDirection?: "asc" | "desc";
  /** Total count of items (for calculating page count) */
  totalCount?: number;
  /** Callback when pagination changes */
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Callback when sorting changes */
  onSortingChange?: (sorting: SortingState) => void;
}

export interface ServerPaginationReturn {
  pagination: PaginationState;
  sorting: SortingState;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  setPageIndex: (index: number) => void;
  setPageSize: (size: number) => void;
  setSorting: (column: string | null, direction?: "asc" | "desc") => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  /** Range values for Supabase .range() query */
  range: { from: number; to: number };
  /** Get offset and limit for SQL-like queries */
  getOffsetLimit: () => { offset: number; limit: number };
}

/**
 * useServerPagination - Hook for managing server-side pagination state
 */
export function useServerPagination<T>({
  initialPageSize = 20,
  initialPageIndex = 0,
  initialSortColumn = null,
  initialSortDirection = "asc",
  totalCount = 0,
  onPaginationChange,
  onSortingChange,
}: ServerPaginationOptions<T> = {}): ServerPaginationReturn {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });

  const [sorting, setSortingState] = useState<SortingState>({
    column: initialSortColumn,
    direction: initialSortDirection,
  });

  const pageCount = useMemo(() => {
    return Math.ceil(totalCount / pagination.pageSize);
  }, [totalCount, pagination.pageSize]);

  const canPreviousPage = pagination.pageIndex > 0;
  const canNextPage = pagination.pageIndex < pageCount - 1;

  const range = useMemo(() => {
    const from = pagination.pageIndex * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    return { from, to };
  }, [pagination.pageIndex, pagination.pageSize]);

  const setPageIndex = useCallback(
    (index: number) => {
      const newPagination = { ...pagination, pageIndex: Math.max(0, index) };
      setPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    [pagination, onPaginationChange]
  );

  const setPageSize = useCallback(
    (size: number) => {
      const newPagination = { pageSize: size, pageIndex: 0 };
      setPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    [onPaginationChange]
  );

  const setSorting = useCallback(
    (column: string | null, direction: "asc" | "desc" = "asc") => {
      const newSorting = { column, direction };
      setSortingState(newSorting);
      // Reset to first page when sorting changes
      const newPagination = { ...pagination, pageIndex: 0 };
      setPagination(newPagination);
      onSortingChange?.(newSorting);
      onPaginationChange?.(newPagination);
    },
    [pagination, onSortingChange, onPaginationChange]
  );

  const nextPage = useCallback(() => {
    if (canNextPage) {
      setPageIndex(pagination.pageIndex + 1);
    }
  }, [canNextPage, pagination.pageIndex, setPageIndex]);

  const previousPage = useCallback(() => {
    if (canPreviousPage) {
      setPageIndex(pagination.pageIndex - 1);
    }
  }, [canPreviousPage, pagination.pageIndex, setPageIndex]);

  const firstPage = useCallback(() => {
    setPageIndex(0);
  }, [setPageIndex]);

  const lastPage = useCallback(() => {
    setPageIndex(pageCount - 1);
  }, [pageCount, setPageIndex]);

  const getOffsetLimit = useCallback(() => {
    return {
      offset: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    };
  }, [pagination]);

  return {
    pagination,
    sorting,
    pageCount,
    canPreviousPage,
    canNextPage,
    setPageIndex,
    setPageSize,
    setSorting,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    range,
    getOffsetLimit,
  };
}

export interface InfinitePaginationOptions {
  /** Page size for each fetch */
  pageSize?: number;
  /** Total count of items */
  totalCount?: number;
}

export interface InfinitePaginationReturn {
  /** Current page (0-based) */
  currentPage: number;
  /** Total pages */
  totalPages: number;
  /** Number of items loaded so far */
  loadedCount: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Load the next page */
  loadMore: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get ranges for all pages loaded so far */
  getRanges: () => Array<{ from: number; to: number }>;
  /** Get the range for the next page to load */
  getNextRange: () => { from: number; to: number } | null;
}

/**
 * useInfinitePagination - Hook for managing infinite scroll pagination state
 */
export function useInfinitePagination({
  pageSize = 20,
  totalCount = 0,
}: InfinitePaginationOptions = {}): InfinitePaginationReturn {
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedCount, setLoadedCount] = useState(pageSize);

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);

  const hasMore = currentPage < totalPages - 1 && loadedCount < totalCount;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
      setLoadedCount((prev) => Math.min(prev + pageSize, totalCount));
    }
  }, [hasMore, pageSize, totalCount]);

  const reset = useCallback(() => {
    setCurrentPage(0);
    setLoadedCount(pageSize);
  }, [pageSize]);

  const getRanges = useCallback(() => {
    const ranges: Array<{ from: number; to: number }> = [];
    for (let i = 0; i <= currentPage; i++) {
      const from = i * pageSize;
      const to = Math.min(from + pageSize - 1, totalCount - 1);
      ranges.push({ from, to });
    }
    return ranges;
  }, [currentPage, pageSize, totalCount]);

  const getNextRange = useCallback(() => {
    if (!hasMore) return null;
    const nextPage = currentPage + 1;
    const from = nextPage * pageSize;
    const to = Math.min(from + pageSize - 1, totalCount - 1);
    return { from, to };
  }, [currentPage, hasMore, pageSize, totalCount]);

  // Reset when totalCount changes significantly
  useEffect(() => {
    if (totalCount > 0 && loadedCount > totalCount) {
      setLoadedCount(Math.min(pageSize, totalCount));
      setCurrentPage(0);
    }
  }, [totalCount, loadedCount, pageSize]);

  return {
    currentPage,
    totalPages,
    loadedCount,
    hasMore,
    loadMore,
    reset,
    getRanges,
    getNextRange,
  };
}
