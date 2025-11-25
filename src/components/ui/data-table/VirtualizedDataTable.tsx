"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  Row,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableToolbar } from "./DataTableToolbar";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2 } from "lucide-react";

// Global filter function for searching across all columns
const globalFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const search = filterValue.toLowerCase();

  // Search through all column values
  const rowValues = row.getAllCells().map((cell) => {
    const value = cell.getValue();
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });

  return rowValues.some((value) => value.toLowerCase().includes(search));
};

export interface VirtualizedDataTableFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface VirtualizedDataTableFilterableColumn {
  id: string;
  title: string;
  options: VirtualizedDataTableFilterOption[];
}

export interface VirtualizedDataTableSearchableColumn {
  id: string;
  title: string;
}

interface VirtualizedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterableColumns?: VirtualizedDataTableFilterableColumn[];
  searchableColumns?: VirtualizedDataTableSearchableColumn[];
  searchPlaceholder?: string;
  showToolbar?: boolean;
  showColumnVisibility?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  compact?: boolean;
  striped?: boolean;
  /** Height of each row in pixels (for virtualization) */
  rowHeight?: number;
  /** Height of the table container */
  height?: string | number;
  /** Overscan - number of rows to render outside the visible area */
  overscan?: number;
  /** Whether to show loading indicator at bottom for infinite scroll */
  loadingMore?: boolean;
  /** Callback when user scrolls near the bottom (for infinite scroll) */
  onLoadMore?: () => void;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Debounce delay for search in ms */
  searchDebounce?: number;
  /** Total count for showing in footer */
  totalCount?: number;
}

// Memoized table row component for performance
const MemoizedTableRow = React.memo(
  ({
    row,
    onRowClick,
    rowClassName,
    compact,
    striped,
    index,
    virtualRow,
    measureElement,
  }: {
    row: Row<any>;
    onRowClick?: (row: any) => void;
    rowClassName?: (row: any) => string;
    compact: boolean;
    striped: boolean;
    index: number;
    virtualRow: { size: number; start: number };
    measureElement: (node: HTMLElement | null) => void;
  }) => (
    <TableRow
      ref={measureElement}
      data-index={index}
      data-state={row.getIsSelected() && "selected"}
      className={cn(
        "absolute w-full",
        onRowClick && "cursor-pointer hover:bg-muted/50",
        striped && index % 2 === 0 && "bg-muted/20",
        rowClassName && rowClassName(row.original)
      )}
      style={{
        transform: `translateY(${virtualRow.start}px)`,
        height: `${virtualRow.size}px`,
      }}
      onClick={() => onRowClick && onRowClick(row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(compact ? "px-2 py-1.5 text-xs" : "px-3 py-2")}
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ),
  (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
      prevProps.row.id === nextProps.row.id &&
      prevProps.row.getIsSelected() === nextProps.row.getIsSelected() &&
      prevProps.virtualRow.start === nextProps.virtualRow.start &&
      prevProps.virtualRow.size === nextProps.virtualRow.size &&
      prevProps.index === nextProps.index
    );
  }
);

MemoizedTableRow.displayName = "MemoizedTableRow";

export function VirtualizedDataTable<TData, TValue>({
  columns,
  data,
  filterableColumns = [],
  searchableColumns = [],
  searchPlaceholder = "Search...",
  showToolbar = true,
  showColumnVisibility = true,
  emptyMessage = "No results found.",
  loading = false,
  onRowClick,
  rowClassName,
  compact = true,
  striped = false,
  rowHeight = compact ? 36 : 48,
  height = "calc(100vh - 280px)",
  overscan = 10,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  searchDebounce = 300,
  totalCount,
}: VirtualizedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Debounce the global filter for better performance
  const debouncedGlobalFilter = useDebounce(globalFilter, searchDebounce);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: debouncedGlobalFilter,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
  });

  const { rows } = table.getRowModel();

  // Reference to the scrollable container
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Virtual row configuration
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.includes("Firefox")
        ? undefined
        : (element) => element?.getBoundingClientRect().height,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Handle infinite scroll
  React.useEffect(() => {
    const [lastItem] = [...virtualRows].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= rows.length - 1 - overscan &&
      hasMore &&
      !loadingMore &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [
    virtualRows,
    rows.length,
    hasMore,
    loadingMore,
    onLoadMore,
    overscan,
  ]);

  // Scroll to top when sorting or filtering changes
  React.useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [sorting, debouncedGlobalFilter, columnFilters]);

  return (
    <div className="space-y-2">
      {showToolbar && (
        <DataTableToolbar
          table={table}
          filterableColumns={filterableColumns}
          searchableColumns={searchableColumns}
          searchPlaceholder={searchPlaceholder}
          showColumnVisibility={showColumnVisibility}
        />
      )}
      <div
        ref={parentRef}
        className="table-container rounded-md border bg-card overflow-auto"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        compact ? "px-2 py-1.5 h-8 text-xs" : "px-3 py-2",
                        "font-semibold"
                      )}
                      style={{
                        width:
                          header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-16 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-muted-foreground text-sm">
                      Loading...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              <>
                {/* Spacer for virtual scroll */}
                <tr style={{ height: `${totalSize}px`, position: "relative" }}>
                  <td style={{ padding: 0, border: "none" }}>
                    <div style={{ position: "relative", width: "100%" }}>
                      {virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        return (
                          <MemoizedTableRow
                            key={row.id}
                            row={row}
                            onRowClick={onRowClick}
                            rowClassName={rowClassName}
                            compact={compact}
                            striped={striped}
                            index={virtualRow.index}
                            virtualRow={virtualRow}
                            measureElement={rowVirtualizer.measureElement}
                          />
                        );
                      })}
                    </div>
                  </td>
                </tr>
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-16 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-4 border-t">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading more...
            </span>
          </div>
        )}
      </div>
      {/* Footer with count info */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {totalCount !== undefined ? (
            <span>
              Showing {rows.length.toLocaleString()} of{" "}
              {totalCount.toLocaleString()} row(s)
            </span>
          ) : (
            <span>{rows.length.toLocaleString()} row(s)</span>
          )}
        </div>
        {hasMore && (
          <div className="text-sm text-muted-foreground">
            Scroll for more...
          </div>
        )}
      </div>
    </div>
  );
}
