import { useQuery } from "@tanstack/react-query";
import { nanoradarService } from "../service";
import type { RadarDetectionPayload, ProcessedDetection } from "../types/radar-detection.types";

interface UseRadarPollingOptions {
  /** Intervalo de polling en milisegundos (default: 5000 = 5s) */
  interval?: number;
  /** Si true, no inicia el polling automáticamente */
  enabled?: boolean;
}

interface UseRadarPollingReturn {
  /** Último payload completo recibido */
  lastPayload: RadarDetectionPayload | undefined;
  /** Lista de detecciones del último mensaje */
  detections: ProcessedDetection[];
  /** `true` mientras se está cargando la primera solicitud */
  isLoading: boolean;
  /** `true` cuando hay una solicitud en vuelo (incluye refetch) */
  isFetching: boolean;
  /** Error si la solicitud falla */
  error: Error | null;
  /** Número total de detecciones en el último payload */
  detectionCount: number;
  /** Timestamp de la última detección recibida */
  lastTimestamp: number | null;
}

/**
 * Hook para obtener detecciones de radar vía polling REST.
 * Llama a `GET /api/radar/last-detection` cada `interval` ms.
 *
 * @example
 * ```tsx
 * const { detections, isFetching, error } = useRadarPolling({ interval: 5000 });
 * ```
 */
export function useRadarPolling(
  options: UseRadarPollingOptions = {}
): UseRadarPollingReturn {
  const { interval = 5000, enabled = true } = options;

  const {
    data: lastPayload,
    isLoading,
    isFetching,
    error,
  } = useQuery<RadarDetectionPayload, Error>({
    queryKey: ["radar", "last-detection"],
    queryFn: () => nanoradarService.getLastDetection(),
    refetchInterval: interval,
    enabled,
    // No retener datos viejos en caché; siempre queremos lo último
    staleTime: 0,
  });

  return {
    lastPayload,
    detections: lastPayload?.detections ?? [],
    isLoading,
    isFetching,
    error: error instanceof Error ? error : null,
    detectionCount: lastPayload?.detections?.length ?? 0,
    lastTimestamp: lastPayload?.timestamp ?? null,
  };
}
