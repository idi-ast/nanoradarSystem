import { type ReactNode, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { usePtzTracking } from "../hooks/usePtzTracking";
import { mergePtzTargets } from "../utils/ptzTracking";
import { useSurveillanceTargets } from "../hooks/useSurveillanceTargets";
import { useRadarWebSocket } from "../hooks/useRadarWebSocket";
import { useRadarData } from "../hooks/useRadarData";
import { useZoneDrawing } from "../hooks/useZoneDrawing";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
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
  const { data: devicesData } = useConfigDevices();
  const magosradarTrackColor = devicesData?.data?.magosradares?.[0]?.trackColor ?? "#f43f5e";
  const { targets: liveTargets, clearTargets, cameraActivities } = useRadarWebSocket(resolved.wsUrl, resolved.timing, magosradarTrackColor);
  const watchedTargets = useSurveillanceTargets(liveTargets, resolved.id);
  const { snapshot, unavailable: trackingUnavailable, now } = usePtzTracking();
  const targets = useMemo(() => mergePtzTargets(watchedTargets, snapshot, now), [watchedTargets, snapshot, now]);
  const trackingSessions = useMemo(() => snapshot?.sessions ?? [], [snapshot]);
  const { config, zones, isLoading, error, refreshData, addZone, updateZone, deleteZone } =
    useRadarData();
  const drawing = useZoneDrawing();
  // Ref estable — RadarMap lo asigna para exponer flyTo sin causar re-renders
  const flyToZoneFn = useRef<((lat: number, lon: number, zoom?: number) => void) | null>(null);

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
      zoneSound: drawing.zoneSound,
      destello: drawing.destello,
      categoriaDeteccion: drawing.categoriaDeteccion,
      activarPtz: drawing.activarPtz,
      allowedCategories: drawing.allowedCategories,
      canSave: drawing.canSave,
      startDrawing: drawing.startDrawing,
      cancelDrawing: drawing.cancelDrawing,
      addDrawingPoint: drawing.addPoint,
      updateDrawingPoint: drawing.updatePoint,
      removeDrawingPointAtIndex: drawing.removePointAtIndex,
      removeLastDrawingPoint: drawing.removeLastPoint,
      setZoneName: drawing.setName,
      setZoneColor: drawing.setColor,
      setAlertLevel: drawing.setAlertLevel,
      setZoneSound: drawing.setZoneSound,
      setDestello: drawing.setdestello,
      setCategoriaDeteccion: drawing.setCategoriaDeteccion,
      setActivarPtz: drawing.setActivarPtz,
      setAllowedCategories: drawing.setAllowedCategories,
      saveZone,
      clearTargets,
      flyToZoneFn,
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
      drawing.zoneSound,
      drawing.destello,
      drawing.categoriaDeteccion,
      drawing.activarPtz,
      drawing.allowedCategories,
      drawing.canSave,
      drawing.startDrawing,
      drawing.cancelDrawing,
      drawing.addPoint,
      drawing.updatePoint,
      drawing.removePointAtIndex,
      drawing.removeLastPoint,
      drawing.setName,
      drawing.setColor,
      drawing.setAlertLevel,
      drawing.setZoneSound,
      drawing.setdestello,
      drawing.setCategoriaDeteccion,
      drawing.setActivarPtz,
      drawing.setAllowedCategories,
      saveZone,
      clearTargets,
    ],
  );

  /**
   * Valor de alta frecuencia: se actualiza con cada mensaje del WebSocket.
   * Solo los componentes que llamen a useRadarTargets() re-renderizarán.
   */
  const targetsValue = useMemo<RadarTargetsContextValue>(
    () => ({ targets, cameraActivities, trackingSessions, trackingUnavailable, trackingNow: now }),
    [targets, cameraActivities, trackingSessions, trackingUnavailable, now],
  );

  /**
   * Valor de baja frecuencia: cambia al variar los IDs o su categoría de comportamiento.
   * TargetsDynamicPanel y similares se suscriben a esto para no re-renderizar
   * en cada actualización de coordenadas del WebSocket.
   */
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [stableTargets, setStableTargets] = useState(() => targets);
  useEffect(() => {
    const prev = prevIdsRef.current;
    if (targets.length !== prev.size || !targets.every((t) => prev.has(`${t.id}:${Boolean(t.underSurveillance)}:${JSON.stringify(t.ptzTracking)}:${t.behaviorClass ?? ""}:${Math.round((t.behaviorConfidence ?? 0) * 20)}:${t.behaviorSource ?? ""}`))) {
      prevIdsRef.current = new Set(targets.map((t) => `${t.id}:${Boolean(t.underSurveillance)}:${JSON.stringify(t.ptzTracking)}:${t.behaviorClass ?? ""}:${Math.round((t.behaviorConfidence ?? 0) * 20)}:${t.behaviorSource ?? ""}`));
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

