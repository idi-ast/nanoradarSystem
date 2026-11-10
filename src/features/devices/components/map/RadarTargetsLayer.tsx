import { isPtzPositionRetained } from "../../utils/ptzTracking";
import { IconCamera } from "@tabler/icons-react";
import { isBehaviorVisible, targetBehaviorKey, behaviorModelCategory } from "../../config/behaviorCategories";
import { useBehaviorVisibilityStore } from "../../stores/behaviorVisibilityStore";
import { useEffect, useMemo, useState } from "react";
import { Source, Layer, Popup, Marker } from "react-map-gl";
import type { RadarTarget, DeviceFilter, TrackHistoryPoint } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { isPointInPolygon } from "./utils/geoHelpers";
import {
  useRadarContext,
  useRadarTargets,
} from "../../context/useRadarContext";
import { useTargetVisualStore } from "../../stores/targetVisualStore";
import { resolveBehaviorCategory } from "../../config";
import { IconTargetNeutral } from "../../config/categories";
import { Boat3DMarker } from "./Boat3DMarker";
import { BoatsSharedCanvas } from "./BoatsSharedCanvas";
import { DEFAULT_CATEGORY_MODELS } from "../../stores/targetVisualStore";
import { DEVICES_BELOW_LAYER_ID } from "./devicesConfig";

/** Opacidad mínima de la parte más antigua de la traza (la cola no se pierde) */
const TRAIL_BASE_OPACITY = 0.35;

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
        : allTargets.filter((t) => t.deviceType === deviceFilter || t.ptzTracking?.length),
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
      if (t.ptzTracking?.length) return true;
      const lastPoint = t.history[t.history.length - 1];
      if (!lastPoint) return false;
      return !zoneVerticesList.some((vertices) =>
        isPointInPolygon(lastPoint[0], lastPoint[1], vertices),
      );
    });
  }, [targets, alert6Zones]);

  const visibility = useBehaviorVisibilityStore(s => s.visibility);
  const categoryFilteredTargets = useMemo(() => zoneFilteredTargets.filter(t => t.ptzTracking?.length || isBehaviorVisible(targetBehaviorKey(t), visibility)), [zoneFilteredTargets, visibility]);

  const { targetColors, timing } = instanceConfig;
  const id = instanceConfig.id;

  const use3DBoat = useTargetVisualStore((s) => s.use3DBoat);
  const categoryModels = useTargetVisualStore((s) => s.categoryModels);
  const iconStyle2D = useTargetVisualStore((s) => s.iconStyle2D);
  const trackStrokeWidth = useTargetVisualStore((s) => s.trackStrokeWidth);
  const trackDurationSec = useTargetVisualStore((s) => s.trackDurationSec);


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
        history: t.ptzTracking?.length ? t.history : t.history.filter((p) => p[2] >= tStart && p[2] <= tEnd),
      }))
      .filter((t) => t.history.length > 0);
  }, [categoryFilteredTargets, historyRange, timeBounds]);

  const [now, setNow] = useState(Date.now);
  const selected =
    categoryFilteredTargets.find((t) => t.id === selectedTargetId) ?? null;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, timing.COLOR_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [timing.COLOR_REFRESH_MS]);

  const trailsData = useMemo(() => {
    const hasSelection = selectedTargetId !== null;
    return {
      type: "FeatureCollection" as const,
      features: slicedTargets
        .filter((t) => t.history.length > 1)
        .flatMap((t) => {
          let history = t.history;

          // Filtrar por duración configurable (0 = sin límite)
          if (trackDurationSec > 0 && history.length > 1) {
            const newestTs = history[history.length - 1][2];
            const cutoff = newestTs - trackDurationSec * 1000;
            history = history.filter((p) => p[2] >= cutoff);
            if (history.length < 2) return [];
          }

          // La traza usa TODO el historial disponible: la cola antigua se
          // dibuja con una opacidad base y solo la cabecera (últimos
          // TRAIL_FADE_POINTS segmentos) sube hasta opacidad plena.
          const dimmed = hasSelection && t.id !== selectedTargetId;
          const totalSegs = history.length - 1;
          const fadeSegs = Math.min(timing.TRAIL_FADE_POINTS, totalSegs);
          const fadeStart = totalSegs - fadeSegs;
          const ti = t.trackIntensity ?? 1;

          return history.slice(1).map((point, i) => {
            const prevPoint = history[i];
            const segIdx = i;
            const opacity =
              totalSegs === 0
                ? 1
                : segIdx >= fadeStart && fadeSegs > 0
                  ? TRAIL_BASE_OPACITY +
                    (1 - TRAIL_BASE_OPACITY) * ((segIdx - fadeStart) / fadeSegs)
                  : TRAIL_BASE_OPACITY;
            const lineWidth = trackStrokeWidth * (1.15 + ti * 0.85);
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
  }, [
    slicedTargets,
    timing.TRAIL_FADE_POINTS,
    selectedTargetId,
    trackStrokeWidth,
    trackDurationSec,
  ]);

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

    const startIdx = Math.floor(
      (historyTrackRange.start / 100) * historyTrackPoints.length,
    );
    const endIdx = Math.ceil(
      (historyTrackRange.end / 100) * historyTrackPoints.length,
    );
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
        <Source
          id={`history-trail-${id}`}
          type="geojson"
          data={historyTrailData}
        >
          <Layer
            id={`history-trail-layer-${id}`}
            type="line"
            paint={{
              "line-color": "#d7f443",
              "line-width": Math.max(2, trackStrokeWidth * 1),
              // "line-opacity": ["get", "opacity"],
              "line-blur": 0.2,
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
          const retained = isPtzPositionRetained(t, now);
          const moving = !retained && isTargetMoving(t, now, timing.TRACKING_ACTIVE_MS);
          const hiddenCategory = !isBehaviorVisible(targetBehaviorKey(t), visibility);
          const catId = behaviorModelCategory(t.behaviorClass, t.behaviorConfidence ?? 0);
          const behaviorCat = resolveBehaviorCategory(
            t.behaviorClass,
            t.behaviorConfidence ?? 0,
          );
          // La representación sigue la clasificación, nunca el icono de una zona.
          const Icon = behaviorCat?.icon ?? IconTargetNeutral;
          const isSelected = selectedTargetId === t.id;
          const dimmed = selectedTargetId !== null && !isSelected && !t.ptzTracking?.length;

          // Las clases sin un modelo apropiado conservan su icono 2D.
          const show3D = use3DBoat && catId !== null;
          // Modelo GLB según la categoría (preferencia del usuario o default)
          const modelPath =
            (catId !== null ? categoryModels[catId] ?? DEFAULT_CATEGORY_MODELS[catId] : undefined) ??
            "/3d/glb/cargo_ship.glb";

          return (
            <Marker key={t.id} longitude={lon} latitude={lat} anchor="center">
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
                  {t.nivel === 4 && moving && (
                    <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ping pointer-events-none" />
                  )}
                </div>
              ) : (
                (() => {
                  const mgIntensity =
                    t.deviceType === "magosradar" ? (t.trackIntensity ?? 1) : 1;
                  const sizeScale = 0.5 + mgIntensity * 0.5;
                  const baseW = moving
                    ? iconStyle2D.movingSize
                    : iconStyle2D.size;
                  const baseH = moving
                    ? iconStyle2D.movingSize
                    : iconStyle2D.size;
                  const borderCol =
                    behaviorCat?.color ??
                    (moving
                      ? iconStyle2D.movingBorderColor
                      : iconStyle2D.borderColor);

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
                        borderWidth: moving
                          ? iconStyle2D.movingBorderWidth
                          : iconStyle2D.borderWidth,
                        borderStyle: "solid",
                        borderColor: borderCol,
                        backgroundColor:
                          iconStyle2D.bgColor +
                          Math.round(
                            (moving
                              ? iconStyle2D.movingBgOpacity
                              : iconStyle2D.bgOpacity) * 255,
                          )
                            .toString(16)
                            .padStart(2, "0"),
                        boxShadow: moving
                          ? `0 0 0 4px ${borderCol}40`
                          : undefined,
                        outline: isSelected ? "2px solid white" : undefined,
                        transform: isSelected
                          ? "scale(1.5)"
                          : dimmed
                            ? "scale(0.9)"
                            : undefined,
                        opacity: dimmed ? 0.4 : 1,
                        transition: "opacity 0.2s, transform 0.2s",
                      }}
                      className="relative cursor-pointer flex items-center justify-center hover:scale-110"
                    >
                      {(moving
                        ? iconStyle2D.movingShowIcon
                        : iconStyle2D.showIcon) && (
                        <span
                          title={behaviorCat?.label}
                          style={{
                            color:
                              behaviorCat?.color ??
                              (moving
                                ? iconStyle2D.movingIconColor
                                : iconStyle2D.iconColor),
                          }}
                        >
                          <Icon
                            size={
                              moving
                                ? iconStyle2D.movingIconSize
                                : iconStyle2D.iconSize
                            }
                            stroke={2}
                          />
                        </span>
                      )}
                      {t.nivel === 4 && moving && (
                        <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ping" />
                      )}
                    </div>
                  );
                })()
              )}
              {Boolean(t.ptzTracking?.length) && <>
                <span aria-hidden="true" className={`pointer-events-none absolute -inset-2 rounded-full border-2 ${retained ? 'border-dashed border-amber-400' : 'border-cyan-300'}`} />
                <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-cyan-400/40 bg-slate-950/95 px-2 py-1 text-[11px] text-cyan-100 shadow-lg">
                  <span className="flex items-center gap-1 font-semibold"><IconCamera size={13} />PTZ {t.ptzTracking?.map(s => `#${s.ptzId}`).join(', ')} · {t.id.replace('magosradar_', '')}</span>
                  <span className={retained ? 'text-amber-300' : 'text-cyan-200'}>{retained ? `Última posición conocida · sin señal hace ${Math.max(1, Math.floor((now - t.lastUpdate) / 1000))} s` : 'Detección reciente'}</span>
                  {hiddenCategory && <span className="block text-slate-300">Categoría oculta · visible por PTZ</span>}
                  {deviceFilter !== 'all' && deviceFilter !== t.deviceType && <span className="block text-slate-300">Visible por seguimiento PTZ</span>}
                </div>
              </>}
              {t.underSurveillance && <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-amber-300">{moving ? 'Bajo vigilancia' : 'Vigilancia · Sin señal'}</span>}
            </Marker>
          );
        })}

      {/* Marcador para track seleccionado de la BD (no está en targets en vivo) */}
      {selectedTargetId &&
        !selected &&
        historyTrackPoints &&
        historyTrackPoints.length > 0 &&
        (() => {
          const lastPt = historyTrackPoints[historyTrackPoints.length - 1];
          return (
            <Marker
              key={`bd-${selectedTargetId}`}
              longitude={lastPt.lon}
              latitude={lastPt.lat}
              anchor="center"
            >
                {/* Sin clasificación fiable: marcador neutro del historial. */}
                <div
                  className="relative cursor-pointer flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "4px solid #fff",
                    backgroundColor: "#f59e0b40",
                    transform: "scale(1.8)",
                    boxShadow: "0 0 0 6px #f59e0b30, 0 0 12px #f59e0b60",
                  }}
                >
                  <span className="text-[5px] font-bold text-white">
                    {selectedTargetId.replace(
                      /^(nanoRadar|magosradar|spotter)_/,
                      "",
                    )}
                  </span>
                </div>
            </Marker>
          );
        })()}

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
                Detección:{" "}
                {selected.id.replace(/^(nanoRadar|magosradar|spotter)_/, "")}
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
                  Nive Alerta:{" "}
                  <span className="font-bold">{selected.nivel}</span>
                </li>

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
