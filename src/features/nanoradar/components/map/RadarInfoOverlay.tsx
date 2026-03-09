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
      <div className="absolute top-2 left-15 z-1000 bg-black/60 p-3 border border-emerald-500/50 text-[10px] text-emerald-400 font-mono pointer-events-none">
      RADAR_POS: {config.latitud}, {config.longitud}
      <br />
      RADIO DETECCION: {config.radio} m<br />
      AZIMUT: {config.azimut}° | APERTURA: {config.apertura}°
      <br />
      ESTADO: <span className="text-emerald-500 animate-pulse">ONLINE</span>
    </div>
  );
}
