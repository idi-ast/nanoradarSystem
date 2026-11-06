import { useEffect, useState } from "react";
import { useMap } from "react-map-gl";

interface MapHealthProps {
  onRetry: () => void;
}

/** Mapbox restaura WebGL automáticamente; permitir recrearlo si no se recupera. */
export function MapHealth({ onRetry }: MapHealthProps) {
  const { current: map } = useMap();
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();
    const onLost = (event: Event) => {
      event.preventDefault();
      console.error("[Map] Contexto WebGL perdido");
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
      map.resize();
      map.triggerRepaint();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [map]);

  if (!contextLost) return null;
  return (
    <div role="alert" className="absolute top-20 left-4 z-50 max-w-sm rounded border border-border bg-bg-100 p-4 text-text-100 shadow-lg">
      <p>Se perdió la conexión gráfica del mapa. Intentando recuperar…</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded border border-border px-3 py-2">
        Reiniciar mapa
      </button>
    </div>
  );
}
