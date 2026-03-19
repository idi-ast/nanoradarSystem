import { memo, useState } from "react";
import { IconCaretRightFilled, IconChevronDown } from "@tabler/icons-react";
import type { RadarConfig } from "../../types";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";

interface Props {
  config: RadarConfig;
}

const formatCoord = (val: string | number) =>
  parseFloat(String(val)).toFixed(5);

export const RadarInfoOverlay = memo(function RadarInfoOverlay({
  config,
}: Props) {
  const { data } = useConfigDevices();
  const nanoradares = data?.data?.nanoradares ?? [];
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const active =
    (selectedId !== null
      ? nanoradares.find((nr) => nr.id === selectedId)
      : nanoradares[0]) ??
    ({
      latitud: config.latitud,
      longitud: config.longitud,
      radio: config.radio,
      azimut: config.azimut,
      apertura: config.apertura,
      nombre: "Radar principal",
      direccionIp: undefined,
      color: undefined,
    } as const);

  const canSwitch = nanoradares.length > 1;

  return (
    <div className="absolute top-1 left-1 z-10 pointer-events-none w-full max-w-5xl">
      <div className="bg-bg-400 flex items-center justify-around font-semibold text-[10px] text-text-400 p-3 rounded-md w-full">
        <div className="pointer-events-auto relative">
          <button
            onClick={() => canSwitch && setOpen((v) => !v)}
            className={`flex items-center gap-1.5 uppercase tracking-[0.25em] text-[9px] text-text-400 transition-colors ${canSwitch ? "hover:opacity-70 cursor-pointer" : "cursor-default"}`}
          >
            <span className="text-emerald-500/80">
              <IconCaretRightFilled size={15} />
            </span>
            Telemetría Radar
            <span className="text-text-400 mx-0.5">|</span>
            {"color" in active && active.color && (
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: active.color }}
              />
            )}
            <span className="font-light text-text-400 normal-case tracking-[0.25em]">
              {active.nombre}
            </span>
            {canSwitch && (
              <IconChevronDown
                size={11}
                className={`text-text-400/60 transition-transform ${open ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {open && canSwitch && (
            <div className="absolute top-full tracking-[0.25em] left-40 mt-3 bg-bg-400/85 backdrop-blur-sm shadow-xl min-w-50 overflow-hidden z-50">
              {nanoradares.map((nr) => (
                <button
                  key={nr.id}
                  onClick={() => {
                    setSelectedId(nr.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors flex items-center gap-2 ${
                    active.nombre === nr.nombre
                      ? "bg-bg-100 text-text-100"
                      : "text-text-400 hover:bg-bg-300 hover:text-text-100"
                  }`}
                >
                  {nr.color ? (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: nr.color }}
                    />
                  ) : (
                    active.nombre === nr.nombre && (
                      <span className="text-emerald-500">●</span>
                    )
                  )}
                  <span>{nr.nombre}</span>
                  <span className="ml-auto font-light text-text-400/50 normal-case">
                    {nr.direccionIp}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {"direccionIp" in active && active.direccionIp && (
            <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
              IP:{" "}
              <span className="font-light text-text-400 normal-case">
                {active.direccionIp}
              </span>
            </p>
          )}
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Posición:{" "}
            <span className="font-light text-text-400">
              {formatCoord(active.latitud)}, {formatCoord(active.longitud)}
            </span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Radio:{" "}
            <span className="font-light text-text-400">{active.radio} m</span>
          </p>
          <p className="uppercase tracking-[0.25em] text-[9px] text-text-400">
            Az:{" "}
            <span className="font-light text-text-400">{active.azimut}°</span>
            <span className="text-text-400/40 mx-0.5">|</span>
            Ap:{" "}
            <span className="font-light text-text-400">{active.apertura}°</span>
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
