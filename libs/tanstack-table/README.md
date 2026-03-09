# TanStack Table

Libreria headless para construir tablas potentes.

## Caracteristicas

- Headless (sin estilos)
- Ordenamiento
- Filtrado
- Paginacion
- Seleccion de filas
- TypeScript nativo

## Uso Basico

```tsx
import { useDataTable, DataTable } from "@/libs/tanstack-table";

const columns = [
  { accessorKey: "nombre", header: "Nombre" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "rol", header: "Rol" },
];

function UsersTable() {
  const table = useDataTable({
    data: users,
    columns,
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Con Ordenamiento y Filtrado

```tsx
const table = useDataTable({
  data: users,
  columns,
  enableSorting: true,
  enableFiltering: true,
});

// Ordenar por columna
<th onClick={header.column.getToggleSortingHandler()}>
  {header.column.columnDef.header}
  {header.column.getIsSorted() === "asc" ? " ↑" : " ↓"}
</th>

// Filtrar
<input
  value={table.getColumn("nombre")?.getFilterValue() ?? ""}
  onChange={(e) => table.getColumn("nombre")?.setFilterValue(e.target.value)}
/>
```

## Hooks Disponibles

| Hook | Descripcion |
|------|-------------|
| `useDataTable` | Hook principal con configuracion |
| `usePagination` | Manejo de paginacion |
| `useRowSelection` | Seleccion de filas |
