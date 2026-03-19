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
