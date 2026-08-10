import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconX, IconDeviceFloppy, IconTrash, IconAlertTriangle, IconMapPin, IconCrosshair, IconSettings } from "@tabler/icons-react";
import { Tooltip } from "@/components/ui";
import { useToast } from "@/libs/sonner";
import type {
  Nanoradares,
  Magosradares,
  Spotters,
  Camaras,
  Ptz,
  PerfilMagos,
} from "@/features/config-devices/types/ConfigServices.type";
import { useUpdateNanoradar, useDeleteNanoradar } from "@/features/config-devices/nanoradar/hooks/useUpdateNanoradar";
import type { NanoradarPayload } from "@/features/config-devices/nanoradar/service";
import { useUpdateMagosradar, useDeleteMagosradar } from "@/features/config-devices/magosradar/hooks/useUpdateMagosradar";
import type { MagosradarPayload } from "@/features/config-devices/magosradar/service";
import { useCreatePerfilMagos } from "@/features/config-devices/magosradar/hooks/usePerfilMagos";
import { useMagosradarProfiles, findProfileById } from "@/features/config-devices/magosradar/config/magosradarProfiles";
import { GestionarPerfilesModal } from "@/features/config-devices/magosradar/components/GestionarPerfilesModal";
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
}

function RangeNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
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
          className="flex-1 accent-emerald-400 cursor-pointer"
          style={{ height: "4px" }}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-14 shrink-0 text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-1.5 py-0.5 text-text-100 text-right tabular-nums focus:outline-none focus:border-emerald-500/60"
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
}

function TextField({
  label,
  value,
  type,
  onChange,
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
        className="text-[11px] bg-bg-200/50 border border-border/60 rounded-md px-2 py-1 text-text-100 focus:outline-none focus:border-emerald-500/60"
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
          <span className="text-[8px] font-mono text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">
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

  // La latitud/longitud se obtiene de liveEditPos (marker en mapa) o del formulario
  const effectiveLat = liveEditPos ? liveEditPos.lat.toFixed(7) : form.latitud;
  const effectiveLng = liveEditPos ? liveEditPos.lng.toFixed(7) : form.longitud;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: MagosradarPayload = {
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
        <TextField label="Altitud (msnm)" value={form.altitud} onChange={(v) => set("altitud", v)} />
        <TextField label="Azimut" value={form.azimut} onChange={(v) => set("azimut", v)} />
      </div>

      {/* ── Cobertura ── */}
      <div className="grid grid-cols-1 gap-2">
        <RangeNumberField label="Grado" value={liveEdit.grado} onChange={(v) => onLiveEditChange({ ...liveEdit, grado: v })} min={0} max={360} unit="°" />
        <RangeNumberField label="Apertura" value={liveEdit.apertura} onChange={(v) => onLiveEditChange({ ...liveEdit, apertura: v })} min={1} max={180} unit="°" />
      </div>
      <RangeNumberField label="Radio" value={liveEdit.radio} onChange={(v) => onLiveEditChange({ ...liveEdit, radio: v })} min={0} max={10000} step={50} unit="m" />
      <ColorField value={liveEdit.color} onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })} />

      {/* ── Video ── */}
      <div className="grid grid-cols-2 gap-2">
        <RangeNumberField label="Channel" value={form.channel} onChange={(v) => set("channel", v)} min={1} max={64} />
        <RangeNumberField label="Subtype" value={form.subtype} onChange={(v) => set("subtype", v)} min={0} max={10} />
      </div>

      {/* ── Corrección ONVIF ── */}
      <div className="flex flex-col gap-2 border-t border-border/30">
        <span className="text-[10px] font-semibold text-text-100/40 uppercase tracking-widest">Corrección ONVIF</span>
        <div className="grid grid-cols-2 gap-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.panInvertido === 1} onChange={(e) => set("panInvertido", e.target.checked ? 1 : 0)} className="w-3.5 h-3.5 rounded accent-emerald-400 cursor-pointer" />
            <span className="text-[11px] text-text-100/70">Pan invertido</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.tiltInvertido === 1} onChange={(e) => set("tiltInvertido", e.target.checked ? 1 : 0)} className="w-3.5 h-3.5 rounded accent-emerald-400 cursor-pointer" />
            <span className="text-[11px] text-text-100/70">Tilt invertido</span>
          </label>
        </div>
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
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-text-100/10 text-text-100/40 text-[8px] font-bold cursor-help hover:bg-brand-200/20 hover:text-brand-200/70 transition-colors shrink-0">
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
        {unit && <span className="text-[8px] font-mono text-text-100/25">{unit}</span>}
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
    rcs: n(device.rcs),
    snr: n(device.snr),
    speed: n(device.speed),
    heading: n(device.heading),
    trackColor: device.trackColor ?? "",
    minTrackPoints: n(device.minTrackPoints),
    associationDist: n(device.associationDist),
    ttl: n(device.ttl),
    coastTtl: n(device.coastTtl),
    emaSmooth: n(device.emaSmooth),
    velSmooth: n(device.velSmooth),
    maxDetections: n(device.maxDetections),
    clusterDist: n(device.clusterDist),
    enabled: n(device.enabled),
    modelo: device.modelo ?? "",
    frecuencia: n(device.frecuencia),
    potencia: n(device.potencia),
    elevacion: n(device.elevacion),
    altitud: n(device.altitud),
    notas: device.notas ?? "",
    maxSpeed: n(device.maxSpeed),
    stationaryTtl: n(device.stationaryTtl),
    minConfidence: n(device.minConfidence),
    confidenceWindow: n(device.confidenceWindow),
    // ── Macro-parámetros ──
    modo_operacion: device.modo_operacion ?? "personalizado",
    sensibilidad: n(device.sensibilidad ?? 3),
    persistencia: n(device.persistencia ?? 3),
    _showAdvanced: "0",
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

  const storageKey = `magos-profile-${device.id}`;
  const [selectedProfileId, setSelectedProfileId] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? "custom"; } catch { return "custom"; }
  });
  const [appliedProfileId, setAppliedProfileId] = useState<string | null>(() => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  });

  // Persistir perfil seleccionado en localStorage
  useEffect(() => {
    try {
      if (selectedProfileId === "custom") {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, selectedProfileId);
      }
    } catch { /* ignore */ }
  }, [selectedProfileId, storageKey]);
  const { profiles: MAGOSRADAR_PROFILES } = useMagosradarProfiles();
  const { mutate: createProfile } = useCreatePerfilMagos();
  const [profileModal, setProfileModal] = useState<{ open: true; perfil?: PerfilMagos } | { open: false }>({ open: false });
  const [saveDialog, setSaveDialog] = useState<{ open: boolean }>({ open: false });
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");

  function handleProfileChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const profileId = e.target.value;
    setSelectedProfileId(profileId);
    if (profileId === "custom") {
      setAppliedProfileId(null);
      return;
    }
    const profile = findProfileById(MAGOSRADAR_PROFILES, profileId);
    if (!profile) return;
    const v = profile.values;
    setForm((prev) => ({
      ...prev,
      rcs: v.rcs != null ? String(v.rcs) : "",
      snr: v.snr != null ? String(v.snr) : "",
      speed: v.speed != null ? String(v.speed) : "",
      heading: v.heading != null ? String(v.heading) : "",
      trackColor: v.trackColor ?? "",
      minTrackPoints: v.minTrackPoints != null ? String(v.minTrackPoints) : "",
      associationDist: v.associationDist != null ? String(v.associationDist) : "",
      ttl: v.ttl != null ? String(v.ttl) : "",
      coastTtl: v.coastTtl != null ? String(v.coastTtl) : "",
      emaSmooth: v.emaSmooth != null ? String(v.emaSmooth) : "",
      velSmooth: v.velSmooth != null ? String(v.velSmooth) : "",
      maxDetections: v.maxDetections != null ? String(v.maxDetections) : "",
      clusterDist: v.clusterDist != null ? String(v.clusterDist) : "",
      frecuencia: v.frecuencia != null ? String(v.frecuencia) : "",
      potencia: v.potencia != null ? String(v.potencia) : "",
      elevacion: v.elevacion != null ? String(v.elevacion) : "",
      altitud: v.altitud != null ? String(v.altitud) : "",
      modo_operacion: v.modo_operacion ?? "personalizado",
      sensibilidad: v.sensibilidad != null ? String(v.sensibilidad) : "3",
      persistencia: v.persistencia != null ? String(v.persistencia) : "3",
    }));
    setAppliedProfileId(profileId);
    // Guardar en BD
    mutate(
      {
        id: device.id,
        payload: {
          rcs: v.rcs ?? null,
          snr: v.snr ?? null,
          speed: v.speed ?? null,
          heading: v.heading ?? null,
          trackColor: v.trackColor ?? null,
          minTrackPoints: v.minTrackPoints ?? null,
          associationDist: v.associationDist ?? null,
          ttl: v.ttl ?? null,
          coastTtl: v.coastTtl ?? null,
          emaSmooth: v.emaSmooth ?? null,
          velSmooth: v.velSmooth ?? null,
          maxDetections: v.maxDetections ?? null,
          clusterDist: v.clusterDist ?? null,
          frecuencia: v.frecuencia ?? null,
          potencia: v.potencia ?? null,
          elevacion: v.elevacion ?? null,
          altitud: v.altitud ?? null,
          maxSpeed: v.maxSpeed ?? null,
          stationaryTtl: v.stationaryTtl ?? null,
          minConfidence: v.minConfidence ?? null,
          confidenceWindow: v.confidenceWindow ?? null,
          modo_operacion: v.modo_operacion ?? null,
          sensibilidad: v.sensibilidad ?? null,
          persistencia: v.persistencia ?? null,
        },
      },
      {
        onSuccess: () => success(`Perfil "${profile.name}" aplicado`),
        onError: (err) => showError(err instanceof Error ? err.message : "Error al aplicar perfil"),
      },
    );
  }

  function set(k: string, v: string) {
    // Si hay un perfil aplicado y se cambia algún campo → volver a Personalizado
    if (appliedProfileId !== null && selectedProfileId !== "custom") {
      setSelectedProfileId("custom");
      setAppliedProfileId(null);
    }
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    // Si el modo NO es personalizado, el backend recalcula los micro-params
    // automáticamente. Enviamos null para que la traducción sea la fuente de verdad.
    const esPreset = (form.modo_operacion ?? "personalizado") !== "personalizado";

    mutate(
      {
        id: device.id,
        payload: {
          // ── Micro-parámetros: solo si modo personalizado ──
          rcs: esPreset ? null : nn(form.rcs),
          snr: esPreset ? null : nn(form.snr),
          speed: esPreset ? null : nn(form.speed),
          heading: esPreset ? null : nn(form.heading),
          trackColor: form.trackColor || null,
          minTrackPoints: esPreset ? null : (form.minTrackPoints === "" ? null : Number(form.minTrackPoints)),
          associationDist: esPreset ? null : nn(form.associationDist),
          ttl: esPreset ? null : nn(form.ttl),
          coastTtl: esPreset ? null : nn(form.coastTtl),
          emaSmooth: esPreset ? null : nn(form.emaSmooth),
          velSmooth: esPreset ? null : nn(form.velSmooth),
          maxDetections: esPreset ? null : (form.maxDetections === "" ? null : Number(form.maxDetections)),
          clusterDist: esPreset ? null : nn(form.clusterDist),
          enabled: form.enabled === "" ? null : Number(form.enabled),
          modelo: form.modelo || null,
          frecuencia: esPreset ? null : nn(form.frecuencia),
          potencia: esPreset ? null : nn(form.potencia),
          elevacion: esPreset ? null : nn(form.elevacion),
          altitud: esPreset ? null : nn(form.altitud),
          notas: form.notas || null,
          maxSpeed: esPreset ? null : nn(form.maxSpeed),
          stationaryTtl: esPreset ? null : nn(form.stationaryTtl),
          minConfidence: esPreset ? null : nn(form.minConfidence),
          confidenceWindow: esPreset ? null : (form.confidenceWindow === "" ? null : Number(form.confidenceWindow)),
          // ── Macro-parámetros (siempre) ──
          modo_operacion: form.modo_operacion || null,
          sensibilidad: form.sensibilidad === "" ? null : Number(form.sensibilidad),
          persistencia: form.persistencia === "" ? null : Number(form.persistencia),
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
      <div className="relative flex flex-col min-w-120 -top-30 max-h-[calc(100vh-6rem)] bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-100/40">
            MagosRadar · Avanzado
          </span>
          <span className="text-[7px] text-text-100/20 uppercase">{globalHint}</span>
        </div>

        <div className="px-3 py-2 border-b border-border/40">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60 block">
              Perfil de configuración
            </label>
            <button
              type="button"
              onClick={() => setProfileModal({ open: true })}
              className="text-xs text-text-200 hover:text-brand-200 transition flex items-center gap-0.5"
            >
              <IconSettings size={13} stroke={1.5} />
              Gestionar
            </button>
          </div>
          <select
            value={selectedProfileId}
            onChange={handleProfileChange}
            className="w-full rounded-lg border border-border bg-bg-100 text-text-100 px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition"
          >
            {MAGOSRADAR_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProfileId !== "custom" && (
            <p className="text-[10px] text-text-200/70 italic mt-1">Ajustes del perfil aplicados</p>
          )}
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

          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2">
            Tracking
          </p>

          {/* ═══ MACRO-PARÁMETROS (simplificado) ═══ */}
          <div className="bg-bg-200/30 rounded-lg p-2 border border-brand-200/20 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-brand-200/70 uppercase tracking-widest">Modo de operación</span>
            </div>
            <select
              value={form.modo_operacion ?? "personalizado"}
              onChange={(e) => set("modo_operacion", e.target.value)}
              className="w-full rounded-md border border-border bg-bg-100 text-text-100 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-200/50 transition mb-2"
            >
              <option value="urbano"> Urbano</option>
              <option value="carretera"> Carretera</option>
              <option value="industrial"> Industrial</option>
              <option value="maritimo"> Marítimo</option>
              <option value="personalizado"> Personalizado</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-text-100/40">Sensibilidad: {form.sensibilidad ?? 3}/5</span>
                <input type="range" min={1} max={5} value={form.sensibilidad ?? 3} onChange={(e) => set("sensibilidad", e.target.value)}
                  className="w-full accent-amber-400 cursor-pointer" style={{height:"3px"}} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-text-100/40">Persistencia: {form.persistencia ?? 3}/5</span>
                <input type="range" min={1} max={5} value={form.persistencia ?? 3} onChange={(e) => set("persistencia", e.target.value)}
                  className="w-full accent-cyan-400 cursor-pointer" style={{height:"3px"}} />
              </div>
            </div>
          </div>

          {/* ═══ TOGGLE AVANZADO ═══ */}
          <button
            type="button"
            onClick={() => set("_showAdvanced", form._showAdvanced === "1" ? "0" : "1")}
            className="text-[9px] text-text-200/60 hover:text-brand-200/80 transition-colors mb-2 flex items-center gap-1"
          >
            <IconSettings size={11} />
            {form._showAdvanced === "1" ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
          </button>

          {(form._showAdvanced === "1" || (form.modo_operacion ?? "personalizado") === "personalizado") && (
          <>
          <div className="grid grid-cols-3 gap-x-3 gap-y-3">
            {/* trackColor — input texto + color picker */}
            <div className="flex flex-col gap-1">
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

            <SliderField label="SNR" value={form.snr} onChange={(v) => set("snr", v)} min={5} max={40} step={0.5} unit="dB"
              info="Umbral mínimo de calidad de señal. Detecciones con SNR menor se descartan. A mayor valor, menos detecciones pero más nítidas." />
            <SliderField label="RCS" value={form.rcs} onChange={(v) => set("rcs", v)} min={0.01} max={100} step={0.1} unit="m²"
              info="Tamaño estimado del blanco radar. Persona ≈ 0.5–1 m², auto ≈ 5–10 m²." />
            <SliderField label="Vel. máx" value={form.speed} onChange={(v) => set("speed", v)} min={1} max={150} step={1} unit="m/s"
              info="Velocidad máxima para propagación por inercia (coasting). 55 m/s ≈ 200 km/h." />
            <SliderField label="Rumbo ref." value={form.heading} onChange={(v) => set("heading", v)} min={0} max={360} step={1} unit="°"
              info="Rumbo geográfico de referencia del radar (0=N, 90=E, 180=S, 270=W)." />
            <SliderField label="Puntos mín." value={form.minTrackPoints} onChange={(v) => set("minTrackPoints", v)} min={1} max={10} step={1}
              info="Detecciones consecutivas necesarias para confirmar un track (tentative → confirmed)." />
            <SliderField label="Dist. asociación" value={form.associationDist} onChange={(v) => set("associationDist", v)} min={5} max={200} step={1} unit="m"
              info="Distancia máxima para asignar una detección a un track existente." />
            <SliderField label="TTL track" value={form.ttl} onChange={(v) => set("ttl", v)} min={1} max={60} step={0.5} unit="seg"
              info="Segundos sin detección antes de eliminar un track confirmado." />
            <SliderField label="TTL coasting" value={form.coastTtl} onChange={(v) => set("coastTtl", v)} min={0.5} max={15} step={0.5} unit="seg"
              info="Tiempo que un track puede seguir moviéndose por inercia (predicción) sin detecciones." />
            <SliderField label="Suav. posición" value={form.emaSmooth} onChange={(v) => set("emaSmooth", v)} min={0.05} max={0.80} step={0.01}
              info="Factor EMA para suavizar posición del track. Mayor = más reactivo pero titila." />
            <SliderField label="Suav. velocidad" value={form.velSmooth} onChange={(v) => set("velSmooth", v)} min={0.05} max={0.60} step={0.01}
              info="Factor EMA para suavizar velocidad del track. Mayor = más reactivo pero menos estable." />
            <SliderField label="Máx detecciones" value={form.maxDetections} onChange={(v) => set("maxDetections", v)} min={5} max={200} step={1}
              info="Máximo de detecciones por mensaje que se pasan al tracker." />
            <SliderField label="Dist. clustering" value={form.clusterDist} onChange={(v) => set("clusterDist", v)} min={1} max={30} step={0.5} unit="m"
              info="Distancia para agrupar detecciones cercanas y quedarse con la de mejor SNR." />
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2 mt-1">
            Velocidad & Tiempo
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-5">
            <SliderField label="Vel. máx escenario" value={form.maxSpeed} onChange={(v) => set("maxSpeed", v)} min={1} max={200} step={1} unit="m/s"
              info="Velocidad máxima esperada en el escenario. Usado para filtrar detecciones y calcular confianza." />
            <SliderField label="TTL detenido" value={form.stationaryTtl} onChange={(v) => set("stationaryTtl", v)} min={1} max={120} step={1} unit="seg"
              info="TTL extendido para objetos detectados como detenidos (isStationary). Mantiene el track visible más tiempo." />
          </div>

          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-100/30 mb-2 mt-1">
            Scoring & Confianza
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-5">
            <SliderField label="Confianza mín." value={form.minConfidence} onChange={(v) => set("minConfidence", v)} min={0} max={100} step={1} unit="%"
              info="Confianza mínima (0-100) para mostrar un track en el mapa. Por debajo de este umbral se oculta." />
            <SliderField label="Ventana confianza" value={form.confidenceWindow} onChange={(v) => set("confidenceWindow", v)} min={1} max={50} step={1}
              info="Número de puntos recientes del track que se evalúan para calcular la confianza promedio." />
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
          <button
            onClick={() => {
              setNewProfileName("");
              setNewProfileDesc("");
              setSaveDialog({ open: true });
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold  hover:bg-brand-200/25 text-text-100 transition-colors"
          >
            <IconSettings size={13} />
            Guardar como perfil
          </button>
        </div>
      </div>

      {saveDialog.open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setSaveDialog({ open: false })}
        >
          <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-100">Guardar como perfil</h3>
              <button onClick={() => setSaveDialog({ open: false })} className="text-text-200 hover:text-text-100 transition">
                <IconX size={16} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-text-100/70 font-semibold uppercase tracking-wider">Nombre</label>
                <input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ej: Configuración costera"
                  className="w-full rounded-lg border border-border bg-bg-100 text-text-100 placeholder-text-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-text-100/70 font-semibold uppercase tracking-wider">Descripción</label>
                <input
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="Opcional: describa el escenario de uso"
                  className="w-full rounded-lg border border-border bg-bg-100 text-text-100 placeholder-text-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setSaveDialog({ open: false })}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-bg-400/50 hover:bg-bg-400/70 text-text-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!newProfileName.trim()) return;
                    createProfile(
                      {
                        nombre: newProfileName.trim(),
                        descripcion: newProfileDesc.trim(),
                        snr: nn(form.snr),
                        rcs: nn(form.rcs),
                        speed: nn(form.speed),
                        heading: nn(form.heading),
                        trackColor: form.trackColor || null,
                        minTrackPoints: form.minTrackPoints === "" ? null : Number(form.minTrackPoints),
                        associationDist: nn(form.associationDist),
                        ttl: nn(form.ttl),
                        coastTtl: nn(form.coastTtl),
                        emaSmooth: nn(form.emaSmooth),
                        velSmooth: nn(form.velSmooth),
                        maxDetections: form.maxDetections === "" ? null : Number(form.maxDetections),
                        clusterDist: nn(form.clusterDist),
                        maxSpeed: nn(form.maxSpeed),
                        stationaryTtl: nn(form.stationaryTtl),
                        minConfidence: nn(form.minConfidence),
                        confidenceWindow: form.confidenceWindow === "" ? null : Number(form.confidenceWindow),
                        modo_operacion: form.modo_operacion || null,
                        sensibilidad: form.sensibilidad === "" ? null : Number(form.sensibilidad),
                        persistencia: form.persistencia === "" ? null : Number(form.persistencia),
                      },
                      {
                        onSuccess: (newPerfil) => {
                          success(`Perfil "${newProfileName.trim()}" creado`);
                          setSaveDialog({ open: false });
                          setSelectedProfileId(String(newPerfil.id));
                          setAppliedProfileId(String(newPerfil.id));
                        },
                        onError: (err) => showError(err instanceof Error ? err.message : "Error al crear perfil"),
                      },
                    );
                  }}
                  disabled={!newProfileName.trim()}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-brand-200 hover:bg-brand-200/80 text-black transition-colors disabled:opacity-50"
                >
                  Guardar perfil
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {profileModal.open && createPortal(
        <GestionarPerfilesModal
          onClose={() => setProfileModal({ open: false })}
        />,
        document.body,
      )}
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
