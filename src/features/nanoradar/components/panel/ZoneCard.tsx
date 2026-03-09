import type { RadarZone } from "../../types";

interface Props {
  zone: RadarZone;
}

export function ZoneCard({ zone }: Props) {
  return (
    <div className="relative bg-bg-200  rounded-xl overflow-hidden">
      <div
        className="absolute blur-xl left-0 top-0 w-full h-full "
        style={{
          backgroundColor: `${zone.poligono.color}`,
        }}
      ></div>
      <div className="relative bg-linear-to-r from-bg-200 from-25% to-bg-100/40 p-2 w-full h-full">
        <p className="text-sm font-bold text-text-100 uppercase">
          {zone.nombre}
        </p>
        <p className="text-[10px] text-text-200">{zone.descripcion}</p>
        <div
          className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded"
          style={{
            backgroundColor: `${zone.poligono.color}`,
          }}
        ></div>
      </div>
    </div>
  );
}
