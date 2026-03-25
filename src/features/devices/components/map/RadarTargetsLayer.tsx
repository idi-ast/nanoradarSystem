import { useEffect, useMemo, useState } from "react";
import { Source, Layer, Popup, Marker } from "react-map-gl";
import type { RadarTarget, DeviceFilter } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { toGeoCoord } from "./utils/geoHelpers";
import { useRadarContext, useRadarTargets } from "../../context/useRadarContext";
import { useTargetVisualStore } from "../../stores/targetVisualStore";
import { useTargetCategoryResolution } from "../../hooks/useTargetCategoryResolution";
import { ZONE_DETECTION_CATEGORIES } from "../../config";
import { Boat3DMarker } from "./Boat3DMarker";
import { BoatsSharedCanvas } from "./BoatsSharedCanvas";

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
}

export function RadarTargetsLayer({
  deviceFilter = "all",
  historyRange = { start: 0, end: 100 },
  selectedTargetId,
  onSelectTarget,
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

  const { targetColors, timing } = instanceConfig;
  const id = instanceConfig.id;

  const defaultCategoria = useTargetVisualStore(
    (s) => s.defaultCategoriaDeteccion,
  );
  const use3DBoat = useTargetVisualStore((s) => s.use3DBoat);
  const categoryMap = useTargetCategoryResolution(
    targets,
    zones,
    defaultCategoria,
    instanceConfig.geofence.ACTIVE_MS,
  );

  const timeBounds = useMemo(() => {
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const t of targets) {
      for (const p of t.history) {
        if (p[2] < tMin) tMin = p[2];
        if (p[2] > tMax) tMax = p[2];
      }
    }
    if (!isFinite(tMin) || tMax === tMin) return null;
    return { tMin, tRange: tMax - tMin };
  }, [targets]);

  const slicedTargets = useMemo(() => {
    if (!timeBounds) return targets;
    const tStart =
      timeBounds.tMin + (historyRange.start / 100) * timeBounds.tRange;
    const tEnd = timeBounds.tMin + (historyRange.end / 100) * timeBounds.tRange;

    return targets
      .map((t) => ({
        ...t,
        history: t.history.filter((p) => p[2] >= tStart && p[2] <= tEnd),
      }))
      .filter((t) => t.history.length > 0);
  }, [targets, historyRange, timeBounds]);

  const [now, setNow] = useState(0);
  const selected = targets.find((t) => t.id === selectedTargetId) ?? null;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, timing.COLOR_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const trailsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: slicedTargets
        .filter((t) => t.history.length > 1)
        .map((t) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: t.history.map(toGeoCoord),
          },
          properties: {
            id: t.id,
            nivel: t.nivel,
            deviceType: t.deviceType,
            isMoving: isTargetMoving(t, now, timing.TRACKING_ACTIVE_MS),
          },
        })),
    }),
    [slicedTargets, now, timing.TRACKING_ACTIVE_MS],
  );

  const trailLayer = {
    id: `targets-trails-${id}`,
    type: "line" as const,
    paint: {
      "line-color": [
        "case",
        ["get", "isMoving"],
        targetColors.moving,
        targetColors.stopped,
      ] as unknown as string,
      "line-width": 4,
      "line-dasharray": [1, 2],
      "line-opacity": 0.72,
      "line-blur": 0.65,
    },
  };

  return (
    <>
      {/* Canvas WebGL compartido para todos los marcadores 3D — UN solo contexto WebGL */}
      {use3DBoat && <BoatsSharedCanvas />}

      <Source id={`targets-trails-${id}`} type="geojson" data={trailsData}>
        <Layer {...trailLayer} />
      </Source>

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

          // Modo 3D: sólo para barcos (catId === 2) cuando use3DBoat está activo
          const show3D = use3DBoat && catId === 2;

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
                    history={t.history}
                    moving={moving}
                    isSelected={isSelected}
                    size={64}
                  />
                  {t.nivel === 4 && (
                    <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ping pointer-events-none" />
                  )}
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget(isSelected ? null : t.id);
                  }}
                  className={[
                    "relative cursor-pointer flex items-center justify-center",
                    "w-15 h-15 rounded-full  transition-all",
                    moving
                      ? "border-sky-400 shadow-[0_0_1px_5px_rgba(56,189,248,0.5)]"
                      : "border-text-200/30",
                    isSelected
                      ? "ring-2 ring-white scale-120 bg-bg-300"
                      : "hover:scale-110",
                  ].join(" ")}
                >
                  <Icon
                    size={20}
                    stroke={2}
                    className={moving ? "text-sky-300" : "text-text-200/50"}
                  />
                  {t.nivel === 4 && (
                    <span className="absolute inset-0 rounded-full border-2 border-sky-400/60 animate-ping" />
                  )}
                </div>
              )}
            </Marker>
          );
        })}

      {selected && (
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
                Detección: {selected.id.replace(/^(nanoRadar|spotter)_/, "")}
              </h4>
              <ul className="tracking-[0.12rem]">
                <li>
                  Radar:{" "}
                  <span className="text-brand-200 font-bold">
                    {selected.deviceType === "nanoRadar"
                      ? "NanoRadar"
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

