import { memo, useState } from "react";
import { IconCaretRightFilled, IconChevronDown } from "@tabler/icons-react";
import type { RadarConfig } from "../../types";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";

interface Props {
  config: RadarConfig;
}

export const RadarInfoOverlay = memo(function RadarInfoOverlay({
  config,
}: Props) {
  const { data } = useConfigDevices();
  const nanoradares = data?.data?.nanoradares ?? [];
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = nanoradares.find((nr) => nr.id === selectedId);

  const active = selected ?? {
    latitud: config.latitud,
    longitud: config.longitud,
    radio: config.radio,
    azimut: config.azimut,
    apertura: config.apertura,
    nombre: "Radar principal",
  };

  return (
    <div className="absolute top-1 left-1 z-1000 pointer-events-none w-full max-w-7xl">
      <div className="bg-bg-400 flex items-center justify-around font-semibold text-[10px] text-text-400 p-3 rounded-md w-full">
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 uppercase tracking-[0.25em] text-[9px] text-text-400 hover:opacity-70 transition-colors"
          >
            <span className="text-emerald-500/80">
              <IconCaretRightFilled size={15} />
            </span>
            Telemetría Radar
            {nanoradares.length > 1 && (
              <>
                <span className="text-text-400 mx-0.5">|</span>
                <span className="font-light text-text-400 normal-case tracking-[0.25em]">
                  {active.nombre}
                </span>
                <IconChevronDown
                  size={11}
                  className={`text-text-400/60 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>

          {open && nanoradares.length > 1 && (
            <div className="absolute top-full tracking-[0.25em] left-40 mt-3 bg-bg-400/85 backdrop-blur-sm  shadow-xl min-w-50 overflow-hidden z-50">
              <button
                onClick={() => {
                  setSelectedId(null);
                  setOpen(false);
                }}
                className={`w-full text-left px-3  py-1.5 text-[10px] transition-colors flex items-center gap-2 ${
                  selectedId === null
                    ? "bg-bg-100 text-text-100"
                    : "text-text-400 hover:bg-bg-100 hover:text-text-100"
                }`}
              >
                {selectedId === null && (
                  <span className="text-emerald-500">●</span>
                )}
                Radar principal
              </button>
              {nanoradares.map((nr) => (
                <button
                  key={nr.id}
                  onClick={() => {
                    setSelectedId(nr.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors flex items-center gap-2 ${
                    selectedId === nr.id
                      ? "bg-bg-100 text-text-100"
                      : "text-text-400 hover:bg-bg-300 hover:text-text-100"
                  }`}
                >
                  {selectedId === nr.id && (
                    <span className="text-emerald-500">●</span>
                  )}
                  {nr.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Posición:{" "}
            <span className="font-light text-text-400">
              {active.latitud}, {active.longitud}
            </span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Radio:{" "}
            <span className="font-light text-text-400">{active.radio} m</span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Azimut:{" "}
            <span className="font-light text-text-400">
              {active.azimut}° | Apertura: {active.apertura}°
            </span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Estado:{" "}
            <span className="text-emerald-500 animate-pulse">En línea</span>
          </p>
        </div>
      </div>
    </div>
  );
});
