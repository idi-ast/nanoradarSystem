import { useMutation, useQueryClient } from "@tanstack/react-query";
import { camaraService, type CamaraPayload } from "../service";

export function useUpdateCamara() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CamaraPayload }) =>
      camaraService.updateCamara(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-devices"] });
    },
  });
}
