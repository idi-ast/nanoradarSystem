import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  startVision,
  stopVision,
  type VisionConfigPayload,
} from "../services/visionService";

interface UseVisionDetectionResult {
  /** IA activa: el stream mostrado es ptz_{id}_ai */
  visionOn: boolean;
  /** POST /start en curso (carga del modelo la primera vez) */
  starting: boolean;
  /** Configuración que se usará/aplicó (pendiente si la IA está apagada) */
  config: VisionConfigPayload;
  toggleVision: () => Promise<void>;
  /** Aplica una configuración: reinicia el worker si la IA está activa */
  applyConfig: (config: VisionConfigPayload) => Promise<boolean>;
}

/**
 * Maneja el ciclo de vida de la detección IA de una PTZ:
 * on  -> POST /vision/{id}/start y cambia el stream a ptz_{id}_ai
 * off -> vuelve al stream original y POST /vision/{id}/stop
 *
 * La configuración se aplica al arrancar; si se aplica con la IA activa,
 * el backend reinicia el worker automáticamente.
 */
export function useVisionDetection(ptzId: number): UseVisionDetectionResult {
  const [visionOn, setVisionOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [config, setConfig] = useState<VisionConfigPayload>({});

  const toggleVision = useCallback(async () => {
    if (starting) return;

    if (!visionOn) {
      setStarting(true);
      try {
        await startVision(ptzId, config);
        setVisionOn(true);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "No se pudo iniciar la detección IA",
        );
      } finally {
        setStarting(false);
      }
    } else {
      setVisionOn(false);
      try {
        await stopVision(ptzId);
      } catch {
        toast.error("No se pudo detener la detección IA");
      }
    }
  }, [ptzId, visionOn, starting, config]);

  const applyConfig = useCallback(
    async (newConfig: VisionConfigPayload) => {
      setConfig(newConfig);
      if (!visionOn) return true; // se aplicará al activar
      try {
        await startVision(ptzId, newConfig); // reinicia el worker
        return true;
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "No se pudo aplicar la configuración",
        );
        return false;
      }
    },
    [ptzId, visionOn],
  );

  return { visionOn, starting, config, toggleVision, applyConfig };
}
