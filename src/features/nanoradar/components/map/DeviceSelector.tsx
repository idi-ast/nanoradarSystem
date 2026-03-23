import { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconRadar,
  IconCurrentLocation,
  IconCamera,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconDevicesCog,
} from "@tabler/icons-react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import type {
  Nanoradares,
  Spotters,
  Camaras,
} from "@/features/config-devices/types/ConfigServices.type";
import type { DeviceVisibility } from "./DevicesOverlay";
import { NR_PALETTE } from "./devicesConfig";
import { DeviceEditPanel } from "./DeviceEditPanel";
import type { EditingDevice, LiveEditValues } from "./DeviceEditPanel";
import { Tooltip } from "@/components/ui";

interface DeviceSelectorProps {
  visibility: DeviceVisibility;
  onChange: (v: DeviceVisibility) => void;
  onEditNanoradar?: (device: Nanoradares) => void;
  onEditSpotter?: (device: Spotters) => void;
  onEditCamara?: (device: Camaras) => void;
  /** Estado de edición controlado desde el padre (p.ej. RadarMap) */
  editingDevice?: EditingDevice | null;
  liveEdit?: LiveEditValues | null;
  onLiveEditChange?: (v: LiveEditValues) => void;
  onEditClose?: () => void;
}

function toggleId(set: Set<number>, id: number): Set<number> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function allHidden(ids: number[], hidden: Set<number>) {
  return ids.length > 0 && ids.every((id) => hidden.has(id));
}

function DeviceRow({
  id,
  label,
  subtitle,
  accentColor,
  isHidden,
  onToggle,
  onEdit,
}: {
  id: number;
  label: string;
  subtitle?: string;
  accentColor: string;
  isHidden: boolean;
  onToggle: (id: number) => void;
  onEdit?: () => void;
}) {
  return (
    <div
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left ${isHidden ? "opacity-40" : ""}`}
    >
      <button
        onClick={() => onToggle(id)}
        className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: isHidden ? "#555" : accentColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-text-100 truncate">
            {label}
          </p>
          {subtitle && (
            <p className="text-[9px] text-text-100/40 truncate">{subtitle}</p>
          )}
        </div>
        {isHidden ? (
          <IconEyeOff size={13} className="shrink-0 text-text-100/30" />
        ) : (
          <IconEye size={13} className="shrink-0 text-text-100/50" />
        )}
      </button>

      {onEdit && (
        <button
          onClick={onEdit}
          className="shrink-0 p-1 rounded text-text-100/30 hover:text-text-100/80 hover:bg-bg-300/60 transition-colors"
          title="Editar"
        >
          <IconPencil size={12} />
        </button>
      )}
    </div>
  );
}

function GroupHeader({
  icon,
  title,
  count,
  allGroupHidden,
  onToggleAll,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  allGroupHidden: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-0.5">
      <span className="text-text-100/40">{icon}</span>
      <span className="flex-1 text-xs font-bold uppercase tracking-widest text-text-100/50">
        {title}
      </span>
      <span className="text-[9px] text-text-100/30 mr-1">{count}</span>
      <button
        onClick={onToggleAll}
        className="text-[9px] text-text-100/40 hover:text-text-100/70 transition-colors underline-offset-2 hover:underline"
      >
        {allGroupHidden ? "Mostrar" : "Ocultar"}
      </button>
    </div>
  );
}

export const DeviceSelector = memo(function DeviceSelector({
  visibility,
  onChange,
  onEditNanoradar,
  onEditSpotter,
  onEditCamara,
  editingDevice,
  liveEdit,
  onLiveEditChange,
  onEditClose,
}: DeviceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { data, isLoading } = useConfigDevices();

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPanelStyle({
        top: rect.top,
        right: window.innerWidth - rect.left + 8,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [open]);

  const nanoradares = useMemo(() => data?.data?.nanoradares ?? [], [data]);
  const spotters = useMemo(() => data?.data?.spotters ?? [], [data]);
  const camaras = useMemo(() => data?.data?.camaras ?? [], [data]);

  const totalDevices = nanoradares.length + spotters.length + camaras.length;
  const totalHidden =
    visibility.hiddenNanoradares.size +
    visibility.hiddenSpotters.size +
    visibility.hiddenCamaras.size;

  const toggleNR = useCallback(
    (id: number) =>
      onChange({
        ...visibility,
        hiddenNanoradares: toggleId(visibility.hiddenNanoradares, id),
      }),
    [visibility, onChange],
  );

  const toggleSpotter = useCallback(
    (id: number) =>
      onChange({
        ...visibility,
        hiddenSpotters: toggleId(visibility.hiddenSpotters, id),
      }),
    [visibility, onChange],
  );

  const toggleCamera = useCallback(
    (id: number) =>
      onChange({
        ...visibility,
        hiddenCamaras: toggleId(visibility.hiddenCamaras, id),
      }),
    [visibility, onChange],
  );

  const toggleAllNR = useCallback(() => {
    const ids = nanoradares.map((nr) => nr.id);
    const hideAll = !allHidden(ids, visibility.hiddenNanoradares);
    onChange({
      ...visibility,
      hiddenNanoradares: hideAll ? new Set(ids) : new Set(),
    });
  }, [nanoradares, visibility, onChange]);

  const toggleAllSpotters = useCallback(() => {
    const ids = spotters.map((s) => s.id);
    const hideAll = !allHidden(ids, visibility.hiddenSpotters);
    onChange({
      ...visibility,
      hiddenSpotters: hideAll ? new Set(ids) : new Set(),
    });
  }, [spotters, visibility, onChange]);

  const toggleAllCamaras = useCallback(() => {
    const ids = camaras.map((c) => c.id);
    const hideAll = !allHidden(ids, visibility.hiddenCamaras);
    onChange({
      ...visibility,
      hiddenCamaras: hideAll ? new Set(ids) : new Set(),
    });
  }, [camaras, visibility, onChange]);

  const showAll = useCallback(() => {
    onChange({
      hiddenNanoradares: new Set(),
      hiddenSpotters: new Set(),
      hiddenCamaras: new Set(),
    });
  }, [onChange]);

  return (
    <div>
      <Tooltip text="Dispositivos en mapa">
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
            open
              ? "bg-brand-200/20 text-brand-200"
              : "text-text-100 bg-bg-300 hover:text-text-100 hover:bg-bg-200"
          }`}
        >
          <IconDevicesCog size={20} />
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: panelStyle.top,
              right: panelStyle.right,
            }}
            className="flex items-start gap-2"
          >
            {/* Panel de edición adjunto a la izquierda del panel principal */}
            {editingDevice && liveEdit && (
              <div className="bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden">
                <DeviceEditPanel
                  editing={editingDevice}
                  onClose={() => onEditClose?.()}
                  liveEdit={liveEdit}
                  onLiveEditChange={(v) => onLiveEditChange?.(v)}
                  mode="floating"
                />
              </div>
            )}

            {/* Panel principal de dispositivos */}
            <div className="w-52 bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-widest text-text-100/70">
                  Dispositivos
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-100/30">
                    {totalDevices - totalHidden}/{totalDevices}
                  </span>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onEditClose?.();
                    }}
                    className="text-text-100/30 hover:text-text-100/70 ml-1"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              </div>
              {isLoading ? (
                <div className="px-3 py-4 text-center text-xs text-text-100/40">
                  Cargando...
                </div>
              ) : (
                <div className="p-2 space-y-3 max-h-72 overflow-y-auto">
                  {/* Nanoradares */}
                  {nanoradares.length > 0 && (
                    <div>
                      <GroupHeader
                        icon={<IconRadar size={11} />}
                        title="Nanoradares"
                        count={nanoradares.length}
                        allGroupHidden={allHidden(
                          nanoradares.map((nr) => nr.id),
                          visibility.hiddenNanoradares,
                        )}
                        onToggleAll={toggleAllNR}
                      />
                      {nanoradares.map((nr, idx) => (
                        <DeviceRow
                          key={nr.id}
                          id={nr.id}
                          label={nr.nombre}
                          subtitle={`Az ${nr.azimut}° · R ${nr.radio}m`}
                          accentColor={
                            nr.color ||
                            NR_PALETTE[idx % NR_PALETTE.length].primary
                          }
                          isHidden={visibility.hiddenNanoradares.has(nr.id)}
                          onToggle={toggleNR}
                          onEdit={
                            onEditNanoradar
                              ? () => onEditNanoradar(nr)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Spotters */}
                  {spotters.length > 0 && (
                    <div>
                      <GroupHeader
                        icon={<IconCurrentLocation size={11} />}
                        title="Spotters"
                        count={spotters.length}
                        allGroupHidden={allHidden(
                          spotters.map((s) => s.id),
                          visibility.hiddenSpotters,
                        )}
                        onToggleAll={toggleAllSpotters}
                      />
                      {spotters.map((s) => (
                        <DeviceRow
                          key={s.id}
                          id={s.id}
                          label={s.nombre}
                          subtitle={`${Number(s.bearing).toFixed(1)}° · ${s.model}`}
                          accentColor="#38bdf8"
                          isHidden={visibility.hiddenSpotters.has(s.id)}
                          onToggle={toggleSpotter}
                          onEdit={
                            onEditSpotter ? () => onEditSpotter(s) : undefined
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Cámaras */}
                  {camaras.length > 0 && (
                    <div>
                      <GroupHeader
                        icon={<IconCamera size={11} />}
                        title="Cámaras"
                        count={camaras.length}
                        allGroupHidden={allHidden(
                          camaras.map((c) => c.id),
                          visibility.hiddenCamaras,
                        )}
                        onToggleAll={toggleAllCamaras}
                      />
                      {camaras.map((c) => (
                        <DeviceRow
                          key={c.id}
                          id={c.id}
                          label={c.nombre}
                          subtitle={c.tipo}
                          accentColor={c.color || "#f59e0b"}
                          isHidden={visibility.hiddenCamaras.has(c.id)}
                          onToggle={toggleCamera}
                          onEdit={
                            onEditCamara ? () => onEditCamara(c) : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Footer */}
              {totalHidden > 0 && (
                <div className="border-t border-border px-2 py-1.5">
                  <button
                    onClick={showAll}
                    className="w-full text-xs text-emerald-400 hover:text-emerald-300 font-medium py-0.5 hover:bg-emerald-500/10 rounded transition-colors"
                  >
                    Mostrar todos
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
