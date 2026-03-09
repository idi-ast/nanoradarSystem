import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";

export type { ColumnDef };

export interface DataTableOptions<T> {
  data: T[];
  columns: ColumnDef<T>[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  pageSize?: number;
  initialSorting?: SortingState;
  initialFilters?: ColumnFiltersState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
}

export interface PaginationOptions {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
}

export interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
  rowSelection: RowSelectionState;
  columnVisibility: VisibilityState;
}

export interface ColumnConfig<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (info: { getValue: () => unknown }) => React.ReactNode;
  enableSorting?: boolean;
  enableFiltering?: boolean;
}
