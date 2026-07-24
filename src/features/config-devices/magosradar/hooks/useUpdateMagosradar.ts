import { useMutation, useQueryClient } from "@tanstack/react-query";
import { magosradarService, type MagosradarPayload, type MagosradarUpdatePayload } from "../service";

export function useUpdateMagosradar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MagosradarUpdatePayload }) =>
      magosradarService.updateMagosradar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useCreateMagosradar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MagosradarPayload) =>
      magosradarService.createMagosradar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useDeleteMagosradar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => magosradarService.deleteMagosradar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}
