import { useQuery } from "@tanstack/react-query";
import { fetchTrackHistory } from "../services/radarService";

interface UseTrackHistoryOptions {
  trackId: string | null;
  tipoRadar?: string;
  /** Timestamp (ms) de la última posición conocida del track. Se usa como referencia
   *  para filtrar la sesión (±12h) y no mezclar tracks de distintos días. */
  sessionRef?: number | null;
  enabled?: boolean;
}

export function useTrackHistory({
  trackId,
  tipoRadar,
  sessionRef,
  enabled = true,
}: UseTrackHistoryOptions) {
  return useQuery({
    queryKey: ["track-history", trackId, tipoRadar, sessionRef],
    queryFn: () =>
      fetchTrackHistory(trackId!, {
        tipo_radar: tipoRadar,
        session_ref: sessionRef
          ? new Date(sessionRef).toISOString()
          : undefined,
      }),
    enabled: enabled && !!trackId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
