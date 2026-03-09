import { flexRender, type ColumnDef } from "@tanstack/react-table";

export { flexRender };

export function createColumn<T>(
  accessorKey: keyof T & string,
  header: string,
  options?: Partial<ColumnDef<T>>
): ColumnDef<T> {
  return {
    accessorKey,
    header,
    ...options,
  };
}

export function createColumns<T>(
  configs: Array<{
    accessorKey: keyof T & string;
    header: string;
    options?: Partial<ColumnDef<T>>;
  }>
): ColumnDef<T>[] {
  return configs.map(({ accessorKey, header, options }) =>
    createColumn<T>(accessorKey, header, options)
  );
}

export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    header: ({ table }) =>
      flexRender("input", {
        type: "checkbox",
        checked: table.getIsAllRowsSelected(),
        indeterminate: table.getIsSomeRowsSelected(),
        onChange: table.getToggleAllRowsSelectedHandler(),
      }),
    cell: ({ row }) =>
      flexRender("input", {
        type: "checkbox",
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onChange: row.getToggleSelectedHandler(),
      }),
    enableSorting: false,
  };
}

export function createActionsColumn<T>(
  renderActions: (row: T) => React.ReactNode
): ColumnDef<T> {
  return {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => renderActions(row.original),
    enableSorting: false,
  };
}

export function getSelectedRowIds<T extends { id: string | number }>(
  selectedRows: T[]
): (string | number)[] {
  return selectedRows.map((row) => row.id);
}

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
