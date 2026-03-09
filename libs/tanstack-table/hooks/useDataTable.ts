import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";
import type { DataTableOptions } from "../types";

export function useDataTable<T>(options: DataTableOptions<T>) {
  const {
    data,
    columns,
    enableSorting = true,
    enableFiltering = true,
    enablePagination = true,
    enableRowSelection = false,
    pageSize = 10,
    initialSorting = [],
    initialFilters = [],
    onRowSelectionChange,
  } = options;

  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialFilters);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    ...(enableFiltering && { getFilteredRowModel: getFilteredRowModel() }),
    ...(enablePagination && { getPaginationRowModel: getPaginationRowModel() }),
    enableRowSelection,
    enableColumnResizing: true,
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return {
    table,
    sorting,
    columnFilters,
    rowSelection,
    columnVisibility,
    setSorting,
    setColumnFilters,
    setRowSelection,
    setColumnVisibility,
    // Shortcuts
    getHeaderGroups: () => table.getHeaderGroups(),
    getRowModel: () => table.getRowModel(),
    getSelectedRows: () => table.getSelectedRowModel().rows,
    getPageCount: () => table.getPageCount(),
    getCanPreviousPage: () => table.getCanPreviousPage(),
    getCanNextPage: () => table.getCanNextPage(),
    previousPage: () => table.previousPage(),
    nextPage: () => table.nextPage(),
    setPageIndex: (index: number) => table.setPageIndex(index),
    setPageSize: (size: number) => table.setPageSize(size),
    globalFilter: table.getState().globalFilter,
    setGlobalFilter: table.setGlobalFilter,
  };
}
