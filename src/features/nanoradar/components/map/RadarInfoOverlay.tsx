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
    <div className="absolute top-3 left-3 z-1000 pointer-events-none">
      <div className="radar-chip font-semibold text-[10px] text-emerald-100/90 p-3 rounded-md min-w-64">
        <p className="uppercase tracking-[0.25em] text-[9px] text-emerald-300/70 mb-2">
          Telemetria Radar
        </p>
        <p>
          Radar posición:{" "}
          <span className="font-light text-emerald-100/80">
            {config.latitud}, {config.longitud}
          </span>{" "}
        </p>
        <p>
          Radio de detección:{" "}
          <span className="font-light text-emerald-100/80">{config.radio} m</span>
        </p>
        <p>
          Azimut:{" "}
          <span className="font-light text-emerald-100/80">
            {config.azimut}° | Apertura: {config.apertura}°
          </span>
        </p>
        <p>
          Estado:{" "}
          <span className="text-emerald-300 animate-pulse">En linea</span>
        </p>
      </div>
    </div>
  );
}
