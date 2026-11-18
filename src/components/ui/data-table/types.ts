import type { ComponentType } from "react";

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
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
