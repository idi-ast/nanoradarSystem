import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dispositivosService } from "../service";
import type {
  DispositivoPayload,
  DispositivoUpdatePayload,
} from "../types";

export function useTiposDispositivos() {
  return useQuery({
    queryKey: ["dispositivos", "tipos"],
    queryFn: () => dispositivosService.getTiposDispositivos(),
    staleTime: 60_000,
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: ["dispositivos", "categorias"],
    queryFn: () => dispositivosService.getCategorias(),
    staleTime: 60_000,
  });
}

export function useDispositivos(params?: { tipo_radar?: string; modelo?: string }) {
  return useQuery({
    queryKey: ["dispositivos", params?.tipo_radar ?? "all", params?.modelo ?? ""],
    queryFn: () => dispositivosService.getDispositivos(params),
     refetchInterval: 30_000,
  });
}

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: () => dispositivosService.getEmpresas(),
  });
}

export function useCreateDispositivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DispositivoPayload) =>
      dispositivosService.createDispositivo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    },
  });
}

export function useUpdateDispositivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DispositivoUpdatePayload }) =>
      dispositivosService.updateDispositivo(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    },
  });
}

export function useDeleteDispositivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dispositivosService.deleteDispositivo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    },
  });
}