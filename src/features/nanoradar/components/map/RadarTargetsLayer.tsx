import { useMemo } from "react";
import { Source, Layer, Popup } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarTarget } from "../../types";
import { toGeoCoord } from "./utils/geoHelpers";

interface Props {
  targets: RadarTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
}

/**
 * Capa de objetivos radar en tiempo real sobre Mapbox GL.
 * Renderiza:
 *  - Estela de trayectoria (LineString dashed)
 *  - Punto de detección actual (circle)
 *  - Halo de pulso para objetivos críticos (nivel 4)
 *  - Popup con info al seleccionar un objetivo
 */
export function RadarTargetsLayer({ targets, selectedTargetId, onSelectTarget }: Props) {
  const selected = targets.find((t) => t.id === selectedTargetId) ?? null;

  // GeoJSON de puntos actuales
  const pointsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: targets.map((t) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [t.lon, t.lat],
        },
        properties: {
          id: t.id,
          nivel: t.nivel,
          zona: t.zona,
        },
      })),
    }),
    [targets]
  );

  // GeoJSON de estelas (historial de posiciones)
  const trailsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: targets
        .filter((t) => t.history.length > 1)
        .map((t) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            // History está en [lat, lon]; convertir a [lon, lat]
            coordinates: t.history.map(toGeoCoord),
          },
          properties: { id: t.id, nivel: t.nivel },
        })),
    }),
    [targets]
  );

  const trailLayer = {
    id: "targets-trails",
    type: "line" as const,
    paint: {
      "line-color": ["case", ["==", ["get", "nivel"], 4], "#ef4444", "#DC143C"] as unknown as string,
      "line-width": 2,
      "line-dasharray": [1, 6],
      "line-opacity": 0.8,
    },
  };

  const circleLayer = {
    id: "targets-circles",
    type: "circle" as const,
    paint: {
      "circle-radius": ["case", ["==", ["get", "nivel"], 4], 7, 4] as unknown as number,
      "circle-color": ["case", ["==", ["get", "nivel"], 4], "#ef4444", "#8B0000"] as unknown as string,
      "circle-stroke-width": 2,
      "circle-stroke-color": ["case", ["==", ["get", "nivel"], 4], "#fca5a5", "#DC143C"] as unknown as string,
      "circle-opacity": 1,
    },
  };

  // Halo para objetivos críticos (nivel 4)
  const haloLayer = {
    id: "targets-halo",
    type: "circle" as const,
    filter: ["==", ["get", "nivel"], 4] as unknown as FilterSpecification,
    paint: {
      "circle-radius": 20,
      "circle-color": "#ef4444",
      "circle-opacity": 0.15,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ef4444",
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
          <div className="font-mono text-xs text-slate-800 min-w-40">
            <b className="block border-b border-slate-300 mb-1 pb-1">
              ID: {selected.id}
            </b>
            ZONA: {selected.zona || "N/A"}<br />
            NIVEL: {selected.nivel}<br />
            POS: {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
          </div>
        </Popup>
      )}
    </>
  );
}
