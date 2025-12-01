"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column as TanStackColumn } from "@tanstack/react-table";

// =====================================================
// DataTableColumnHeader - TanStack Table compatible
// =====================================================
interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: TanStackColumn<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover border-border">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// =====================================================
// Original DataTable component (custom implementation)
// =====================================================
export interface Column<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  align?: "left" | "right" | "center";
  format?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  rows: T[];
  rowKey: string;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  className?: string;
}

type Order = "asc" | "desc";

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  rowKey,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  searchable = true,
  searchPlaceholder = "Search...",
  loading = false,
  emptyMessage = "No data available",
  stickyHeader = true,
  maxHeight = 600,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  className,
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = React.useState<string>("");
  const [order, setOrder] = React.useState<Order>("asc");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Handle sorting
  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnId);
  };

  // Handle pagination
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setPage(0);
  };

  // Ensure rows is always an array
  const safeRows = rows || [];

  // Filter rows based on search query
  const filteredRows = searchQuery
    ? safeRows.filter((row) =>
        columns.some((column) => {
          const value = row[column.id];
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      )
    : safeRows;

  // Sort rows
  const sortedRows = React.useMemo(() => {
    if (!filteredRows || !Array.isArray(filteredRows)) return [];
    if (!orderBy) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return order === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, order, orderBy]);

  // Paginate rows - with safety check
  const paginatedRows = Array.isArray(sortedRows) 
    ? sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  // Show action column if any action handler is provided
  const showActions = !!(onEdit || onDelete || onView);

  // Pagination info - with safety checks
  const totalPages = Math.ceil((sortedRows?.length || 0) / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, sortedRows?.length || 0);

  const getSortIcon = (columnId: string) => {
    if (orderBy !== columnId) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />;
    }
    return order === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Search Bar */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Loading Bar */}
      {loading && (
        <Progress value={undefined} className="h-1" />
      )}

      {/* Table */}
      <div
        className="rounded-xl border border-white/10 overflow-hidden backdrop-blur-xl bg-[rgba(20,20,20,0.7)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
      >
        <div className="overflow-auto" style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight - 60}px` : maxHeight }}>
          <Table>
            <TableHeader className={cn(stickyHeader && "sticky top-0 bg-[rgba(20,20,20,0.95)] backdrop-blur-md z-10 border-b border-white/10")}>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right"
                    )}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.id)}
                        className="inline-flex items-center hover:text-foreground transition-colors"
                      >
                        {column.label}
                        {getSortIcon(column.id)}
                      </button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
                {showActions && (
                  <TableHead className="text-right" style={{ minWidth: 120 }}>
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    <span className="text-muted-foreground">{emptyMessage}</span>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow
                    key={row[rowKey]}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right"
                          )}
                        >
                          {column.format ? column.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            {onView && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onView(row);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View</TooltipContent>
                              </Tooltip>
                            )}
                            {onEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(row);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            )}
                            {onDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(row);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-[rgba(20,20,20,0.5)]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={handleChangeRowsPerPage}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rowsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {sortedRows.length > 0
                ? `${startIndex}-${endIndex} of ${sortedRows.length}`
                : "0 results"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleChangePage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { Column as DataTableColumn };
