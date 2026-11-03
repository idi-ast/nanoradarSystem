import { useQuery } from "@tanstack/react-query";
import { fetchTrackHistory } from "../services/radarService";

// El refresco sigue siendo de 30 s; no crear una caché por cada barrido WS.
const REFRESH_MS = 30_000;

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
    queryKey: [
      "track-history", trackId, tipoRadar,
      sessionRef == null ? sessionRef : Math.floor(sessionRef / REFRESH_MS),
    ],
    queryFn: () =>
      fetchTrackHistory(trackId!, {
        tipo_radar: tipoRadar,
        session_ref: sessionRef
          ? new Date(sessionRef).toISOString()
          : undefined,
      }),
    enabled: enabled && !!trackId,
    refetchInterval: REFRESH_MS,
    // Solo consultas inactivas: el historial seleccionado sigue disponible.
    gcTime: 60_000,
    staleTime: 15_000,
  });
}
