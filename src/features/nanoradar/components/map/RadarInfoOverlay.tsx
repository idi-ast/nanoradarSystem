import type { RadarConfig } from "../../types";

interface Props {
  config: RadarConfig;
}

export function RadarInfoOverlay({ config }: Props) {
  return (
    <div className="absolute top-1 left-1 z-1000 pointer-events-none w-full max-w-7xl">
      <div className="bg-bg-400 flex items-center justify-around font-semibold text-[10px] text-text-400 p-3 rounded-md w-full">
        <div className="">
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400 ">
            Telemetria Radar
          </p>
        </div>
        <div className="flex gap-2">
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Radar posición:{" "}
            <span className="font-light text-text-400">
              {config.latitud}, {config.longitud}
            </span>{" "}
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Radio de detección:{" "}
            <span className="font-light text-text-400">{config.radio} m</span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Azimut:{" "}
            <span className="font-light text-text-400">
              {config.azimut}° | Apertura: {config.apertura}°
            </span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Estado:{" "}
            <span className="text-emerald-500 animate-pulse">En linea</span>
          </p>
        </div>
      </div>
    </div>
  );
}
