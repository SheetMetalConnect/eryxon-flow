"use client";

import { Table } from "@tanstack/react-table";
import { X, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./DataTableFacetedFilter";
import { DataTableViewOptions } from "./DataTableViewOptions";
import {
  DataTableFilterableColumn,
  DataTableSearchableColumn,
} from "./DataTable";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterableColumns?: DataTableFilterableColumn[];
  searchableColumns?: DataTableSearchableColumn[];
  searchPlaceholder?: string;
  showColumnVisibility?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  filterableColumns = [],
  searchableColumns = [],
  searchPlaceholder = "Search...",
  showColumnVisibility = true,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || table.getState().globalFilter;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-[250px] lg:w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={table.getState().globalFilter ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {filterableColumns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filterableColumns.map((column) => {
              const tableColumn = table.getColumn(column.id);
              if (!tableColumn) return null;
              return (
                <DataTableFacetedFilter
                  key={column.id}
                  column={tableColumn}
                  title={column.title}
                  options={column.options}
                />
              );
            })}
          </div>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter("");
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {showColumnVisibility && (
        <DataTableViewOptions table={table} />
      )}
    </div>
  );
}
