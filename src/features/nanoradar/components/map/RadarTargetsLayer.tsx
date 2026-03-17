import { useEffect, useMemo, useState } from "react";
import { Source, Layer, Popup } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarTarget } from "../../types";
import type { HistoryRange } from "../controls/HistoryRangeBar";
import { toGeoCoord } from "./utils/geoHelpers";
import { useRadarContext } from "../../context/useRadarContext";

function isTargetMoving(
  target: RadarTarget,
  now: number,
  trackingActiveMs: number,
): boolean {
  return now - target.lastUpdate <= trackingActiveMs;
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
  const { instanceConfig } = useRadarContext();
  const { targetColors, timing } = instanceConfig;
  const id = instanceConfig.id;
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
              deviceType: t.deviceType,
              isMoving: isTargetMoving(t, now, timing.TRACKING_ACTIVE_MS),
            },
          };
        }),
    }),
    [slicedTargets, now, timing.TRACKING_ACTIVE_MS],
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
        [
          "all",
          ["==", ["get", "deviceType"], "nanoRadar"],
          ["get", "isMoving"],
        ],
        "#4ade80",
        [
          "case",
          ["get", "isMoving"],
          targetColors.moving,
          targetColors.stopped,
        ],
      ] as unknown as string,
      "line-width": 4,
      "line-dasharray": [1, 2],
      "line-opacity": 0.72,
      "line-blur": 0.65,
    },
  };

  const circleLayer = {
    id: `targets-circles-${id}`,
    type: "circle" as const,
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "nivel"], 3],
        4,
        5,
      ] as unknown as number,
      "circle-color": [
        "case",
        [
          "all",
          ["==", ["get", "deviceType"], "nanoRadar"],
          ["get", "isMoving"],
        ],
        "#4ade80",
        [
          "case",
          ["get", "isMoving"],
          targetColors.moving,
          targetColors.stopped,
        ],
      ] as unknown as string,
      "circle-stroke-width": 2,
      "circle-stroke-color": [
        "case",
        [
          "all",
          ["==", ["get", "deviceType"], "nanoRadar"],
          ["get", "isMoving"],
        ],
        "#166534",
        [
          "case",
          ["get", "isMoving"],
          targetColors.movingStroke,
          targetColors.stoppedStroke,
        ],
      ] as unknown as string,
      "circle-opacity": 0.9,
    },
  };

  const haloLayer = {
    id: `targets-halo-${id}`,
    type: "circle" as const,
    filter: ["==", ["get", "nivel"], 4] as unknown as FilterSpecification,
    paint: {
      "circle-radius": 16,
      "circle-color": [
        "case",
        [
          "all",
          ["==", ["get", "deviceType"], "nanoRadar"],
          ["get", "isMoving"],
        ],
        "#4ade80",
        [
          "case",
          ["get", "isMoving"],
          targetColors.moving,
          targetColors.stopped,
        ],
      ] as unknown as string,
      "circle-opacity": 0.11,
      "circle-stroke-width": 1,
      "circle-stroke-color": [
        "case",
        [
          "all",
          ["==", ["get", "deviceType"], "nanoRadar"],
          ["get", "isMoving"],
        ],
        "#4ade80",
        [
          "case",
          ["get", "isMoving"],
          targetColors.moving,
          targetColors.stopped,
        ],
      ] as unknown as string,
      "circle-stroke-opacity": 0.3,
    },
  };

  return (
    <>
      <Source id={`targets-trails-${id}`} type="geojson" data={trailsData}>
        <Layer {...trailLayer} />
      </Source>

      <Source id={`targets-points-${id}`} type="geojson" data={pointsData}>
        <Layer {...haloLayer} />
        <Layer {...circleLayer} />
      </Source>

      {selected && (
        <Popup
          longitude={selected.lon}
          latitude={selected.lat}
          anchor="bottom"
          offset={12}
          closeButton={false}
          onClose={() => onSelectTarget(null)}
        >
          <div className="text-[12px] flex flex-col justify-center items-center text-text-100 bg-bg-100/50 backdrop-blur shadow shadow-2xl p-5 min-w-64 rounded-lg">
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
