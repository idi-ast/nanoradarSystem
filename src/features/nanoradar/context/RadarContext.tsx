import { type ReactNode } from "react";
import { useRadarWebSocket } from "../hooks/useRadarWebSocket";
import { useRadarData } from "../hooks/useRadarData";
import { useZoneDrawing } from "../hooks/useZoneDrawing";
import { RadarContext } from "./radarContextDef";
import type { RadarContextValue } from "./radarContextDef";

interface RadarProviderProps {
  children: ReactNode;
  wsUrl?: string;
}

export function RadarProvider({ children, wsUrl }: RadarProviderProps) {
  const { targets, clearTargets } = useRadarWebSocket(wsUrl);
  const { config, zones, isLoading, error, refreshData, addZone } =
    useRadarData();
  const drawing = useZoneDrawing();

  const saveZone = async () => {
    if (!drawing.canSave) return;
    await addZone(drawing.buildPayload());
    drawing.cancelDrawing();
  };

  const value: RadarContextValue = {
    config,
    zones,
    isLoading,
    error,
    refreshData,
    addZone,

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
    setZoneName: drawing.setName,
    setZoneColor: drawing.setColor,
    setAlertLevel: drawing.setAlertLevel,
    saveZone,
  };

  return (
    <RadarContext.Provider value={value}>{children}</RadarContext.Provider>
  );
}

