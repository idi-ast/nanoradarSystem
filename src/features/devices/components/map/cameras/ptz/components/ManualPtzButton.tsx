import { memo, useState, useCallback, useRef, useEffect } from "react";
import { IconDeviceGamepad2, IconCamera, IconChevronDown } from "@tabler/icons-react";
import { Tooltip } from "@/components/ui";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { PtzDpad } from "./PtzDpad";
import {
  ptzPauseTracking,
  ptzResumeTracking,
  ptzZoom,
  PTZ_SPEED_X,
} from "../service";

const BTN_CLS =
  "relative text-text-100 hover:text-text-400 hover:bg-bg-450 outline outline-transparent p-0.5 bg-bg-100 rounded h-10 w-10 flex justify-center items-center transition-all";

const ManualPtzButton = memo(function ManualPtzButton() {
  const [open, setOpen] = useState(false);
  const [selectedPtzId, setSelectedPtzId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data } = useConfigDevices();
  const ptzList = data?.data?.ptz ?? [];

  useEffect(() => {
    if (ptzList.length > 0 && selectedPtzId === null) {
      setSelectedPtzId(ptzList[0].id);
    }
  }, [ptzList, selectedPtzId]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentPtzIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open || selectedPtzId === null) {
      if (currentPtzIdRef.current !== null) {
        ptzResumeTracking(currentPtzIdRef.current);
        currentPtzIdRef.current = null;
      }
      return;
    }
    currentPtzIdRef.current = selectedPtzId;
    ptzPauseTracking(selectedPtzId);
    return () => {
      if (currentPtzIdRef.current !== null) {
        ptzResumeTracking(currentPtzIdRef.current);
        currentPtzIdRef.current = null;
      }
    };
  }, [open, selectedPtzId]);

  useEffect(() => {
    return () => {
      if (currentPtzIdRef.current !== null) {
        ptzResumeTracking(currentPtzIdRef.current);
      }
    };
  }, []);

  const handleToggle = useCallback(() => setOpen((v) => !v), []);

  if (ptzList.length === 0) return null;

  const selectedPtz = ptzList.find((p) => p.id === selectedPtzId) ?? ptzList[0];
  const ptzId = selectedPtz.id;

  return (
    <div className="relative z-50" ref={panelRef}>
      <Tooltip text="Control manual PTZ" side="bottom">
        <button
          onClick={handleToggle}
          className={
            open
              ? "bg-bg-100 text-text-100 z-100 relative hover:text-text-300 outline outline-transparent p-0.5 rounded h-10 w-10 flex justify-center items-center transition-all"
              : BTN_CLS
          }
        >
          <IconDeviceGamepad2 size={20} />
        </button>
      </Tooltip>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 right-12 z-50 animate-fade-in-left animate-duration-100 bg-bg-100 border border-border shadow-xl rounded-lg p-3 min-w-52">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
              <IconCamera size={14} className="text-text-200" />
              <span className="text-xs font-semibold text-text-100 uppercase tracking-wider">
                Control Manual
              </span>
            </div>

            {ptzList.length > 1 && (
              <div className="relative mb-2">
                <select
                  value={ptzId}
                  onChange={(e) => setSelectedPtzId(Number(e.target.value))}
                  className="w-full appearance-none bg-bg-200 text-text-100 text-xs font-medium rounded px-3 py-2 pr-8 border border-border focus:outline-none focus:ring-1 focus:ring-brand-200 cursor-pointer"
                >
                  {ptzList.map((ptz) => (
                    <option key={ptz.id} value={ptz.id}>
                      {ptz.nombre}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-200 pointer-events-none"
                />
              </div>
            )}

            {ptzList.length === 1 && (
              <div className="mb-2 text-[11px] text-text-200 font-medium">
                {selectedPtz.nombre}
              </div>
            )}

            <div className="flex justify-center mb-2">
              <PtzDpad ptz_id={ptzId} disableAutoTracking />
            </div>

            <div className="flex justify-center gap-1">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm text-xs font-bold"
                title="Zoom -"
                onClick={() => ptzZoom(ptzId, -PTZ_SPEED_X)}
              >
                Z-
              </button>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 active:bg-brand-200/30 text-white/80 hover:text-white transition-colors border border-white/10 backdrop-blur-sm text-xs font-bold"
                title="Zoom +"
                onClick={() => ptzZoom(ptzId, PTZ_SPEED_X)}
              >
                Z+
              </button>
            </div>

            <p className="text-[9px] text-text-200/50 text-center mt-2 leading-tight">
              Tracking pausado — se reanuda al cerrar
            </p>
          </div>
        </>
      )}
    </div>
  );
});

export default ManualPtzButton;
