import { useEffect, useState } from "react";
import {
  fetchVisionDefaults,
  startVision,
  stopVision,
  type VisionConfigPayload,
} from "../services/visionService";

const DEFAULT_CONFIG: VisionConfigPayload = {
  confidence: 0.35,
  targetFps: 12,
  maxWidth: 1280,
  bitrate: 2_500_000,
  imgsz: 480,
  classes: null,
};

export function useVisionDetection(ptzId: number) {
  const [visionOn, setVisionOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectingMode, setConnectingMode] = useState<"start" | "stop" | null>(
    null,
  );
  const [config, setConfig] = useState<VisionConfigPayload>(DEFAULT_CONFIG);

  useEffect(() => {
    let active = true;
    fetchVisionDefaults()
      .then((defaults) => {
        if (active) setConfig(defaults);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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