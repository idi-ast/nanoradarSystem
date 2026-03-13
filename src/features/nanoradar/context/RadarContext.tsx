import { type ReactNode, useMemo } from "react";
import { useRadarWebSocket } from "../hooks/useRadarWebSocket";
import { useRadarData } from "../hooks/useRadarData";
import { useZoneDrawing } from "../hooks/useZoneDrawing";
import { RadarContext } from "./radarContextDef";
import type { RadarContextValue } from "./radarContextDef";
import { resolveRadarConfig, ACTIVE_RADAR } from "../config";
import type { RadarInstanceConfig } from "../config";

interface RadarProviderProps {
  children: ReactNode;
  instance?: RadarInstanceConfig;
}

export function RadarProvider({ children, instance = ACTIVE_RADAR }: RadarProviderProps) {
  const resolved = useMemo(() => resolveRadarConfig(instance), [instance]);
  const { targets, clearTargets } = useRadarWebSocket(resolved.wsUrl, resolved.timing);
  const { config, zones, isLoading, error, refreshData, addZone, updateZone, deleteZone } =
    useRadarData();
  const drawing = useZoneDrawing();

  const saveZone = async () => {
    if (!drawing.canSave) return;
    await addZone(drawing.buildPayload());
    drawing.cancelDrawing();
  };

  const value: RadarContextValue = {
    instanceConfig: resolved,
    config,
    zones,
    isLoading,
    error,
    refreshData,
    addZone,
    updateZone,
    deleteZone,

    targets,
    clearTargets,

    isDrawing: drawing.isDrawing,
    drawingPoints: drawing.points,
    zoneName: drawing.name,
    zoneColor: drawing.color,
    alertLevel: drawing.alertLevel,
    canSave: drawing.canSave,
    startDrawing: drawing.startDrawing,
    cancelDrawing: drawing.cancelDrawing,
    addDrawingPoint: drawing.addPoint,
    removeLastDrawingPoint: drawing.removeLastPoint,
    setZoneName: drawing.setName,
    setZoneColor: drawing.setColor,
    setAlertLevel: drawing.setAlertLevel,
    saveZone,
  };

  return (
    <RadarContext.Provider value={value}>{children}</RadarContext.Provider>
  );
}

