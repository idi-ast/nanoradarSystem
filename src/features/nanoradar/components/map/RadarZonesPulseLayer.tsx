import { memo, useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { useRadarContext } from "../../context/useRadarContext";
import { useRadarTargets } from "../../context/useRadarContext";
import { toGeoCoord } from "./utils/geoHelpers";
import { useRadarAnimation } from "../../hooks/useRadarAnimation";
import { useActiveZoneIds } from "../../hooks/useActiveZoneIds";


export const RadarZonesPulseLayer = memo(function RadarZonesPulseLayer() {
  const { instanceConfig, zones } = useRadarContext();
  const { targets } = useRadarTargets();
  const id = instanceConfig.id;
  const phase = useRadarAnimation();
  const activeZoneIds = useActiveZoneIds(targets, zones);

  const activeZones = useMemo(
    () => zones.filter((z) => activeZoneIds.has(z.id?.toString() ?? z.nombre)),
    [zones, activeZoneIds],
  );

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: activeZones.map((zone, idx) => {
        const rawVertices = Array.isArray(zone.poligono.vertices)
          ? zone.poligono.vertices
          : Object.values(zone.poligono.vertices);
        const coords = rawVertices.map(toGeoCoord);
        if (coords.length > 0) coords.push(coords[0]);
        return {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [coords] },
          properties: { color: zone.poligono.color, id: idx },
        };
      }),
    }),
    [activeZones],
  );

  if (activeZones.length === 0) return null;

  const sin = Math.abs(Math.sin(phase * Math.PI * 2));
  const fillOpacity = 0.15 + 0.45 * sin;
  const lineWidth = 2 + 3 * sin;

  return (
    <Source id={`alert-zones-pulse-${id}`} type="geojson" data={data}>
      <Layer
        id={`alert-zones-pulse-fill-${id}`}
        type="fill"
        paint={{
          "fill-color": ["get", "color"] as unknown as string,
          "fill-opacity": fillOpacity,
        }}
      />
      <Layer
        id={`alert-zones-pulse-line-${id}`}
        type="line"
        paint={{
          "line-color": ["get", "color"] as unknown as string,
          "line-width": lineWidth,
          "line-blur": 2,
        }}
      />
    </Source>
  );
});
