import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { perfilMagosService } from "../service/perfilMagos.service";
import type { PerfilMagosPayload } from "../../types/ConfigServices.type";

const PERFILES_KEY = ["perfiles-magos"];

/** Obtiene la lista de todos los perfiles */
export function usePerfilesMagos() {
  return useQuery({
    queryKey: PERFILES_KEY,
    queryFn: perfilMagosService.list,
    staleTime: 60_000,
  });
}

/** Obtiene un perfil por ID */
export function usePerfilMagos(id: number | null) {
  return useQuery({
    queryKey: [...PERFILES_KEY, id],
    queryFn: () => perfilMagosService.getById(id!),
    enabled: id != null,
  });
}

/** Crea un nuevo perfil */
export function useCreatePerfilMagos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PerfilMagosPayload) => perfilMagosService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERFILES_KEY });
    },
  });
}

/** Actualiza un perfil existente */
export function useUpdatePerfilMagos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PerfilMagosPayload> }) =>
      perfilMagosService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERFILES_KEY });
    },
  });
}

/** Elimina un perfil */
export function useDeletePerfilMagos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => perfilMagosService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERFILES_KEY });
    },
  });
}
