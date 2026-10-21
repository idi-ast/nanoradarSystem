import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import { toGeoCoord } from "./utils/geoHelpers";
import { useZoneEditStore } from "../../stores/zoneEditStore";
import { useRadarContext } from "../../context/useRadarContext";
import { IconPlus, IconTrash } from "@tabler/icons-react";

export function ZoneEditLayer() {
  const { instanceConfig } = useRadarContext();
  const id = instanceConfig.id;

  const editingZoneId = useZoneEditStore((s) => s.editingZoneId);
  const vertices = useZoneEditStore((s) => s.vertices);
  const color = useZoneEditStore((s) => s.color);
  const updateVertex = useZoneEditStore((s) => s.updateVertex);
  const addVertex = useZoneEditStore((s) => s.addVertex);
  const removeVertex = useZoneEditStore((s) => s.removeVertex);

  const polygonData = useMemo(() => {
    if (!editingZoneId || vertices.length < 2) return null;
    const geoCoords = vertices.map(toGeoCoord);
    const closed = [...geoCoords, geoCoords[0]];
    return {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [closed] },
      properties: {},
    };
  }, [editingZoneId, vertices]);

  // Vértices intermedios (midpoints) para insertar puntos con 1 clic
  const midpoints = useMemo(() => {
    if (!editingZoneId || vertices.length < 2) return [];
    const pts: { lat: number; lng: number; insertIndex: number }[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const nextIndex = (i + 1) % vertices.length;
      const p1 = vertices[i];
      const p2 = vertices[nextIndex];
      pts.push({
        lat: (p1[0] + p2[0]) / 2,
        lng: (p1[1] + p2[1]) / 2,
        insertIndex: i + 1,
      });
    }
    return pts;
  }, [editingZoneId, vertices]);

  if (!editingZoneId || vertices.length === 0) return null;

  return (
    <>
      {polygonData && (
        <Source id={`zone-edit-poly-${id}`} type="geojson" data={polygonData}>
          <Layer
            id={`zone-edit-fill-${id}`}
            type="fill"
            paint={{
              "fill-color": color,
              "fill-opacity": 0.25,
            }}
          />
          <Layer
            id={`zone-edit-line-${id}`}
            type="line"
            paint={{
              "line-color": color,
              "line-width": 3,
              "line-dasharray": [4, 3],
            }}
          />
        </Source>
      )}

      {/* Puntos intermedios "+" para agregar vértices al polígono */}
      {midpoints.map((mid, idx) => (
        <Marker
          key={`midpoint-${idx}-${mid.lat}-${mid.lng}`}
          latitude={mid.lat}
          longitude={mid.lng}
          anchor="center"
        >
          <button
            type="button"
            className="w-4 h-4 rounded-full bg-bg-100/90 hover:bg-emerald-500 border border-emerald-400 text-emerald-400 hover:text-white flex items-center justify-center shadow transition-all scale-75 hover:scale-125 cursor-pointer z-40"
            title="Clic para insertar un vértice aquí"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              addVertex(mid.lat, mid.lng, mid.insertIndex);
            }}
          >
            <IconPlus size={10} stroke={3} />
          </button>
        </Marker>
      ))}

      {/* Vértices principales arrastrables con el mouse */}
      {vertices.map((v, i) => (
        <Marker
          key={`edit-vertex-${i}`}
          latitude={v[0]}
          longitude={v[1]}
          anchor="center"
          draggable
          onDrag={(e) => {
            updateVertex(i, e.lngLat.lat, e.lngLat.lng);
          }}
        >
          <div
            className="group relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Halo pulsante */}
            <div
              className="absolute w-8 h-8 rounded-full opacity-40 group-hover:opacity-90 transition-all scale-90 group-hover:scale-125 pointer-events-none"
              style={{ backgroundColor: color }}
            />
            {/* Círculo del vértice con borde blanco y número */}
            <div
              className="relative w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform group-hover:scale-115"
              style={{ backgroundColor: color }}
            >
              <span className="text-[10px] font-black text-white font-mono leading-none">
                {i + 1}
              </span>
            </div>

            {/* Menú flotante al hacer hover sobre el vértice */}
            <div className="absolute -top-8 px-2 py-0.5 rounded bg-black/95 text-[9px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/20 z-50 flex items-center gap-1.5 pointer-events-auto">
              <span>Punto {i + 1} (arrastrar)</span>
              {vertices.length > 3 && (
                <button
                  type="button"
                  title="Eliminar este vértice"
                  className="hover:text-red-400 text-white/70 transition-colors p-0.5"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVertex(i);
                  }}
                >
                  <IconTrash size={11} />
                </button>
              )}
            </div>
          </div>
        </Marker>
      ))}
    </>
  );
}
