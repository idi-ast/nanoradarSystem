import { useEffect, useMemo, useState } from "react";
import { Source, Layer, Popup } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarTarget } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { toGeoCoord } from "./utils/geoHelpers";

const MOVING_COLOR = "#00bfff";
const STOPPED_COLOR = "#ef4444";
const TRACKING_ACTIVE_MS = 4000;
const COLOR_REFRESH_MS = 1000;

function isTargetMoving(target: RadarTarget, now: number): boolean {
  return now - target.lastUpdate <= TRACKING_ACTIVE_MS;
}

interface Props {
  targets: RadarTarget[];
  historyRange?: HistoryRange;
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
}

export function RadarTargetsLayer({
  targets,
  historyRange = { start: 0, end: 100 },
  selectedTargetId,
  onSelectTarget,
}: Props) {
  const slicedTargets = useMemo(() => {
    // Calcular el eje de tiempo global a partir de todos los puntos del historial
    let tMin = Infinity;
    let tMax = -Infinity;
    for (const t of targets) {
      for (const p of t.history) {
        if (p[2] < tMin) tMin = p[2];
        if (p[2] > tMax) tMax = p[2];
      }
    }

    // Sin suficientes datos temporales → mostrar todo
    if (!isFinite(tMin) || tMax === tMin) return targets;

    const tRange = tMax - tMin;
    const tStart  = tMin + (historyRange.start / 100) * tRange;
    const tEnd    = tMin + (historyRange.end   / 100) * tRange;

    return targets
      .map((t) => ({
        ...t,
        history: t.history.filter((p) => p[2] >= tStart && p[2] <= tEnd),
      }))
      .filter((t) => t.history.length > 0);
  }, [targets, historyRange]);
  const [now, setNow] = useState(0);
  const selected = targets.find((t) => t.id === selectedTargetId) ?? null;

  // Fuerza refresco periódico para que el color pase de azul a rojo
  // cuando un objetivo deja de recibir trackeo.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, COLOR_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const pointsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: slicedTargets
        .filter((t) => t.history.length > 0)
        .map((t) => {
          // Usar el último punto del historial recortado como posición del círculo.
          // Si end=100 esto coincide con t.lat/t.lon (posición en vivo).
          const lastPoint = t.history[t.history.length - 1];
          const lat = lastPoint[0];
          const lon = lastPoint[1];
          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [lon, lat],
            },
            properties: {
              id: t.id,
              nivel: t.nivel,
              zona: t.zona,
              isMoving: isTargetMoving(t, now),
            },
          };
        }),
    }),
    [slicedTargets, now],
  );

  const trailsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: slicedTargets
        .filter((t) => t.history.length > 1)
        .map((t) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            // History está en [lat, lon]; convertir a [lon, lat]
            coordinates: t.history.map(toGeoCoord),
          },
          properties: {
            id: t.id,
            nivel: t.nivel,
            isMoving: isTargetMoving(t, now),
          },
        })),
    }),
    [slicedTargets, now],
  );

  const trailLayer = {
    id: "targets-trails",
    type: "line" as const,
    paint: {
      "line-color": [
        "case",
        ["get", "isMoving"],
        MOVING_COLOR,
        STOPPED_COLOR,
      ] as unknown as string,
      "line-width": 2,
      "line-dasharray": [1, 2],
      "line-opacity": 0.8,
    },
  };

  const circleLayer = {
    id: "targets-circles",
    type: "circle" as const,
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "nivel"], 3],
        4,
        6,
      ] as unknown as number,
      "circle-color": [
        "case",
        ["get", "isMoving"],
        MOVING_COLOR,
        STOPPED_COLOR,
      ] as unknown as string,
      "circle-stroke-width": 3,
      "circle-stroke-color": [
        "case",
        ["get", "isMoving"],
        "#7dd3fc",
        "#fca5a5",
      ] as unknown as string,
      "circle-opacity": 0.8,
    },
  };

  const haloLayer = {
    id: "targets-halo",
    type: "circle" as const,
    filter: ["==", ["get", "nivel"], 4] as unknown as FilterSpecification,
    paint: {
      "circle-radius": 20,
      "circle-color": [
        "case",
        ["get", "isMoving"],
        MOVING_COLOR,
        STOPPED_COLOR,
      ] as unknown as string,
      "circle-opacity": 0.15,
      "circle-stroke-width": 1,
      "circle-stroke-color": [
        "case",
        ["get", "isMoving"],
        MOVING_COLOR,
        STOPPED_COLOR,
      ] as unknown as string,
      "circle-stroke-opacity": 0.4,
    },
  };

  return (
    <>
      <Source id="targets-trails" type="geojson" data={trailsData}>
        <Layer {...trailLayer} />
      </Source>

      <Source id="targets-points" type="geojson" data={pointsData}>
        <Layer {...haloLayer} />
        <Layer {...circleLayer} />
      </Source>

      {selected && (
        <Popup
          longitude={selected.lon}
          latitude={selected.lat}
          anchor="bottom"
          offset={12}
          closeButton
          onClose={() => onSelectTarget(null)}
        >
          <div className="font-mono text-xs text-text-100 bg-bg-100 p-3 min-w-40">
            <b className="block border-b border-border-200 mb-1 pb-1">
              ID: {selected.id}
            </b>
            Zona: {selected.zona || "N/A"}
            <br />
            Nivel: {selected.nivel}
            <br />
            Pos: {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
          </div>
        </Popup>
      )}
    </>
  );
}
