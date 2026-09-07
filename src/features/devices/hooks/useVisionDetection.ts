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
    setStarting(true);
    try {
      if (visionOn) {
        await stopVision(ptzId);
        setVisionOn(false);
        return true;
      }

      await startVision(ptzId, config);
      setVisionOn(true);
      return true;
    } catch (error) {
      console.error("Vision PTZ", error);
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

  return { visionOn, starting, config, toggleVision, applyConfig };
}