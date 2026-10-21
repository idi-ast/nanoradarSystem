import { useEffect, useState, useRef } from "react";
import {
  fetchVisionDefaults,
  fetchVisionDetections,
  startVision,
  stopVision,
  type VisionConfigPayload,
} from "../services/visionService";

/**
 * Configuración optimizada para máxima fluidez en tiempo real:
 * - targetFps: 20 (movimiento continuo y suave, eliminando el tartamudeo de 12 FPS)
 * - imgsz: 480 (tiempo de inferencia rápido ~25-35ms con alta precisión de YOLO11n)
 * - maxWidth: 1280 (resolución 720p balanceada para reducir carga de codificación x264)
 * - bitrate: 2_500_000 (2.5 Mbps constante para WebRTC sin pérdida de paquetes)
 * - confidence: 0.35 (clasificaciones estables sin parpadeos)
 */
export const OPTIMIZED_VISION_CONFIG: VisionConfigPayload = {
  confidence: 0.35,
  targetFps: 20,
  maxWidth: 1280,
  bitrate: 2_500_000,
  imgsz: 480,
  classes: null,
};

export function useVisionDetection(ptzId: number, autoStart = true) {
  const [visionOn, setVisionOn] = useState(autoStart);
  const [starting, setStarting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectingMode, setConnectingMode] = useState<"start" | "stop" | null>(
    null,
  );
  const [config, setConfig] = useState<VisionConfigPayload>(OPTIMIZED_VISION_CONFIG);
  const initStartedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function init() {
      let activeConfig = OPTIMIZED_VISION_CONFIG;
      try {
        const defaults = await fetchVisionDefaults();
        if (active && defaults) {
          activeConfig = {
            ...defaults,
            targetFps: Math.max(defaults.targetFps || 0, 20),
            maxWidth: defaults.maxWidth || OPTIMIZED_VISION_CONFIG.maxWidth,
            imgsz: defaults.imgsz || OPTIMIZED_VISION_CONFIG.imgsz,
            bitrate: defaults.bitrate || OPTIMIZED_VISION_CONFIG.bitrate,
          };
          setConfig(activeConfig);
        }
      } catch {
        // mantener OPTIMIZED_VISION_CONFIG
      }

      if (!autoStart) return;

      // 1. Verificar si el worker ya está corriendo y online en el backend
      try {
        const res = await fetchVisionDetections(ptzId);
        if (active && res && res.state === "online") {
          setVisionOn(true);
          return;
        }
      } catch {
        // No está corriendo previamente
      }

      // 2. Si no está en ejecución, iniciarlo automáticamente
      if (!active) return;
      setStarting(true);
      setConnecting(true);
      setConnectingMode("start");
      try {
        await startVision(ptzId, activeConfig);
        if (active) setVisionOn(true);
      } catch (error) {
        console.error("[Vision PTZ] Error al autoiniciar IA:", error);
        if (active) {
          setConnecting(false);
          setConnectingMode(null);
        }
      } finally {
        if (active) setStarting(false);
      }
    }

    if (!initStartedRef.current) {
      initStartedRef.current = true;
      void init();
    }

    return () => {
      active = false;
    };
  }, [ptzId, autoStart]);

  async function toggleVision() {
    if (visionOn) {
      setStarting(true);
      setConnecting(true);
      setConnectingMode("stop");
      try {
        await stopVision(ptzId);
        setVisionOn(false);
        return true;
      } catch (error) {
        console.error("Vision PTZ", error);
        return false;
      } finally {
        setStarting(false);
        setConnecting(false);
        setConnectingMode(null);
      }
    }

    setStarting(true);
    setConnecting(true);
    setConnectingMode("start");
    try {
      await startVision(ptzId, config);
      setVisionOn(true);
      // connecting se mantiene activo hasta que el stream IA confirma "online"
      // (lo cierra VisionLoadingModal vía finishConnecting).
      return true;
    } catch (error) {
      console.error("Vision PTZ", error);
      setConnecting(false);
      setConnectingMode(null);
      return false;
    } finally {
      setStarting(false);
    }
  }

  async function applyConfig(nextConfig: VisionConfigPayload) {
    setConfig(nextConfig);
    if (!visionOn) return true;

    setStarting(true);
    try {
      await startVision(ptzId, nextConfig);
      return true;
    } catch (error) {
      console.error("Vision PTZ config", error);
      return false;
    } finally {
      setStarting(false);
    }
  }

  function finishConnecting() {
    setConnecting(false);
    setConnectingMode(null);
  }

  return {
    visionOn,
    starting,
    connecting,
    connectingMode,
    config,
    toggleVision,
    applyConfig,
    finishConnecting,
  };
}