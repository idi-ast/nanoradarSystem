import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoradarService, type NanoradarPayload } from "../service";

export function useUpdateNanoradar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: NanoradarPayload }) =>
      nanoradarService.updateNanoradar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useCreateNanoradar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NanoradarPayload) =>
      nanoradarService.createNanoradar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useDeleteNanoradar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => nanoradarService.deleteNanoradar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}
