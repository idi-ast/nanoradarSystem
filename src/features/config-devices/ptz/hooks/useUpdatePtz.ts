import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ptzService, type PtzPayload } from "../service";

export function useUpdatePtz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PtzPayload }) =>
      ptzService.updatePtz(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useCreatePtz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PtzPayload) => ptzService.createPtz(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useDeletePtz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ptzService.deletePtz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}
