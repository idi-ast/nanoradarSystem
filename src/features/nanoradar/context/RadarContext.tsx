import { type ReactNode, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useRadarWebSocket } from "../hooks/useRadarWebSocket";
import { useRadarData } from "../hooks/useRadarData";
import { useZoneDrawing } from "../hooks/useZoneDrawing";
import { RadarContext, RadarTargetsContext, RadarStableTargetsContext } from "./radarContextDef";
import type { RadarContextValue, RadarTargetsContextValue, RadarStableTargetsContextValue } from "./radarContextDef";
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

  const saveZone = useCallback(async () => {
    if (!drawing.canSave) return;
    await addZone(drawing.buildPayload());
    drawing.cancelDrawing();
  }, [drawing.canSave, drawing.buildPayload, drawing.cancelDrawing, addZone]);


  /**
   * Valor estático: cambia solo cuando la configuración, zonas o el estado
   * de dibujo cambian. Los targets del WebSocket NO están aquí, por lo que
   * Camera, ZoneCard, DevicesOverlay, etc. nunca re-renderizan por WebSocket.
   */
  const staticValue = useMemo<RadarContextValue>(
    () => ({
      instanceConfig: resolved,
      config,
      zones,
      isLoading,
      error,
      refreshData,
      addZone,
      updateZone,
      deleteZone,
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
      clearTargets,
    }),
    [
      resolved,
      config,
      zones,
      isLoading,
      error,
      refreshData,
      addZone,
      updateZone,
      deleteZone,
      drawing.isDrawing,
      drawing.points,
      drawing.name,
      drawing.color,
      drawing.alertLevel,
      drawing.canSave,
      drawing.startDrawing,
      drawing.cancelDrawing,
      drawing.addPoint,
      drawing.removeLastPoint,
      drawing.setName,
      drawing.setColor,
      drawing.setAlertLevel,
      saveZone,
      clearTargets,
    ],
  );

  /**
   * Valor de alta frecuencia: se actualiza con cada mensaje del WebSocket.
   * Solo los componentes que llamen a useRadarTargets() re-renderizarán.
   */
  const targetsValue = useMemo<RadarTargetsContextValue>(
    () => ({ targets }),
    [targets],
  );

  /**
   * Valor de baja frecuencia: solo cambia cuando el conjunto de IDs cambia.
   * TargetsDynamicPanel y similares se suscriben a esto para no re-renderizar
   * en cada actualización de coordenadas del WebSocket.
   */
  const prevIdsKeyRef = useRef<string>("");
  const [stableTargets, setStableTargets] = useState(() => targets);
  useEffect(() => {
    const key = targets.map((t) => t.id).sort().join("|");
    if (key !== prevIdsKeyRef.current) {
      prevIdsKeyRef.current = key;
      setStableTargets(targets);
    }
  }, [targets]);
  const stableTargetsValue = useMemo<RadarStableTargetsContextValue>(
    () => ({ stableTargets }),
    [stableTargets],
  );

  return (
    <RadarContext.Provider value={staticValue}>
      <RadarTargetsContext.Provider value={targetsValue}>
        <RadarStableTargetsContext.Provider value={stableTargetsValue}>
          {children}
        </RadarStableTargetsContext.Provider>
      </RadarTargetsContext.Provider>
    </RadarContext.Provider>
  );
}

