import { useState, useEffect } from "react";
import { IconX, IconDeviceFloppy, IconTrash, IconAlertTriangle, IconMapPin, IconCrosshair, IconSettings, IconFilter, IconFilterOff } from "@tabler/icons-react";
import { Tooltip } from "@/components/ui";
import { useToast } from "@/libs/sonner";
import type {
  Nanoradares,
  Magosradares,
  Spotters,
  Camaras,
  Ptz,
} from "@/features/config-devices/types/ConfigServices.type";
import { useUpdateNanoradar, useDeleteNanoradar } from "@/features/config-devices/nanoradar/hooks/useUpdateNanoradar";
import type { NanoradarPayload } from "@/features/config-devices/nanoradar/service";
import { useUpdateMagosradar, useDeleteMagosradar } from "@/features/config-devices/magosradar/hooks/useUpdateMagosradar";
import type { MagosradarPayload } from "@/features/config-devices/magosradar/service";
import { useUpdateSpotter, useDeleteSpotter } from "@/features/config-devices/spotter/hooks/useUpdateSpotter";
import type { SpotterPayload } from "@/features/config-devices/spotter/service";
import { useUpdateCamara, useDeleteCamara } from "@/features/config-devices/camara/hooks/useUpdateCamara";
import { useCameraActivityStore } from "../../stores/cameraActivityStore";
import type { CamaraPayload } from "@/features/config-devices/camara/service";
import { useUpdatePtz, useDeletePtz } from "@/features/config-devices/ptz/hooks";
import type { PtzPayload } from "@/features/config-devices/ptz/service";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { magosradarService } from "@/features/config-devices/magosradar/service/magosradar.service";

export interface LiveEditValues {
  grado: number;
  apertura: number;
  radio: number;
  color: string;
}

export type EditingDevice =
  | { kind: "nanoradar"; device: Nanoradares }
  | { kind: "magosradar"; device: Magosradares }
  | { kind: "spotter"; device: Spotters }
  | { kind: "camara"; device: Camaras }
  | { kind: "ptz"; device: Ptz };

interface RangeNumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

function RangeNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled,
}: RangeNumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 ">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
          {label}
        </span>
        {unit && (
          <span className="text-[9px] font-mono text-text-100/30">{unit}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-emerald-400 cursor-pointer disabled:opacity-40"
          style={{ height: "4px" }}
          disabled={disabled}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-14 shrink-0 text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-1.5 py-0.5 text-text-100 text-right tabular-nums focus:outline-none focus:border-emerald-500/60 disabled:opacity-50"
        />
      </div>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function TextField({
  label,
  value,
  type,
  onChange,
  disabled,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
        {label}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-2 py-1 text-text-100 focus:outline-none focus:border-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
      />

    </div>
  );
}

interface ColorFieldProps {
  value: string;
  onChange: (v: string) => void;
}

function ColorField({
  value,
  onChange,
}: ColorFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
        Color
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-border/60 cursor-pointer bg-transparent shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-2 py-1 text-text-100 font-mono focus:outline-none focus:border-emerald-500/60"
        />
        <div
          className="w-5 h-5 rounded shrink-0 border border-border/30"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}

interface PositionFieldProps {
  lat: string;
  lng: string;
  onLatChange: (v: string) => void;
  onLngChange: (v: string) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
}

function PositionField({
  lat,
  lng,
  onLatChange,
  onLngChange,
  liveEditPos,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
}: PositionFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
          Posición
        </span>
        {liveEditPos && (
          <span className="text-xs font-mono text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            live
          </span>
        )}
      </div>

      {/* Map pick button */}
      {isPickingPosition ? (
        <button
          type="button"
          onClick={onCancelPickPosition}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#f87171",
          }}
        >
          <IconX size={11} />
          Cancelar selección
        </button>
      ) : (
        <button
          type="button"
          onClick={onPickPosition}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors hover:opacity-90"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.35)",
            color: "#10b981",
          }}
        >
          <IconCrosshair size={11} />
          Mover en mapa
        </button>
      )}

      {/* Lat / Lng inputs */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <IconMapPin size={10} className="text-text-100/30 shrink-0" />
          <span className="text-[9px] text-text-100/40 w-7 shrink-0">Lat</span>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => onLatChange(e.target.value)}
            className="flex-1 text-[10px] bg-bg-200/50 border border-border/60 rounded px-1.5 py-0.5 text-text-100 font-mono focus:outline-none focus:border-emerald-500/60 tabular-nums"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <IconMapPin size={10} className="text-text-100/30 shrink-0" />
          <span className="text-[9px] text-text-100/40 w-7 shrink-0">Lng</span>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => onLngChange(e.target.value)}
            className="flex-1 text-[10px] bg-bg-200/50 border border-border/60 rounded px-1.5 py-0.5 text-text-100 font-mono focus:outline-none focus:border-emerald-500/60 tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleField({
  label,
  description,
  value,
  onChange,
}: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest leading-tight">
          {label}
        </span>
        {description && (
          <span className="text-[9px] text-text-100/30 leading-tight mt-0.5">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-emerald-500" : "bg-bg-400"
          }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-1"
            }`}
        />
      </button>
    </div>
  );
}

interface PanelWrapperProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  isPending: boolean;
  isDeleting: boolean;
  isError: boolean;
  children: React.ReactNode;
  mode?: "sidebar" | "floating";
}

function PanelWrapper({
  title,
  subtitle,
  onClose,
  onSave,
  onDelete,
  isPending,
  isDeleting,
  isError,
  children,
  mode = "sidebar",
}: PanelWrapperProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rootCls =
    mode === "floating"
      ? "flex flex-col w-60 max-h-[calc(100vh-6rem)]"
      : "flex flex-col h-full w-60 border-r border-emerald-500";
  return (
    <div className={rootCls}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0 ">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-100/40">
            {title}
          </p>
          <p className="text-[11px] font-semibold text-text-100 truncate">
            {subtitle}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-2 text-text-100/30 hover:text-text-100/70 transition-colors"
        >
          <IconX size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {isError && (
          <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1.5">
            Error al guardar. Intenta de nuevo.
          </div>
        )}
        {children}
      </div>

      <div className="px-3 py-2 border-t border-border/60 shrink-0 flex flex-col gap-1.5">
        <button
          onClick={onSave}
          disabled={isPending || isDeleting}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors disabled:opacity-50"
        >
          <IconDeviceFloppy size={13} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending || isDeleting}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <IconTrash size={12} />
            Quitar dispositivo
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 px-1 py-1 rounded-md bg-red-500/10 border border-red-500/20">
              <IconAlertTriangle size={11} className="text-red-400 shrink-0" />
              <span className="text-[10px] text-red-300 leading-tight">
                ¿Confirmar eliminación?
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="flex-1 py-1.5 rounded-md text-[11px] font-semibold text-text-100/50 hover:text-text-100/80 hover:bg-bg-300/60 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Quitando..." : "Sí, quitar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface NanoradarFormProps {
  device: Nanoradares;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  onLiveEditPosChange?: (pos: { lat: number; lng: number }) => void;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
  mode?: "sidebar" | "floating";
}

function NanoradarForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  liveEditPos,
  onLiveEditPosChange,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
  mode = "sidebar",
}: NanoradarFormProps) {
  const { mutate, isPending, isError } = useUpdateNanoradar();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteNanoradar();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitud: device.latitud,
    longitud: device.longitud,
    azimut: device.azimut ?? "0",
  });

  // La latitud/longitud se obtiene de liveEditPos (marker en mapa) o del formulario
  const effectiveLat = liveEditPos ? liveEditPos.lat.toFixed(7) : form.latitud;
  const effectiveLng = liveEditPos ? liveEditPos.lng.toFixed(7) : form.longitud;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: NanoradarPayload = {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      latitud: effectiveLat,
      longitud: effectiveLng,
      azimut: form.azimut,
      grado: liveEdit.grado,
      radio: liveEdit.radio,
      apertura: liveEdit.apertura,
      color: liveEdit.color,
    };
    mutate({ id: device.id, payload }, { onSuccess: onClose });
  }

  function remove() {
    deleteMutate(device.id, { onSuccess: onClose });
  }

  return (
    <PanelWrapper
      title="NanoRadar"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      onDelete={remove}
      isPending={isPending}
      isDeleting={isDeleting}
      isError={isError}
      mode={mode}
    >
      <TextField
        label="Nombre"
        value={form.nombre}
        onChange={(v) => set("nombre", v)}
      />
      <TextField
        label="Dirección IP"
        value={form.direccionIp}
        onChange={(v) => set("direccionIp", v)}
      />
      <RangeNumberField
        label="Grado"
        value={liveEdit.grado}
        onChange={(v) => onLiveEditChange({ ...liveEdit, grado: v })}
        min={0}
        max={360}
        unit="°"
      />
      <RangeNumberField
        label="Apertura"
        value={liveEdit.apertura}
        onChange={(v) => onLiveEditChange({ ...liveEdit, apertura: v })}
        min={1}
        max={180}
        unit="°"
      />
      <RangeNumberField
        label="Radio"
        value={liveEdit.radio}
        onChange={(v) => onLiveEditChange({ ...liveEdit, radio: v })}
        min={0}
        max={10000}
        step={50}
        unit="m"
      />
      <PositionField
        lat={form.latitud}
        lng={form.longitud}
        onLatChange={(v) => {
          set("latitud", v);
          onLiveEditPosChange?.({ lat: Number(v), lng: Number(form.longitud) });
        }}
        onLngChange={(v) => {
          set("longitud", v);
          onLiveEditPosChange?.({ lat: Number(form.latitud), lng: Number(v) });
        }}
        liveEditPos={liveEditPos}
        isPickingPosition={isPickingPosition}
        onPickPosition={onPickPosition}
        onCancelPickPosition={onCancelPickPosition}
      />
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
    </PanelWrapper>
  );
}

interface MagosradarFormProps {
  device: Magosradares;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  onLiveEditPosChange?: (pos: { lat: number; lng: number }) => void;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
  mode?: "sidebar" | "floating";
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

function MagosradarForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  liveEditPos,
  onLiveEditPosChange,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
  mode = "sidebar",
  showAdvanced,
  onToggleAdvanced,
}: MagosradarFormProps) {
  const { mutate, isPending, isError } = useUpdateMagosradar();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteMagosradar();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitud: device.latitud,
    longitud: device.longitud,
    azimut: device.azimut ?? "0",
  });

  // ── Sincronizar form.latitud/longitud cuando el marker se arrastra en el mapa ──
  // (liveEditPos cambia en el padre RadarMap, pero form es la fuente de verdad local)
  useEffect(() => {
    if (liveEditPos) {
      setForm((p) => ({
        ...p,
        latitud: liveEditPos.lat.toFixed(7),
        longitud: liveEditPos.lng.toFixed(7),
      }));
    }
  }, [liveEditPos?.lat, liveEditPos?.lng]);

  // La latitud/longitud se obtiene de liveEditPos (marker en mapa) o del formulario
  const effectiveLat = liveEditPos ? liveEditPos.lat.toFixed(7) : form.latitud;
  const effectiveLng = liveEditPos ? liveEditPos.lng.toFixed(7) : form.longitud;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    // Fuente de verdad: form.latitud/form.longitud (sincronizados con el marker vía useEffect)
    const payload: MagosradarPayload = {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      latitud: form.latitud,
      longitud: form.longitud,
      azimut: form.azimut,
      grado: liveEdit.grado,
      radio: liveEdit.radio,
      apertura: liveEdit.apertura,
      color: liveEdit.color,
    };
    mutate({ id: device.id, payload }, { onSuccess: onClose });
  }

  function remove() {
    deleteMutate(device.id, { onSuccess: onClose });
  }

  return (
    <PanelWrapper
      title="MagosRadar"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      onDelete={remove}
      isPending={isPending}
      isDeleting={isDeleting}
      isError={isError}
      mode={mode}
    >
      <TextField
        label="Nombre"
        value={form.nombre}
        onChange={(v) => set("nombre", v)}
      />
      <TextField
        label="Dirección IP"
        value={form.direccionIp}
        onChange={(v) => set("direccionIp", v)}
      />
      <RangeNumberField
        label="Grado"
        value={liveEdit.grado}
        onChange={(v) => onLiveEditChange({ ...liveEdit, grado: v })}
        min={0}
        max={360}
        unit="°"
      />
      <RangeNumberField
        label="Apertura"
        value={liveEdit.apertura}
        onChange={(v) => onLiveEditChange({ ...liveEdit, apertura: v })}
        min={1}
        max={180}
        unit="°"
      />
      <RangeNumberField
        label="Radio"
        value={liveEdit.radio}
        onChange={(v) => onLiveEditChange({ ...liveEdit, radio: v })}
        min={0}
        max={10000}
        step={50}
        unit="m"
      />
      <PositionField
        lat={effectiveLat}
        lng={effectiveLng}
        onLatChange={(v) => {
          set("latitud", v);
          onLiveEditPosChange?.({ lat: Number(v), lng: Number(effectiveLng) });
        }}
        onLngChange={(v) => {
          set("longitud", v);
          onLiveEditPosChange?.({ lat: Number(effectiveLat), lng: Number(v) });
        }}
        liveEditPos={liveEditPos}
        isPickingPosition={isPickingPosition}
        onPickPosition={onPickPosition}
        onCancelPickPosition={onCancelPickPosition}
      />
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
      {/* Botón para desplegar/ocultar configuraciones avanzadas (solo MagosRadar) */}
      {onToggleAdvanced && (
        <button
          type="button"
          onClick={onToggleAdvanced}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
            showAdvanced
              ? "bg-brand-200/20 text-brand-200"
              : "bg-bg-300/50 text-text-100/50 hover:text-text-100/80 hover:bg-bg-300"
          }`}
        >
          <IconSettings size={13} />
          {showAdvanced ? "Ocultar avanzado" : "Configuración avanzada"}
        </button>
      )}
    </PanelWrapper>
  );
}

interface SpotterFormProps {
  device: Spotters;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  onLiveEditPosChange?: (pos: { lat: number; lng: number }) => void;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
  mode?: "sidebar" | "floating";
}

function SpotterForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  liveEditPos,
  onLiveEditPosChange,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
  mode = "sidebar",
}: SpotterFormProps) {
  const { mutate, isPending, isError } = useUpdateSpotter();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteSpotter();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitude: device.latitude,
    longitude: device.longitude,
    azimut: device.azimut ?? "0",
  });

  // La latitud/longitud se obtiene de liveEditPos (marker en mapa) o del formulario
  const effectiveLatSP = liveEditPos ? liveEditPos.lat.toFixed(7) : form.latitude;
  const effectiveLngSP = liveEditPos ? liveEditPos.lng.toFixed(7) : form.longitude;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: SpotterPayload = {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      latitude: effectiveLatSP,
      longitude: effectiveLngSP,
      azimut: form.azimut,
      grado: liveEdit.grado,
      radio: liveEdit.radio,
      apertura: liveEdit.apertura,
      color: liveEdit.color,
    };
    mutate({ id: device.id, payload }, { onSuccess: onClose });
  }

  function remove() {
    deleteMutate(device.id, { onSuccess: onClose });
  }

  return (
    <PanelWrapper
      title="Spotter"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      onDelete={remove}
      isPending={isPending}
      isDeleting={isDeleting}
      isError={isError}
      mode={mode}
    >
      <TextField
        label="Nombre"
        value={form.nombre}
        onChange={(v) => set("nombre", v)}
      />
      <TextField
        label="Dirección IP"
        value={form.direccionIp}
        onChange={(v) => set("direccionIp", v)}
      />
      {/* <RangeNumberField
        label="Grado"
        value={liveEdit.grado}
        onChange={(v) => onLiveEditChange({ ...liveEdit, grado: v })}
        min={0}
        max={360}
        unit="°"
      /> */}

      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
            Grado <small>Predeterminado</small>
          </span>
        </div>
        <div className="bg-bg-200 py-0.5">
          <p className="text-text-100">{liveEdit.grado} °</p>{" "}
          <small className="text-text-300">Configuración Interna Spotter</small>
        </div>
      </div>
      <RangeNumberField
        label="Apertura"
        value={liveEdit.apertura}
        onChange={(v) => onLiveEditChange({ ...liveEdit, apertura: v })}
        min={1}
        max={180}
        unit="°"
      />
      <RangeNumberField
        label="Radio"
        value={liveEdit.radio}
        onChange={(v) => onLiveEditChange({ ...liveEdit, radio: v })}
        min={0}
        max={10000}
        step={50}
        unit="m"
      />
      <PositionField
        lat={effectiveLatSP}
        lng={effectiveLngSP}
        onLatChange={(v) => {
          set("latitude", v);
          onLiveEditPosChange?.({ lat: Number(v), lng: Number(effectiveLngSP) });
        }}
        onLngChange={(v) => {
          set("longitude", v);
          onLiveEditPosChange?.({ lat: Number(effectiveLatSP), lng: Number(v) });
        }}
        liveEditPos={liveEditPos}
        isPickingPosition={isPickingPosition}
        onPickPosition={onPickPosition}
        onCancelPickPosition={onCancelPickPosition}
      />
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
    </PanelWrapper>
  );
}

interface CamaraFormProps {
  device: Camaras;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  onLiveEditPosChange?: (pos: { lat: number; lng: number }) => void;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
  mode?: "sidebar" | "floating";
}

function CamaraForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  liveEditPos,
  onLiveEditPosChange,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
  mode = "sidebar",
}: CamaraFormProps) {
  const { mutate, isPending, isError } = useUpdateCamara();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteCamara();
  const { isEnabled, setEnabled } = useCameraActivityStore();
  const activityEnabled = isEnabled(device.id);
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    channel: device.channel ?? 1,
    subtype: device.subtype ?? 0,
    azimut: device.azimut ?? "0",
    usuario: device.usuario,
    password: device.password,
    url_stream: device.url_stream,
    tipo: device.tipo,
  });

  const [posForm, setPosForm] = useState({
    latitud: String(device.ubicacion.lat),
    longitud: String(device.ubicacion.lng),
  });

  // La latitud/longitud se obtiene de liveEditPos (marker en mapa) o del formulario
  const effectiveLatCF = liveEditPos ? liveEditPos.lat.toFixed(7) : posForm.latitud;
  const effectiveLngCF = liveEditPos ? liveEditPos.lng.toFixed(7) : posForm.longitud;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: CamaraPayload = {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      channel: form.channel,
      subtype: form.subtype,
      azimut: form.azimut,
      grado: liveEdit.grado,
      radio: liveEdit.radio,
      apertura: liveEdit.apertura,
      usuario: form.usuario,
      password: form.password,
      color: liveEdit.color,
      url_stream: form.url_stream,
      tipo: form.tipo,
      latitud: effectiveLatCF,
      longitud: effectiveLngCF,
    };
    mutate({ id: device.id, payload }, { onSuccess: onClose });
  }

  function remove() {
    deleteMutate(device.id, { onSuccess: onClose });
  }

  return (
    <PanelWrapper
      title="Cámara"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      onDelete={remove}
      isPending={isPending}
      isDeleting={isDeleting}
      isError={isError}
      mode={mode}
    >
      <TextField
        label="Nombre"
        value={form.nombre}
        onChange={(v) => set("nombre", v)}
      />
      <TextField
        label="Dirección IP"
        value={form.direccionIp}
        onChange={(v) => set("direccionIp", v)}
      />
      {/* <TextField
        label="Tipo"
        value={form.tipo}
        onChange={(v) => set("tipo", v)}
      /> */}
      <RangeNumberField
        label="Grado"
        value={liveEdit.grado}
        onChange={(v) => onLiveEditChange({ ...liveEdit, grado: v })}
        min={0}
        max={360}
        unit="°"
      />
      <RangeNumberField
        label="Apertura"
        value={liveEdit.apertura}
        onChange={(v) => onLiveEditChange({ ...liveEdit, apertura: v })}
        min={1}
        max={180}
        unit="°"
      />
      <RangeNumberField
        label="Radio"
        value={liveEdit.radio}
        onChange={(v) => onLiveEditChange({ ...liveEdit, radio: v })}
        min={0}
        max={10000}
        step={50}
        unit="m"
      />
      <RangeNumberField
        label="Channel"
        value={form.channel}
        onChange={(v) => set("channel", v)}
        min={1}
        max={64}
      />
      <RangeNumberField
        label="Subtype"
        value={form.subtype}
        onChange={(v) => set("subtype", v)}
        min={0}
        max={10}
      />
      <TextField
        label="URL Stream"
        value={form.url_stream}
        onChange={(v) => set("url_stream", v)}
      />
      <TextField
        label="Usuario"
        value={form.usuario}
        onChange={(v) => set("usuario", v)}
      />
      <TextField
        label="Password"
        type="password"
        value={form.password}
        onChange={(v) => set("password", v)}
      />
      <PositionField
        lat={posForm.latitud}
        lng={posForm.longitud}
        onLatChange={(v) => {
          setPosForm((p) => ({ ...p, latitud: v }));
          onLiveEditPosChange?.({ lat: Number(v), lng: Number(posForm.longitud) });
        }}
        onLngChange={(v) => {
          setPosForm((p) => ({ ...p, longitud: v }));
          onLiveEditPosChange?.({ lat: Number(posForm.latitud), lng: Number(v) });
        }}
        liveEditPos={liveEditPos}
        isPickingPosition={isPickingPosition}
        onPickPosition={onPickPosition}
        onCancelPickPosition={onCancelPickPosition}
      />
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
      <div className="border-t border-border/40 pt-3">
        <ToggleField
          label="Actividad automática"
          description="Zoom y fly-to al detectar eventos"
          value={activityEnabled}
          onChange={(v) => setEnabled(device.id, v)}
        />
      </div>
    </PanelWrapper>
  );
}

interface PtzFormProps {
  device: Ptz;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  onLiveEditPosChange?: (pos: { lat: number; lng: number }) => void;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
  mode?: "sidebar" | "floating";
}

function PtzForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  liveEditPos,
  onLiveEditPosChange,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
  mode = "sidebar",
}: PtzFormProps) {
  const { mutate, isPending, isError } = useUpdatePtz();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeletePtz();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    puertoOnvif: device.puertoOnvif ?? 80,
    puertoRtsp: device.puertoRtsp ?? 554,
    channel: device.channel ?? 1,
    subtype: device.subtype ?? 0,
    azimut: device.azimut ?? "0",
    usuario: device.usuario,
    password: device.password,
    altitud: device.altitud ?? "0",
    panInvertido: device.panInvertido ?? 0,
    tiltInvertido: device.tiltInvertido ?? 0,
    tiltOffset: device.tiltOffset ?? 0,
    panOffset: device.panOffset ?? 0,
    url_stream: device.url_stream,
    tipo: device.tipo,
  });

  const [posForm, setPosForm] = useState({
    latitud: String(device.ubicacion.lat),
    longitud: String(device.ubicacion.lng),
  });

  // La latitud/longitud se obtiene de liveEditPos (marker en mapa) o del formulario
  const effectiveLatPTZ = liveEditPos ? liveEditPos.lat.toFixed(7) : posForm.latitud;
  const effectiveLngPTZ = liveEditPos ? liveEditPos.lng.toFixed(7) : posForm.longitud;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: PtzPayload = {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      puertoOnvif: form.puertoOnvif,
      puertoRtsp: form.puertoRtsp,
      channel: form.channel,
      subtype: form.subtype,
      azimut: form.azimut,
      grado: liveEdit.grado,
      radio: liveEdit.radio,
      apertura: liveEdit.apertura,
      altitud: form.altitud,
      panInvertido: form.panInvertido,
      tiltInvertido: form.tiltInvertido,
      panOffset: form.panOffset,
      usuario: form.usuario,
      password: form.password,
      color: liveEdit.color,
      url_stream: form.url_stream,
      tipo: form.tipo,
      latitud: effectiveLatPTZ,
      longitud: effectiveLngPTZ,
    };
    mutate({ id: device.id, payload }, { onSuccess: onClose });
  }

  function remove() {
    deleteMutate(device.id, { onSuccess: onClose });
  }

  return (
    <PanelWrapper
      title="PTZ"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      onDelete={remove}
      isPending={isPending}
      isDeleting={isDeleting}
      isError={isError}
      mode={mode}
    >
      {/* ── Identificación ── */}
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Nombre" value={form.nombre} onChange={(v) => set("nombre", v)} />
        <TextField label="Dirección IP" value={form.direccionIp} onChange={(v) => set("direccionIp", v)} />
      </div>

      {/* ── Conexión ── */}
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Puerto ONVIF" value={String(form.puertoOnvif)} onChange={(v) => set("puertoOnvif", v === "" ? 80 : Number(v))} />
        <TextField label="Puerto RTSP" value={String(form.puertoRtsp)} onChange={(v) => set("puertoRtsp", v === "" ? 554 : Number(v))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Usuario" value={form.usuario} onChange={(v) => set("usuario", v)} />
        <TextField label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} />
      </div>
      <TextField label="URL Stream" value={form.url_stream} onChange={(v) => set("url_stream", v)} />

      {/* ── Posición ── */}
      <PositionField
        lat={posForm.latitud}
        lng={posForm.longitud}
        onLatChange={(v) => {
          setPosForm((p) => ({ ...p, latitud: v }));
          onLiveEditPosChange?.({ lat: Number(v), lng: Number(posForm.longitud) });
        }}
        onLngChange={(v) => {
          setPosForm((p) => ({ ...p, longitud: v }));
          onLiveEditPosChange?.({ lat: Number(posForm.latitud), lng: Number(v) });
        }}
        liveEditPos={liveEditPos}
        isPickingPosition={isPickingPosition}
        onPickPosition={onPickPosition}
        onCancelPickPosition={onCancelPickPosition}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Altura de cámara (m)" value={form.altitud} onChange={(v) => set("altitud", v)} />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
            Azimut (pan 0°) · solo-lectura
          </span>
          <input
            type="text"
            value={form.azimut}
            disabled
            title="El azimut se fija con el panel de Calibración"
            className="text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-2 py-1 text-text-100 opacity-50 cursor-not-allowed"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
          Calibración inmutable
        </span>
        <p className="text-[10px] text-text-100/50 leading-snug">
          El azimut y el tiltOffset se calculan en el panel de{" "}
          <span className="text-amber-400/80 font-medium">Calibración</span> de
          la cámara: apunta físicamente a un punto de referencia y guárdalo.
        </p>
      </div>

      {/* ── Cobertura ── */}
      <div className="grid grid-cols-2 gap-2">
        <RangeNumberField
          label="Grado (dirección del cono)"
          value={liveEdit.grado}
          onChange={() => {}}
          disabled
          min={0}
          max={360}
          unit="°"
        />
        <TextField
          label="tiltOffset"
          value={String(form.tiltOffset)}
          onChange={() => {}}
          disabled
        />
      </div>
      <div className="grid grid-cols-1 gap-2">
        <RangeNumberField label="Apertura" value={liveEdit.apertura} onChange={(v) => onLiveEditChange({ ...liveEdit, apertura: v })} min={1} max={180} unit="°" />
      </div>
      <RangeNumberField label="Radio" value={liveEdit.radio} onChange={(v) => onLiveEditChange({ ...liveEdit, radio: v })} min={0} max={10000} step={50} unit="m" />
      <ColorField value={liveEdit.color} onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })} />

      {/* ── Video ── */}
      <div className="grid grid-cols-2 gap-2">
        <RangeNumberField label="Channel" value={form.channel} onChange={(v) => set("channel", v)} min={1} max={64} />
        <RangeNumberField label="Subtype" value={form.subtype} onChange={(v) => set("subtype", v)} min={0} max={10} />
      </div>

      {/* ── Corrección de ejes ── */}
      <div className="flex flex-col gap-2 border-t border-border/30">
        <span className="text-[10px] font-semibold text-text-100/40 uppercase tracking-widest">Corrección de ejes</span>
        <div className="grid grid-cols-2 gap-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.panInvertido === 1} onChange={(e) => set("panInvertido", e.target.checked ? 1 : 0)} className="w-3.5 h-3.5 rounded accent-emerald-400 cursor-pointer" />
            <span className="text-[11px] text-text-100/70">Espejo X (pan)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.tiltInvertido === 1} onChange={(e) => set("tiltInvertido", e.target.checked ? 1 : 0)} className="w-3.5 h-3.5 rounded accent-emerald-400 cursor-pointer" />
            <span className="text-[11px] text-text-100/70">Espejo Y (tilt)</span>
          </label>
        </div>
        <TextField
          label="Pan Offset (°)"
          value={String(form.panOffset)}
          onChange={(v) => set("panOffset", v === "" ? 0 : Number(v))}
        />
      </div>
    </PanelWrapper>
  );
}

// ─── Helpers for advanced form ──────────────────────
function n(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}
function nn(v: string): number | null {
  return v === "" ? null : Number(v);
}

interface MagosradarAdvancedFormProps {
  device: Magosradares;
}

// ─── Info tooltip ────────────────────────────────────────
function InfoIcon({ text }: { text: string }) {
  return (
    <Tooltip text={text} side="top">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-text-100/10 text-text-100/40 text-xs font-bold cursor-help hover:bg-brand-200/20 hover:text-brand-200/70 transition-colors shrink-0">
        ?
      </span>
    </Tooltip>
  );
}

// ─── Slider with info — slider + number input (sin límite en número) ─────
interface SliderFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  info: string;
}

function SliderField({ label, value, onChange, min, max, step = 1, unit, info }: SliderFieldProps) {
  const num = value === "" ? 0 : Number(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-semibold text-text-100/50 uppercase tracking-widest">
          {label}
        </span>
        {unit && <span className="text-xs font-mono text-text-100/25">{unit}</span>}
        <InfoIcon text={info} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={isNaN(num) ? min : Math.min(Math.max(num, min), max)}
          onChange={(e) => onChange(e.target.value === "" ? "" : String(Number(e.target.value)))}
          className="flex-1 accent-emerald-400 cursor-pointer"
          style={{ height: "4px" }}
        />
        <input
          type="number"
          value={value}
          step={step}
          placeholder={String(min)}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 shrink-0 text-[10px] bg-bg-200/50 border border-border/60 rounded-md px-1.5 py-0.5 text-text-100 text-right tabular-nums focus:outline-none focus:border-emerald-500/60"
        />
      </div>
    </div>
  );
}

// ─── Text field with info ──────────────────────────────────
interface TextFieldInfoProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  info?: string;
  type?: string;
  placeholder?: string;
}

function TextFieldInfo({ label, value, onChange, info, type, placeholder }: TextFieldInfoProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-semibold text-text-100/50 uppercase tracking-widest">
          {label}
        </span>
        {info && <InfoIcon text={info} />}
      </div>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-2 py-1 text-text-100 placeholder-text-200/40 focus:outline-none focus:border-emerald-500/60"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export function MagosradarAdvancedPanel({ device }: MagosradarAdvancedFormProps) {
  const { mutate, isPending } = useUpdateMagosradar();
  const { success, error: showError } = useToast();

  const [form, setForm] = useState<Record<string, string>>({
    trackColor: device.trackColor ?? "",
    enabled: n(device.enabled),
    modelo: device.modelo ?? "",
    frecuencia: n(device.frecuencia),
    potencia: n(device.potencia),
    elevacion: n(device.elevacion),
    altitud: n(device.altitud),
    notas: device.notas ?? "",
    // ── Toggle sin filtro ──
    sinFiltro: device.sinFiltro ? "1" : "0",
    // ── Modo espejo (orientación) ──
    espejoX: device.espejoX ? "1" : "0",
    espejoY: device.espejoY ? "1" : "0",
    // ── Tracking manual ──
    trackingManual: device.trackingManual ? "1" : "0",
    snr: n(device.snr),
    rcs: n(device.rcs),
    maxSpeed: n(device.maxSpeed),
    associationDist: n(device.associationDist),
    minTrackPoints: n(device.minTrackPoints),
    ttl: n(device.ttl),
    stationaryTtl: n(device.stationaryTtl),
    emaSmooth: n(device.emaSmooth),
    velSmooth: n(device.velSmooth),
    maxDetections: n(device.maxDetections),
    clusterDist: n(device.clusterDist),
    // ── Zoom automático PTZ ──
    zoomAutomatico: device.zoomAutomatico ? "1" : "0",
    zoomMin: n(device.zoomMin),
    zoomMax: n(device.zoomMax),
  });

  // ─── PTZ Auto-Tracking ───
  const { data: configData } = useConfigDevices();
  const ptzCameras = configData?.data?.ptz ?? [];
  const [selectedPtzId, setSelectedPtzId] = useState<number | null>(device.idPtz ?? null);
  const [autoTracking, setAutoTracking] = useState(device.ptzAutoTracking ?? false);
  const [ptzLoading, setPtzLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  async function handlePtzChange(ptzId: number | null) {
    setPtzLoading(true);
    try {
      const updated = await magosradarService.assignPtz(device.id, ptzId);
      setSelectedPtzId(updated.idPtz ?? null);
      setAutoTracking(updated.ptzAutoTracking ?? false);
      if (ptzId === null) {
        success("Cámara PTZ desasignada");
      } else {
        const cam = ptzCameras.find((p) => p.id === ptzId);
        success(`PTZ "${cam?.nombre ?? ptzId}" asignada`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al asignar PTZ");
      setSelectedPtzId(device.idPtz ?? null); // revertir
    } finally {
      setPtzLoading(false);
    }
  }

  async function handleAutoTrackingToggle() {
    const next = !autoTracking;
    setTrackingLoading(true);
    try {
      const updated = await magosradarService.setAutoTracking(device.id, next);
      setAutoTracking(updated.ptzAutoTracking ?? false);
      success(next ? "Auto-tracking activado" : "Auto-tracking desactivado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg.includes("sin una cámara PTZ")) {
        showError("Asigna una cámara PTZ primero");
      } else {
        showError(msg);
      }
      setAutoTracking(device.ptzAutoTracking ?? false); // revertir
    } finally {
      setTrackingLoading(false);
    }
  }



  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    mutate(
      {
        id: device.id,
        payload: {
          trackColor: form.trackColor || null,
          enabled: form.enabled === "" ? null : Number(form.enabled),
          modelo: form.modelo || null,
          frecuencia: nn(form.frecuencia),
          potencia: nn(form.potencia),
          elevacion: nn(form.elevacion),
          altitud: nn(form.altitud),
          notas: form.notas || null,
          sinFiltro: form.sinFiltro === "1" ? 1 : 0,
          espejoX: form.espejoX === "1" ? 1 : 0,
          espejoY: form.espejoY === "1" ? 1 : 0,
          trackingManual: form.trackingManual === "1" ? 1 : 0,
          snr: nn(form.snr),
          rcs: nn(form.rcs),
          maxSpeed: nn(form.maxSpeed),
          associationDist: nn(form.associationDist),
          minTrackPoints: form.minTrackPoints === "" ? null : Number(form.minTrackPoints),
          ttl: nn(form.ttl),
          stationaryTtl: nn(form.stationaryTtl),
          emaSmooth: nn(form.emaSmooth),
          velSmooth: nn(form.velSmooth),
          maxDetections: form.maxDetections === "" ? null : Number(form.maxDetections),
          clusterDist: nn(form.clusterDist),
          zoomAutomatico: form.zoomAutomatico === "1" ? 1 : 0,
          zoomMin: nn(form.zoomMin),
          zoomMax: nn(form.zoomMax),
        },
      },
      {
        onSuccess: () => success("Parámetros avanzados guardados correctamente"),
        onError: (err) => showError(err instanceof Error ? err.message : "Error al guardar parámetros avanzados"),
      },
    );
  }

  const globalHint = "Vacío = valor global";

  return (
    <>
      <div className="relative flex flex-col min-w-120 top-0 max-h-[calc(100vh-6rem)] bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-100/40">
            MagosRadar · Avanzado
          </span>
          <span className="text-[7px] text-text-100/20 uppercase">{globalHint}</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {/* ═══ Estado & modelo ═══ */}
          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2">
            Estado & modelo
          </p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-3 mb-5">

            <TextFieldInfo label="Modelo" value={form.modelo} onChange={(v) => set("modelo", v)} placeholder="Magos X7" />
            <div>
              <TextFieldInfo label="Notas" value={form.notas} onChange={(v) => set("notas", v)} placeholder="Radar principal sector norte" />
            </div>
            <div className="flex items-center gap-3 w-full justify-end">
              <button
                type="button"
                onClick={() => set("enabled", form.enabled === "1" ? "0" : "1")}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.enabled === "1" ? "bg-emerald-500" : "bg-bg-400"
                  }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.enabled === "1" ? "translate-x-4" : "translate-x-1"
                    }`}
                />
              </button>
              <div>
                <InfoIcon text="Activa/desactiva el radar. 0 = no se conecta. 1 = operativo." />
              </div>
            </div>

          </div>

          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2 mt-5">
            Seguimiento PTZ
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold text-text-100/50 uppercase tracking-widest">Cámara PTZ</span>
                <InfoIcon text="Asigna una cámara PTZ para que siga automáticamente los tracks del radar en zonas de alerta." />
              </div>
              <select
                value={selectedPtzId ?? ""}
                disabled={ptzLoading}
                onChange={(e) => {
                  const val = e.target.value;
                  handlePtzChange(val === "" ? null : Number(val));
                }}
                className="w-full rounded-lg border border-border bg-bg-100 text-text-100 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition disabled:opacity-50"
              >
                <option value="">Sin asignar</option>
                {ptzCameras.map((ptz) => (
                  <option key={ptz.id} value={ptz.id}>
                    {ptz.nombre} ({ptz.direccionIp})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold text-text-100/50 uppercase tracking-widest">Auto-tracking</span>
                <InfoIcon text="La cámara PTZ seguirá automáticamente los tracks del radar dentro de las zonas de alerta." />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={selectedPtzId === null || trackingLoading}
                  onClick={handleAutoTrackingToggle}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedPtzId === null ? "bg-bg-400 opacity-40 cursor-not-allowed" : autoTracking ? "bg-emerald-500" : "bg-bg-400"}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${autoTracking ? "translate-x-4" : "translate-x-1"}`}
                  />
                </button>
                <span className={`text-[10px] ${selectedPtzId === null ? "text-text-200/30" : autoTracking ? "text-emerald-400" : "text-text-200/60"}`}>
                  {selectedPtzId === null ? "Asigna una PTZ" : autoTracking ? "Activo" : "Inactivo"}
                </span>
                {trackingLoading && <span className="text-[9px] text-text-200/50 animate-pulse">···</span>}
              </div>
            </div>
          </div>

          {/* ═══ ZOOM AUTOMÁTICO ═══ */}
          <div className={`rounded-md px-2 py-1.5 border transition-colors mb-5 ${form.zoomAutomatico === "1" ? "bg-brand-200/10 border-brand-200/40" : "bg-bg-100/40 border-border/40"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="leading-tight">
                <span className="text-[10px] font-semibold text-text-100/80">Zoom automático</span>
                <p className="text-[8px] text-text-200/60 italic">
                  {form.zoomAutomatico === "1"
                    ? "La cámara acerca el zoom cuando un track entra a una zona"
                    : "El zoom se controla solo manualmente"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.zoomAutomatico === "1"}
                onClick={() => set("zoomAutomatico", form.zoomAutomatico === "1" ? "0" : "1")}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.zoomAutomatico === "1" ? "bg-brand-200" : "bg-bg-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.zoomAutomatico === "1" ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-[8px] uppercase tracking-widest text-text-200/50">Zoom máx (0-1)</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.zoomMax}
                  placeholder="0.50"
                  disabled={form.zoomAutomatico !== "1"}
                  onChange={(e) => set("zoomMax", e.target.value)}
                  className="w-full text-[10px] bg-bg-200/50 border border-border/60 rounded-md px-1.5 py-0.5 text-text-100 tabular-nums focus:outline-none focus:border-emerald-500/60 disabled:opacity-40"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[8px] uppercase tracking-widest text-text-200/50">Zoom mín (0-1)</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.zoomMin}
                  placeholder="0.00"
                  disabled={form.zoomAutomatico !== "1"}
                  onChange={(e) => set("zoomMin", e.target.value)}
                  className="w-full text-[10px] bg-bg-200/50 border border-border/60 rounded-md px-1.5 py-0.5 text-text-100 tabular-nums focus:outline-none focus:border-emerald-500/60 disabled:opacity-40"
                />
              </label>
            </div>
          </div>

          <p className="text-[9px] hidden font-semibold uppercase tracking-widest text-text-100/30 mb-2">
            Geo & RF
          </p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-3 mb-5 hidden">
            <SliderField label="Elevación" value={form.elevacion} onChange={(v) => set("elevacion", v)} min={-90} max={90} step={0.1} unit="°"
              info="Ángulo de elevación de la antena respecto al horizonte. Solo informativo." />
            <SliderField label="Altitud" value={form.altitud} onChange={(v) => set("altitud", v)} min={0} max={9000} step={1} unit="msnm"
              info="Altitud del radar sobre el nivel del mar. Solo informativo." />
            <SliderField label="Frecuencia" value={form.frecuencia} onChange={(v) => set("frecuencia", v)} min={1} max={100} step={0.1} unit="GHz"
              info="Frecuencia de operación del hardware. Solo informativo." />
            <SliderField label="Potencia" value={form.potencia} onChange={(v) => set("potencia", v)} min={-20} max={50} step={0.1} unit="dBm"
              info="Potencia de transmisión del hardware. Solo informativo." />
          </div>

          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2 mt-5">
            Visualización
          </p>
          {/* trackColor — input texto + color picker */}
          <div className="flex flex-col gap-1 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-text-100/50 uppercase tracking-widest">Color tracks</span>
              <InfoIcon text="Color único para todos los tracks de este radar. Vacío = paleta automática." />
            </div>
            <div className="flex items-center gap-1.5">
              <input type="color" value={form.trackColor || "#00e5ff"} onChange={(e) => set("trackColor", e.target.value)}
                className="w-6 h-6 rounded border border-border/60 cursor-pointer bg-transparent shrink-0" />
              <input type="text" value={form.trackColor} onChange={(e) => set("trackColor", e.target.value)}
                placeholder="#00e5ff"
                className="flex-1 text-[10px] bg-bg-200/50 border border-border/60 rounded-md px-1.5 py-0.5 text-text-100 font-mono focus:outline-none focus:border-emerald-500/60" />
            </div>
          </div>

          {/* ═══ TOGGLE: VER TRACKS SIN FILTROS ═══ */}
          <div className={`rounded-md px-2 py-1.5 border transition-colors mb-3 ${form.sinFiltro === "1" ? "bg-rose-500/10 border-rose-500/40" : "bg-bg-100/40 border-border/40"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {form.sinFiltro === "1" ? (
                  <IconFilterOff size={13} className="text-rose-400 shrink-0" />
                ) : (
                  <IconFilter size={13} className="text-text-100/60 shrink-0" />
                )}
                <div className="leading-tight">
                  <span className="text-[10px] font-semibold text-text-100/80">Ver tracks sin filtros</span>
                  <p className="text-xs text-text-200/60 italic">Detecciones crudas post-procesadas (sin SNR, RCS, clustering ni tracking)</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.sinFiltro === "1"}
                onClick={() => set("sinFiltro", form.sinFiltro === "1" ? "0" : "1")}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.sinFiltro === "1" ? "bg-rose-500" : "bg-bg-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.sinFiltro === "1" ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          {/* ═══ MODO ESPEJO (ORIENTACIÓN) ═══ */}
          <div className="rounded-md px-2 py-1.5 border border-border/40 mb-3 bg-bg-100/40">
            <div className="leading-tight mb-1.5">
              <span className="text-[10px] font-semibold text-text-100/80">Modo espejo</span>
              <p className="text-xs text-text-200/60 italic">Invierte los ejes para alinear los tracks con la realidad</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between gap-1.5 rounded border border-border/40 px-1.5 py-1">
                <span className="text-[9px] text-text-100/60">Eje X</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.espejoX === "1"}
                  onClick={() => set("espejoX", form.espejoX === "1" ? "0" : "1")}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.espejoX === "1" ? "bg-brand-200" : "bg-bg-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.espejoX === "1" ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-1.5 rounded border border-border/40 px-1.5 py-1">
                <span className="text-[9px] text-text-100/60">Eje Y</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.espejoY === "1"}
                  onClick={() => set("espejoY", form.espejoY === "1" ? "0" : "1")}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.espejoY === "1" ? "bg-brand-200" : "bg-bg-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.espejoY === "1" ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>

          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2 mt-1">
            Tracking
          </p>

          {/* ═══ TOGGLE: MODO MANUAL DE TRACKING ═══ */}
          <div className={`rounded-md px-2 py-1.5 border transition-colors mb-2 ${form.trackingManual === "1" ? "bg-zinc-200/10 border-zinc-200/10" : "bg-bg-100/40 border-border/40"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="leading-tight">
                <span className="text-[10px] font-semibold text-text-100/80">Modo manual</span>
                <p className="text-xs text-text-200/60 italic">
                  {form.trackingManual === "1"
                    ? "Parámetros manuales de tracking"
                    : "Detección automática con parámetros fijos del sistema"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.trackingManual === "1"}
                onClick={() => set("trackingManual", form.trackingManual === "1" ? "0" : "1")}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.trackingManual === "1" ? "bg-brand-200" : "bg-bg-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.trackingManual === "1" ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {form.trackingManual === "1" && (
            <>
              <p className="text-[9px] text-text-200/40 italic mb-2">
                Deja un campo vacío para usar el valor fijo del sistema.
              </p>
              <div className="grid grid-cols-3 gap-x-3 gap-y-3 mb-3">
                <SliderField label="SNR" value={form.snr} onChange={(v) => set("snr", v)} min={5} max={40} step={0.5} unit="dB"
                  info="Umbral mínimo de calidad de señal. Detecciones con SNR menor se descartan." />
                <SliderField label="RCS" value={form.rcs} onChange={(v) => set("rcs", v)} min={0} max={100} step={0.1} unit="m²"
                  info="Tamaño estimado del blanco radar." />
                <SliderField label="Vel. máx" value={form.maxSpeed} onChange={(v) => set("maxSpeed", v)} min={1} max={200} step={1} unit="m/s"
                  info="Velocidad máxima esperada en el escenario." />
                <SliderField label="Dist. asociación" value={form.associationDist} onChange={(v) => set("associationDist", v)} min={5} max={200} step={1} unit="m"
                  info="Distancia máxima para asignar una detección a un track existente." />
                <SliderField label="Puntos mín." value={form.minTrackPoints} onChange={(v) => set("minTrackPoints", v)} min={1} max={10} step={1}
                  info="Detecciones consecutivas para confirmar un track." />
                <SliderField label="TTL track" value={form.ttl} onChange={(v) => set("ttl", v)} min={1} max={60} step={0.5} unit="seg"
                  info="Segundos sin detección antes de eliminar un track confirmado." />
                <SliderField label="TTL detenido" value={form.stationaryTtl} onChange={(v) => set("stationaryTtl", v)} min={1} max={120} step={1} unit="seg"
                  info="TTL extendido para objetos detenidos." />
                <SliderField label="Suav. posición" value={form.emaSmooth} onChange={(v) => set("emaSmooth", v)} min={0.05} max={0.80} step={0.01}
                  info="Factor EMA para suavizar posición del track." />
                <SliderField label="Suav. velocidad" value={form.velSmooth} onChange={(v) => set("velSmooth", v)} min={0.05} max={0.60} step={0.01}
                  info="Factor EMA para suavizar velocidad del track." />
                <SliderField label="Máx detecciones" value={form.maxDetections} onChange={(v) => set("maxDetections", v)} min={5} max={200} step={1}
                  info="Máximo de detecciones por mensaje." />
                <SliderField label="Dist. clustering" value={form.clusterDist} onChange={(v) => set("clusterDist", v)} min={1} max={30} step={0.5} unit="m"
                  info="Distancia para agrupar detecciones cercanas." />
              </div>
            </>
          )}

        </div>

        <div className="px-3 py-2 border-t border-border/60 shrink-0 flex flex-col gap-1.5">
          <button
            onClick={save}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors disabled:opacity-50"
          >
            <IconDeviceFloppy size={13} />
            {isPending ? "Guardando..." : "Guardar avanzados"}
          </button>
        </div>
      </div>
    </>);
}

export interface DeviceEditPanelProps {
  editing: EditingDevice;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  liveEditPos?: { lat: number; lng: number } | null;
  onLiveEditPosChange?: (pos: { lat: number; lng: number }) => void;
  isPickingPosition?: boolean;
  onPickPosition?: () => void;
  onCancelPickPosition?: () => void;
  mode?: "sidebar" | "floating";
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function DeviceEditPanel({
  editing,
  onClose,
  liveEdit,
  onLiveEditChange,
  liveEditPos,
  onLiveEditPosChange,
  isPickingPosition,
  onPickPosition,
  onCancelPickPosition,
  mode = "sidebar",
  showAdvanced,
  onToggleAdvanced,
}: DeviceEditPanelProps) {
  const posProps = {
    liveEditPos,
    onLiveEditPosChange,
    isPickingPosition,
    onPickPosition,
    onCancelPickPosition,
  };

  if (editing.kind === "nanoradar") {
    return (
      <NanoradarForm
        device={editing.device}
        onClose={onClose}
        liveEdit={liveEdit}
        onLiveEditChange={onLiveEditChange}
        mode={mode}
        {...posProps}
      />
    );
  }
  if (editing.kind === "magosradar") {
    return (
      <MagosradarForm
        device={editing.device}
        onClose={onClose}
        liveEdit={liveEdit}
        onLiveEditChange={onLiveEditChange}
        mode={mode}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
        {...posProps}
      />
    );
  }
  if (editing.kind === "ptz") {
    return (
      <PtzForm
        device={editing.device}
        onClose={onClose}
        liveEdit={liveEdit}
        onLiveEditChange={onLiveEditChange}
        mode={mode}
        {...posProps}
      />
    );
  }
  if (editing.kind === "camara") {
    return (
      <CamaraForm
        device={editing.device}
        onClose={onClose}
        liveEdit={liveEdit}
        onLiveEditChange={onLiveEditChange}
        mode={mode}
        {...posProps}
      />
    );
  }
  return (
    <SpotterForm
      device={editing.device}
      onClose={onClose}
      liveEdit={liveEdit}
      onLiveEditChange={onLiveEditChange}
      mode={mode}
      {...posProps}
    />
  );
}
