import { useEffect, useMemo, useState } from "react";
import { Source, Layer, Popup, Marker } from "react-map-gl";
import type { RadarTarget, DeviceFilter, TrackHistoryPoint } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { isPointInPolygon } from "./utils/geoHelpers";
import { useRadarContext, useRadarTargets } from "../../context/useRadarContext";
import { useTargetVisualStore } from "../../stores/targetVisualStore";
import { useTargetCategoryResolution } from "../../hooks/useTargetCategoryResolution";
import { ZONE_DETECTION_CATEGORIES } from "../../config";
import { Boat3DMarker } from "./Boat3DMarker";
import { BoatsSharedCanvas } from "./BoatsSharedCanvas";
import { DEFAULT_CATEGORY_MODELS } from "../../stores/targetVisualStore";
import { DEVICES_BELOW_LAYER_ID } from "./devicesConfig";

function isTargetMoving(
  target: RadarTarget,
  now: number,
  trackingActiveMs: number,
): boolean {
  return now - target.lastUpdate <= trackingActiveMs;
}

interface Props {
  deviceFilter?: DeviceFilter;
  historyRange?: HistoryRange;
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
  showPopup?: boolean;
  /** Puntos históricos del backend para el track seleccionado */
  historyTrackPoints?: TrackHistoryPoint[];
  /** Rango del timeline del historial (para filtrar los puntos históricos) */
  historyTrackRange?: HistoryRange;
}

export function RadarTargetsLayer({
  deviceFilter = "all",
  historyRange = { start: 0, end: 100 },
  selectedTargetId,
  onSelectTarget,
  showPopup = false,
  historyTrackPoints,
  historyTrackRange = { start: 0, end: 100 },
}: Props) {
  const { instanceConfig, zones } = useRadarContext();
  const { targets: allTargets } = useRadarTargets();
  const targets = useMemo(
    () =>
      deviceFilter === "all"
        ? allTargets
        : allTargets.filter((t) => t.deviceType === deviceFilter),
    [allTargets, deviceFilter],
  );

  // Zonas con tipo de alerta 6: restringir targets solo dentro de esos polígonos
  const alert6Zones = useMemo(
    () => zones.filter((z) => z.idTipoAlerta === 6),
    [zones],
  );

  const zoneFilteredTargets = useMemo(() => {
    if (alert6Zones.length === 0) return targets;
    const zoneVerticesList = alert6Zones.map((zone) => {
      const rawVertices = Array.isArray(zone.poligono.vertices)
        ? zone.poligono.vertices
        : Object.values(zone.poligono.vertices);
      return rawVertices;
    });
    return targets.filter((t) => {
      const lastPoint = t.history[t.history.length - 1];
      if (!lastPoint) return false;
      return !zoneVerticesList.some((vertices) =>
        isPointInPolygon(lastPoint[0], lastPoint[1], vertices),
      );
    });
  }, [targets, alert6Zones]);

  const categoryFilteredTargets = zoneFilteredTargets;

  const { targetColors, timing } = instanceConfig;
  const id = instanceConfig.id;

  const defaultCategoria = useTargetVisualStore(
    (s) => s.defaultCategoriaDeteccion,
  );
  const use3DBoat = useTargetVisualStore((s) => s.use3DBoat);
  const categoryModels = useTargetVisualStore((s) => s.categoryModels);
  const iconStyle2D = useTargetVisualStore((s) => s.iconStyle2D);
  const categoryMap = useTargetCategoryResolution(
    categoryFilteredTargets,
    zones,
    defaultCategoria,
    instanceConfig.geofence.ACTIVE_MS,
  );

  const timeBounds = useMemo(() => {
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const t of categoryFilteredTargets) {
      for (const p of t.history) {
        if (p[2] < tMin) tMin = p[2];
        if (p[2] > tMax) tMax = p[2];
      }
    }
    if (!isFinite(tMin) || tMax === tMin) return null;
    return { tMin, tRange: tMax - tMin };
  }, [categoryFilteredTargets]);

  const slicedTargets = useMemo(() => {
    if (!timeBounds) return categoryFilteredTargets;
    const tStart =
      timeBounds.tMin + (historyRange.start / 100) * timeBounds.tRange;
    const tEnd = timeBounds.tMin + (historyRange.end / 100) * timeBounds.tRange;

    return categoryFilteredTargets
      .map((t) => ({
        ...t,
        history: t.history.filter((p) => p[2] >= tStart && p[2] <= tEnd),
      }))
      .filter((t) => t.history.length > 0);
  }, [categoryFilteredTargets, historyRange, timeBounds]);

  const [now, setNow] = useState(0);
  const selected = categoryFilteredTargets.find((t) => t.id === selectedTargetId) ?? null;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, timing.COLOR_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [timing.COLOR_REFRESH_MS]);

  const trailsData = useMemo(
    () => {
      const hasSelection = selectedTargetId !== null;
      return {
        type: "FeatureCollection" as const,
        features: slicedTargets
          .filter((t) => t.history.length > 1)
          .flatMap((t) => {
            const history = t.history;
            const fadeLen = timing.TRAIL_FADE_POINTS;
            const recentHistory = history.length > fadeLen
              ? history.slice(-fadeLen)
              : history;

            const dimmed = hasSelection && t.id !== selectedTargetId;

            return recentHistory.slice(1).map((point, i) => {
              const prevPoint = recentHistory[i];
              const totalSegments = recentHistory.length - 1;
              const opacity = totalSegments > 0
                ? Math.max(0, (i + 1) / totalSegments)
                : 1;
              const ti = t.trackIntensity ?? 1;
              const lineWidth = 7 * (0.5 + ti * 0.5);
              let trailColor = t.trackColor ?? null;
              if (trailColor && trailColor.startsWith("rgba")) {
                const m = trailColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
                if (m) trailColor = `rgb(${m[1]},${m[2]},${m[3]})`;
              }
              return {
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  coordinates: [
                    [prevPoint[1], prevPoint[0]],
                    [point[1], point[0]],
                  ],
                },
                properties: {
                  id: t.id,
                  opacity,
                  color: trailColor,
                  lineWidth,
                  dimmed,
                },
              };
            });
          }),
      };
    },
    [slicedTargets, timing.TRAIL_FADE_POINTS, selectedTargetId],
  );

  const trailLayer = {
    id: `targets-trails-${id}`,
    type: "line" as const,
    paint: {
      "line-color": [
        "case",
        ["has", "color"],
        ["get", "color"],
        targetColors.moving,
      ] as unknown as string,
      "line-width": ["get", "lineWidth"] as ["get", string],
      "line-opacity": [
        "case",
        ["get", "dimmed"],
        ["*", ["get", "opacity"], 0.4],
        ["get", "opacity"],
      ] as unknown as number,
      "line-blur": 0.8,
    },
  };

  // ─── Historial del backend (traza completa de un track seleccionado) ───
  const historyTrailData = useMemo(() => {
    if (!historyTrackPoints || historyTrackPoints.length < 2) return null;

    const startIdx = Math.floor((historyTrackRange.start / 100) * historyTrackPoints.length);
    const endIdx = Math.ceil((historyTrackRange.end / 100) * historyTrackPoints.length);
    const sliced = historyTrackPoints.slice(startIdx, endIdx);

    if (sliced.length < 2) return null;

    return {
      type: "FeatureCollection" as const,
      features: sliced.slice(1).map((point, i) => {
        const prev = sliced[i];
        const total = sliced.length - 1;
        const opacity = total > 0 ? Math.max(0.15, (i + 1) / total) : 1;
        return {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [prev.lon, prev.lat],
              [point.lon, point.lat],
            ],
          },
          properties: {
            opacity,
          },
        };
      }),
    };
  }, [historyTrackPoints, historyTrackRange]);

  return (
    <>
      {/* Canvas WebGL compartido para todos los marcadores 3D — UN solo contexto WebGL */}
      {use3DBoat && <BoatsSharedCanvas />}

      <Source id={`targets-trails-${id}`} type="geojson" data={trailsData}>
        <Layer {...trailLayer} beforeId={DEVICES_BELOW_LAYER_ID} />
      </Source>

      {/* Traza histórica del backend (track seleccionado) */}
      {historyTrailData && (
        <Source id={`history-trail-${id}`} type="geojson" data={historyTrailData}>
          <Layer
            id={`history-trail-layer-${id}`}
            type="line"
            paint={{
              "line-color": "#f59e0b",
              "line-width": 3,
              "line-opacity": ["get", "opacity"],
              "line-blur": 0.5,
            }}
            beforeId={DEVICES_BELOW_LAYER_ID}
          />
        </Source>
      )}

      {slicedTargets
        .filter((t) => t.history.length > 0)
        .map((t) => {
          const lastPoint = t.history[t.history.length - 1];
          const lat = lastPoint[0];
          const lon = lastPoint[1];
          const moving = isTargetMoving(t, now, timing.TRACKING_ACTIVE_MS);
          const catId = categoryMap.get(t.id) ?? defaultCategoria;
          const cat =
            ZONE_DETECTION_CATEGORIES.find((c) => c.id === catId) ??
            ZONE_DETECTION_CATEGORIES[1];
          const Icon = cat.icon;
          const isSelected = selectedTargetId === t.id;
          const dimmed = selectedTargetId !== null && !isSelected;

          // Modo 3D: activo para todas las categorías cuando use3DBoat está activado
          const show3D = use3DBoat;
          // Modelo GLB según la categoría (preferencia del usuario o default)
          const modelPath = categoryModels[catId] ?? DEFAULT_CATEGORY_MODELS[catId] ?? "/3d/glb/cargo_ship.glb";

          return (
            <Marker
              key={t.id}
              longitude={lon}
              latitude={lat}
              anchor="center"
            >
              {show3D ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget(isSelected ? null : t.id);
                  }}
                  className="relative"
                >
                  <Boat3DMarker
                    id={t.id}
                    lng={lon}
                    lat={lat}
                    modelPath={modelPath}
                    history={t.history}
                    moving={moving}
                    isSelected={isSelected}
                    dimmed={dimmed}
                    size={64}
                  />
                  {t.nivel === 4 && (
                    <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ping pointer-events-none" />
                  )}
                </div>
              ) : (
                (() => {
                  const mgIntensity = t.deviceType === "magosradar" ? (t.trackIntensity ?? 1) : 1;
                  const sizeScale = 0.5 + mgIntensity * 0.5;
                  const baseW = moving ? iconStyle2D.movingSize : iconStyle2D.size;
                  const baseH = moving ? iconStyle2D.movingSize : iconStyle2D.size;
                  const borderCol = moving ? iconStyle2D.movingBorderColor : iconStyle2D.borderColor;

                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTarget(isSelected ? null : t.id);
                      }}
                      style={{
                        width: baseW * sizeScale,
                        height: baseH * sizeScale,
                        borderRadius: `${moving ? iconStyle2D.movingBorderRadius : iconStyle2D.borderRadius}%`,
                        borderWidth: moving ? iconStyle2D.movingBorderWidth : iconStyle2D.borderWidth,
                        borderStyle: "solid",
                        borderColor: borderCol,
                        backgroundColor: iconStyle2D.bgColor + Math.round((moving ? iconStyle2D.movingBgOpacity : iconStyle2D.bgOpacity) * 255).toString(16).padStart(2, "0"),
                        boxShadow: moving
                          ? `0 0 0 4px ${borderCol}40`
                          : undefined,
                        outline: isSelected ? "2px solid white" : undefined,
                        transform: isSelected ? "scale(1.2)" : dimmed ? "scale(0.9)" : undefined,
                        opacity: dimmed ? 0.4 : 1,
                        transition: "opacity 0.2s, transform 0.2s",
                      }}
                      className="relative cursor-pointer flex items-center justify-center hover:scale-110"
                    >
                      {(moving ? iconStyle2D.movingShowIcon : iconStyle2D.showIcon) && (
                        <span
                          style={{
                            color: moving ? iconStyle2D.movingIconColor : iconStyle2D.iconColor,
                          }}
                        >
                          <Icon
                            size={moving ? iconStyle2D.movingIconSize : iconStyle2D.iconSize}
                            stroke={2}
                          />
                        </span>
                      )}
                      {t.nivel === 4 && (
                        <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ping" />
                      )}
                    </div>
                  );
                })()
              )}
            </Marker>
          );
        })}

      {selected && showPopup && (
        <Popup
          longitude={selected.lon}
          latitude={selected.lat}
          anchor="bottom"
          offset={20}
          closeButton={false}
          onClose={() => onSelectTarget(null)}
        >
          <div className="text-[12px] flex flex-col justify-center items-center text-text-100 bg-bg-100/50 backdrop-blur shadow-2xl p-5 min-w-64 rounded-lg">
            <div>
              <h4 className="pb-2">
                Detección: {selected.id.replace(/^(nanoRadar|magosradar|spotter)_/, "")}
              </h4>
              <ul className="tracking-[0.12rem]">
                <li>
                  Radar:{" "}
                  <span className="text-brand-200 font-bold">
                    {selected.deviceType === "nanoRadar"
                      ? "NanoRadar"
                      : selected.deviceType === "magosradar"
                        ? "MagosRadar"
                        : "Spotter"}
                  </span>
                </li>
                <li>
                  Zona:{" "}
                  <span className="font-bold">{selected.zona || "N/A"}</span>
                </li>
                <li>
                  Nivel: <span className="font-bold">{selected.nivel}</span>
                </li>
                {selected.speed != null && (
                  <li>
                    Velocidad:{" "}
                    <span className="text-brand-200 font-bold">
                      {selected.speed.toFixed(1)} km/h
                    </span>
                  </li>
                )}
                <li>
                  Pos:{" "}
                  <span className="font-bold">
                    {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

