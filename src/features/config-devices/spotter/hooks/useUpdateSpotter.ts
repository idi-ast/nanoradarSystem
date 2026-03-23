import { useMutation, useQueryClient } from "@tanstack/react-query";
import { spotterService, type SpotterPayload } from "../service";

export function useUpdateSpotter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SpotterPayload }) =>
      spotterService.updateSpotter(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useCreateSpotter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SpotterPayload) =>
      spotterService.createSpotter(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}

export function useDeleteSpotter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => spotterService.deleteSpotter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}
