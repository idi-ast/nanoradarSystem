import type { RadarConfig } from "../../types";

interface Props {
  config: RadarConfig;
}

/**
 * Overlay informativo en la esquina superior izquierda del mapa
 * con las coordenadas y parámetros del radar.
 */
export function RadarInfoOverlay({ config }: Props) {
  return (
    <div className="absolute font-semibold top-2 left-2 z-1000 bg-bg-100/80 p-3 border border-border text-[10px] text-text-100  pointer-events-none">
      <div>
        <p>
          Radar posición:{" "}
          <span className="font-light">
            {config.latitud}, {config.longitud}
          </span>{" "}
        </p>
        <p>
          Radio de detección:{" "}
          <span className="font-light">{config.radio} m</span>
        </p>
        <p>
          Azimut:{" "}
          <span className="font-light">
            {config.azimut}° | Apertura: {config.apertura}°
          </span>
        </p>
        <p>
          Estado:{" "}
          <span className="text-emerald-300 animate-pulse">En línea</span>
        </p>
      </div>
    </div>
  );
}
