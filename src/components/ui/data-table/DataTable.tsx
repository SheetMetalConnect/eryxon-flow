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
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  Row,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

// Global filter function for searching across all columns
const globalFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const search = filterValue.toLowerCase();

  // Search through all column values
  const rowValues = row.getAllCells().map(cell => {
    const value = cell.getValue();
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });

  return rowValues.some(value => value.toLowerCase().includes(search));
};

// Memoized table row component for better performance
interface MemoizedRowProps<TData> {
  row: Row<TData>;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  compact: boolean;
  striped: boolean;
  index: number;
}

const MemoizedRow = React.memo(
  <TData,>({
    row,
    onRowClick,
    rowClassName,
    compact,
    striped,
    index,
  }: MemoizedRowProps<TData>) => (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      className={cn(
        onRowClick && "cursor-pointer hover:bg-muted/50",
        striped && index % 2 === 0 && "bg-muted/20",
        rowClassName && rowClassName(row.original)
      )}
      onClick={() => onRowClick && onRowClick(row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(compact ? "px-2 py-1.5 text-xs" : "px-3 py-2")}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.row.id === nextProps.row.id &&
      prevProps.row.getIsSelected() === nextProps.row.getIsSelected() &&
      prevProps.index === nextProps.index &&
      prevProps.compact === nextProps.compact &&
      prevProps.striped === nextProps.striped
    );
  }
) as <TData>(props: MemoizedRowProps<TData>) => React.ReactElement;

(MemoizedRow as any).displayName = "MemoizedRow";

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableFilterableColumn {
  id: string;
  title: string;
  options: DataTableFilterOption[];
}

export interface DataTableSearchableColumn {
  id: string;
  title: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterableColumns?: DataTableFilterableColumn[];
  searchableColumns?: DataTableSearchableColumn[];
  searchPlaceholder?: string;
  showPagination?: boolean;
  showToolbar?: boolean;
  showColumnVisibility?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  stickyHeader?: boolean;
  compact?: boolean;
  striped?: boolean;
  maxHeight?: string;
  /** Debounce delay for search in ms (default: 200ms) */
  searchDebounce?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterableColumns = [],
  searchableColumns = [],
  searchPlaceholder = "Search...",
  showPagination = true,
  showToolbar = true,
  showColumnVisibility = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50, 100],
  emptyMessage = "No results found.",
  loading = false,
  onRowClick,
  rowClassName,
  stickyHeader = true, // Default to true for better UX
  compact = true, // Default to compact for data density
  striped = false,
  maxHeight = "calc(100vh - 280px)", // Default max height for viewport fitting
  searchDebounce = 200, // Debounce search for performance
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

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
        className={cn(
          "table-container rounded-md border bg-card overflow-auto",
          stickyHeader && "relative"
        )}
        style={{ maxHeight: stickyHeader ? maxHeight : undefined }}
      >
        <Table>
          <TableHeader className={cn(
            stickyHeader && "sticky top-0 bg-card z-10 shadow-sm"
          )}>
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
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
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
                    <span className="text-muted-foreground text-sm">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <MemoizedRow
                  key={row.id}
                  row={row}
                  onRowClick={onRowClick}
                  rowClassName={rowClassName}
                  compact={compact}
                  striped={striped}
                  index={index}
                />
              ))
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
      </div>
      {showPagination && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}
