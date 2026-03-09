# Tanstack Query (React Query)

Gestión de datos asíncronos con cache, refetch automático y más.

## Características

-  Cache automático
-  Background refetching
-  Optimistic updates
-  Infinite scroll / paginación
-  Mutations con rollback

## Configuración

El `QueryClientProvider` debe envolver tu app en `main.tsx`:

```tsx
import { QueryProvider } from "@/libs/tanstack-query";

function App() {
  return (
    <QueryProvider>
      <Router />
    </QueryProvider>
  );
}
```

## Uso Básico

```tsx
import { useSensoresQuery, useCreateSensorMutation } from "@/libs/tanstack-query";

function Sensores() {
  // Query con cache
  const { data, isLoading, error, refetch } = useSensoresQuery({
    page: 1,
    pageSize: 10,
  });

  // Mutation
  const createMutation = useCreateSensorMutation();

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      nombre: "Sensor Nuevo",
      tipo: "temperatura",
      ubicacion: "Bodega A",
    });
  };

  if (isLoading) return <Spinner />;
  
  return (
    <ul>
      {data?.items.map(sensor => (
        <li key={sensor.id}>{sensor.nombre}</li>
      ))}
    </ul>
  );
}
```

## Query Keys

Las query keys son importantes para el cache:

| Key | Descripción |
|-----|-------------|
| `["sensores"]` | Lista de sensores |
| `["sensores", id]` | Sensor específico |
| `["sensores", id, "lecturas"]` | Lecturas de un sensor |

## Invalidación de Cache

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/libs/tanstack-query";

const queryClient = useQueryClient();

// Invalidar toda la lista
queryClient.invalidateQueries({ queryKey: queryKeys.sensores.all });

// Invalidar sensor específico
queryClient.invalidateQueries({ queryKey: queryKeys.sensores.detail(5) });
```
