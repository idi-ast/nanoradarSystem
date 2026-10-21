import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import { toGeoCoord } from "./utils/geoHelpers";
import { useRadarContext } from "../../context/useRadarContext";
import { IconTrash } from "@tabler/icons-react";

interface Props {
  points: [number, number][];
  color: string;
  onUpdatePoint?: (index: number, lat: number, lng: number) => void;
  onRemovePoint?: (index: number) => void;
}

export function DrawingPreviewLayer({ points, color, onUpdatePoint, onRemovePoint }: Props) {
  const { instanceConfig } = useRadarContext();
  const id = instanceConfig.id;

  const polygonData = useMemo(() => {
    if (points.length < 2) return null;
    const geoCoords = points.map(toGeoCoord);
    const closed = [...geoCoords, geoCoords[0]];
    return {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [closed] },
      properties: {},
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <>
      {polygonData && (
        <Source id={`drawing-preview-poly-${id}`} type="geojson" data={polygonData}>
          <Layer
            id={`drawing-preview-fill-${id}`}
            type="fill"
            paint={{ "fill-color": color, "fill-opacity": 0.18 }}
          />
          <Layer
            id={`drawing-preview-line-${id}`}
            type="line"
            paint={{
              "line-color": color,
              "line-width": 2.5,
              "line-dasharray": [5, 4],
            }}
          />
        </Source>
      )}

      {/* Vértices arrastrables con el mouse */}
      {points.map((p, i) => (
        <Marker
          key={`drawing-vertex-${i}`}
          latitude={p[0]}
          longitude={p[1]}
          anchor="center"
          draggable={Boolean(onUpdatePoint)}
          onDrag={(e) => {
            onUpdatePoint?.(i, e.lngLat.lat, e.lngLat.lng);
          }}
        >
          <div
            className="group relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title={`Vértice ${i + 1} - Arrastra para mover`}
          >
            {/* Halo animado al hacer hover */}
            <div
              className="absolute w-8 h-8 rounded-full opacity-30 group-hover:opacity-75 transition-all scale-90 group-hover:scale-125 pointer-events-none"
              style={{ backgroundColor: color }}
            />
            {/* Círculo central con borde blanco */}
            <div
              className="relative w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-transform group-hover:scale-115"
              style={{ backgroundColor: color }}
            >
              <span className="text-[9px] font-black text-white font-mono leading-none">
                {i + 1}
              </span>
            </div>
            {/* Tooltip informativo con botón de eliminar */}
            <div className="absolute -top-8 px-2 py-0.5 rounded bg-black/95 text-[9px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/20 z-50 flex items-center gap-1.5 pointer-events-auto">
              <span>Punto {i + 1} (arrastrar)</span>
              {onRemovePoint && points.length > 1 && (
                <button
                  type="button"
                  title="Eliminar este punto"
                  className="hover:text-red-400 text-white/70 transition-colors p-0.5 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePoint(i);
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

