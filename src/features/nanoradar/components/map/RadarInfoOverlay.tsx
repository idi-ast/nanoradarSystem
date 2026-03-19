import { memo } from "react";
import { IconCaretRightFilled, IconMapPin } from "@tabler/icons-react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";

export interface MapCenter {
  lat: number;
  lng: number;
}

interface Props {
  mapCenter: MapCenter;
}

const formatCoord = (val: number) => val.toFixed(5);

function Sep() {
  return <span className="text-text-400/25 mx-0.5">|</span>;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
      {label}:{" "}
      <span
        className={`font-light normal-case ${
          accent ? "text-emerald-500" : "text-text-400"
        }`}
      >
        {value}
      </span>
    </span>
  );
}

export const RadarInfoOverlay = memo(function RadarInfoOverlay({
  mapCenter,
}: Props) {
  const { data } = useConfigDevices();
  const nanoradares = data?.data?.nanoradares ?? [];
  const spotters = data?.data?.spotters ?? [];
  const camaras = data?.data?.camaras ?? [];

  const total = nanoradares.length + spotters.length + camaras.length;
  // Todos los dispositivos configurados se consideran activos hasta que la API provea estado
  const activos = total;
  const inactivos = 0;

  return (
    <div className="absolute top-1 left-1 z-50 pointer-events-none w-full max-w-5xl">
      <div className="bg-bg-400 flex items-center gap-3 font-semibold text-[10px] text-text-400 px-4 py-2.5 rounded-md w-full">
        <div className="flex items-center gap-1.5 shrink-0">
          <IconCaretRightFilled size={13} className="text-emerald-500/80" />
          <span className="uppercase tracking-[0.25em] text-[9px]">Sistema</span>
        </div>

        <Sep />

        <Stat label="Dispositivos" value={total} />
        <span className="text-text-400/30">·</span>
        <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
          NR:{" "}
          <span className="font-light">{nanoradares.length}</span>
        </span>
        <span className="text-text-400/30">·</span>
        <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
          SP:{" "}
          <span className="font-light">{spotters.length}</span>
        </span>
        <span className="text-text-400/30">·</span>
        <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
          CM:{" "}
          <span className="font-light">{camaras.length}</span>
        </span>

        <Sep />

        <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
          Activos:{" "}
          <span className="font-light text-emerald-500">{activos}</span>
        </span>
        <span className="text-text-400/30">·</span>
        <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
          Inactivos:{" "}
          <span className="font-light text-red-400/70">{inactivos}</span>
        </span>

        <Sep />

        <div className="flex items-center gap-1.5">
          <IconMapPin size={11} className="text-text-400/50 shrink-0" />
          <span className="uppercase tracking-[0.2em] text-[9px] text-text-400">
            Vista:{" "}
            <span className="font-light text-text-400 normal-case">
              {formatCoord(mapCenter.lat)}, {formatCoord(mapCenter.lng)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});
