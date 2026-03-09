import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../types";
import type {
  Sensor,
  SensorCreate,
  SensorUpdate,
  Lectura,
  QueryParams,
  PaginatedData,
  QueryOptions,
} from "../types";
import { apiClient } from "@/apis";

// ============================================
// Queries
// ============================================

/**
 * Query para listar sensores con paginación
 */
export function useSensoresQuery(params?: QueryParams, options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.sensores.list(params ?? {}),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedData<Sensor>>(
        "/sensores",
        params
      );
      return response.data;
    },
    ...options,
  });
}

/**
 * Query para obtener un sensor por ID
 */
export function useSensorQuery(id: number, options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.sensores.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Sensor>(`/sensores/${id}`);
      return response.data;
    },
    enabled: id > 0,
    ...options,
  });
}

/**
 * Query para lecturas de un sensor
 */
export function useLecturasQuery(
  sensorId: number,
  params?: { desde?: string; hasta?: string },
  options?: QueryOptions
) {
  return useQuery({
    queryKey: queryKeys.sensores.lecturas(sensorId),
    queryFn: async () => {
      const response = await apiClient.get<Lectura[]>(
        `/sensores/${sensorId}/lecturas`,
        params
      );
      return response.data;
    },
    enabled: sensorId > 0,
    ...options,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Mutation para crear sensor
 */
export function useCreateSensorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SensorCreate) => {
      const response = await apiClient.post<Sensor>("/sensores", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar lista para refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.sensores.lists() });
    },
  });
}

/**
 * Mutation para actualizar sensor
 */
export function useUpdateSensorMutation(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SensorUpdate) => {
      const response = await apiClient.put<Sensor>(`/sensores/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Actualizar cache del sensor específico
      queryClient.setQueryData(queryKeys.sensores.detail(id), data);
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: queryKeys.sensores.lists() });
    },
  });
}

/**
 * Mutation para eliminar sensor
 */
export function useDeleteSensorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/sensores/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Remover del cache
      queryClient.removeQueries({ queryKey: queryKeys.sensores.detail(id) });
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: queryKeys.sensores.lists() });
    },
  });
}

// ============================================
// Optimistic Update Example
// ============================================

/**
 * Mutation con optimistic update
 */
export function useToggleSensorEstadoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      estado,
    }: {
      id: number;
      estado: Sensor["estado"];
    }) => {
      const response = await apiClient.patch<Sensor>(`/sensores/${id}`, {
        estado,
      });
      return response.data;
    },
    // Optimistic update
    onMutate: async ({ id, estado }) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({
        queryKey: queryKeys.sensores.detail(id),
      });

      // Snapshot del valor anterior
      const previousSensor = queryClient.getQueryData<Sensor>(
        queryKeys.sensores.detail(id)
      );

      // Actualizar optimisticamente
      if (previousSensor) {
        queryClient.setQueryData(queryKeys.sensores.detail(id), {
          ...previousSensor,
          estado,
        });
      }

      return { previousSensor };
    },
    // Rollback en error
    onError: (_err, { id }, context) => {
      if (context?.previousSensor) {
        queryClient.setQueryData(
          queryKeys.sensores.detail(id),
          context.previousSensor
        );
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sensores.detail(id),
      });
    },
  });
}
