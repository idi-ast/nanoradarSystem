# Date-fns

Libreria de manipulacion de fechas moderna y ligera.

## Caracteristicas

- Inmutable
- Tree-shakeable
- TypeScript nativo
- Funciones modulares

## Uso Basico

```tsx
import { 
  formatDate, 
  formatRelative, 
  isDateInRange,
  useDateFormat 
} from "@/libs/date-fns";

// Formatear fecha
const fecha = formatDate(new Date(), "dd/MM/yyyy"); // "19/01/2026"

// Formato relativo
const relativo = formatRelative(new Date()); // "hace 5 minutos"

// Verificar rango
const enRango = isDateInRange(fecha, inicio, fin);
```

## Con Hook

```tsx
function Componente() {
  const { formatted, relative, isToday } = useDateFormat(new Date());
  
  return (
    <div>
      <p>Fecha: {formatted}</p>
      <p>Relativo: {relative}</p>
      <p>Es hoy: {isToday ? "Si" : "No"}</p>
    </div>
  );
}
```

## Funciones Disponibles

| Funcion | Descripcion |
|---------|-------------|
| `formatDate` | Formatea fecha con patron |
| `formatRelative` | Tiempo relativo (hace X) |
| `parseDate` | Parsea string a Date |
| `isDateInRange` | Verifica si fecha esta en rango |
| `addDays/Months/Years` | Suma tiempo a fecha |
| `diffInDays/Hours` | Diferencia entre fechas |
