import { useEffect, useMemo, useState, useCallback } from "react";
import { Source, Layer, Popup } from "react-map-gl";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import { GLTFLoader } from "@loaders.gl/gltf";
import { registerLoaders } from "@loaders.gl/core";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarTarget } from "../../types";
import { toGeoCoord } from "./utils/geoHelpers";
import { DeckOverlay } from "@/components/baseMap/components/DeckOverlay";

// Registrar cargador de modelos 3D
registerLoaders([GLTFLoader]);

const MOVING_COLOR = "#00bfff";
const STOPPED_COLOR = "#ef4444";
const COLOR_REFRESH_MS = 1000;

function isTargetMoving(target: RadarTarget, now: number, trackingActiveMs: number): boolean {
  return now - target.lastUpdate <= trackingActiveMs;
}

interface Props {
  targets: RadarTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
  markerModelSrc?: string;
  markerSizeScale?: number;
  /** Orientación del modelo en grados [pitch, yaw, roll]. Default: [0, 0, 90] */
  markerOrientation?: [number, number, number];
  /** Modo de iluminación: "flat" (sin sombras) | "pbr" (físico). Default: "flat" */
  markerLighting?: "flat" | "pbr";
  /** Color RGBA para targets en movimiento. Default: [0, 191, 255, 255] */
  movingColor?: [number, number, number, number];
  /** Color RGBA para targets detenidos. Default: [239, 68, 68, 255] */
  stoppedColor?: [number, number, number, number];
  /** Tiempo en ms tras el cual un target se considera detenido. Default: 4000 */
  trackingActiveMs?: number;
  /** Altura base del modelo en metros sobre el suelo. Default: 0 */
  markerElevation?: number;
  /** Opacidad del modelo 3D (0–1). Default: 1 */
  markerOpacity?: number;
  /** Ancho de las trazas de recorrido en píxeles. Default: 2 */
  trailWidth?: number;
  /** Opacidad de las trazas (0–1). Default: 0.8 */
  trailOpacity?: number;
}

export function RadarTargetsLayer({
  targets,
  selectedTargetId,
  onSelectTarget,
  markerModelSrc = "/3d/point.glb",
  markerSizeScale = 0.6,
  markerOrientation = [0, 0, 90],
  markerLighting = "flat" as const,
  movingColor = [0, 191, 255, 255],
  stoppedColor = [239, 68, 68, 255],
  trackingActiveMs = 4000,
  markerElevation = 0,
  markerOpacity = 1,
  trailWidth = 2,
  trailOpacity = 0.8,
}: Props) {
  const [now, setNow] = useState(0);
  const selected = targets.find((t) => t.id === selectedTargetId) ?? null;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, COLOR_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const targetsWithMoving = useMemo(
    () =>
      targets.map((t) => ({
        ...t,
        isMoving: isTargetMoving(t, now, trackingActiveMs),
      })),
    [targets, now, trackingActiveMs],
  );

  const pointsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: targetsWithMoving.map((t) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [t.lon, t.lat],
        },
        properties: {
          id: t.id,
          nivel: t.nivel,
          zona: t.zona,
          isMoving: t.isMoving,
        },
      })),
    }),
    [targetsWithMoving],
  );

  const trailsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: targets
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
            isMoving: isTargetMoving(t, now, trackingActiveMs),
          },
        })),
    }),
    [targets, now, trackingActiveMs],
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
      "line-width": trailWidth,
      "line-opacity": trailOpacity,
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

  const handleClick = useCallback(
    (info: { object?: RadarTarget & { isMoving: boolean } }) => {
      if (info.object) {
        onSelectTarget(info.object.id);
      }
    },
    [onSelectTarget],
  );

  const movingColorRgba: [number, number, number, number] = [
    movingColor[0], movingColor[1], movingColor[2],
    Math.round(movingColor[3] * markerOpacity),
  ];
  const stoppedColorRgba: [number, number, number, number] = [
    stoppedColor[0], stoppedColor[1], stoppedColor[2],
    Math.round(stoppedColor[3] * markerOpacity),
  ];

  const scenegraphLayer = new ScenegraphLayer({
    id: "targets-3d-models",
    data: targetsWithMoving,
    scenegraph: markerModelSrc,
    sizeScale: markerSizeScale * 80,
    loaders: [GLTFLoader],
    getPosition: (d) => [d.lon, d.lat, markerElevation],
    getColor: (d) => (d.isMoving ? movingColorRgba : stoppedColorRgba),
    getOrientation: markerOrientation,
    _lighting: markerLighting,
    _animations: {
      "*": { playing: true },
    },
    pickable: true,
    onClick: handleClick,
    transitions: {
      getColor: 600,
    },
    updateTriggers: {
      getColor: [now, movingColor, stoppedColor, markerOpacity],
    },
    onError: (error) => console.error("Error cargando modelo 3D:", error),
  });

  const deckLayers = useMemo(
    () => [scenegraphLayer],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetsWithMoving, markerModelSrc, markerSizeScale, markerOrientation, markerLighting, markerElevation, movingColorRgba, stoppedColorRgba],
  );

  return (
    <>
      <Source id="targets-trails" type="geojson" data={trailsData}>
        <Layer {...trailLayer} />
      </Source>

      <Source id="targets-points" type="geojson" data={pointsData}>
        <Layer {...haloLayer} />
      </Source>

      <DeckOverlay layers={deckLayers} />

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
