import { useState, useEffect } from "react";
import { IconX, IconDeviceFloppy, IconTrash, IconAlertTriangle, IconMapPin, IconCrosshair } from "@tabler/icons-react";
import type {
  Nanoradares,
  Spotters,
  Camaras,
  Ptz,
} from "@/features/config-devices/types/ConfigServices.type";
import { useUpdateNanoradar, useDeleteNanoradar } from "@/features/config-devices/nanoradar/hooks/useUpdateNanoradar";
import type { NanoradarPayload } from "@/features/config-devices/nanoradar/service";
import { useUpdateSpotter, useDeleteSpotter } from "@/features/config-devices/spotter/hooks/useUpdateSpotter";
import type { SpotterPayload } from "@/features/config-devices/spotter/service";
import { useUpdateCamara, useDeleteCamara } from "@/features/config-devices/camara/hooks/useUpdateCamara";
import { useCameraActivityStore } from "../../stores/cameraActivityStore";
import type { CamaraPayload } from "@/features/config-devices/camara/service";
import { useUpdatePtz, useDeletePtz } from "@/features/config-devices/ptz/hooks";
import type { PtzPayload } from "@/features/config-devices/ptz/service";

export interface LiveEditValues {
  grado: number;
  apertura: number;
  radio: number;
  color: string;
}

export type EditingDevice =
  | { kind: "nanoradar"; device: Nanoradares }
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

  // Sync lat/lng when marker is dragged or clicked on map
  useEffect(() => {
    if (!liveEditPos) return;
    setForm((p) => ({
      ...p,
      latitud: liveEditPos.lat.toFixed(7),
      longitud: liveEditPos.lng.toFixed(7),
    }));
  }, [liveEditPos]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: NanoradarPayload = {
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

  useEffect(() => {
    if (!liveEditPos) return;
    setForm((p) => ({
      ...p,
      latitude: liveEditPos.lat.toFixed(7),
      longitude: liveEditPos.lng.toFixed(7),
    }));
  }, [liveEditPos]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: SpotterPayload = {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      latitude: form.latitude,
      longitude: form.longitude,
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
        lat={form.latitude}
        lng={form.longitude}
        onLatChange={(v) => {
          set("latitude", v);
          onLiveEditPosChange?.({ lat: Number(v), lng: Number(form.longitude) });
        }}
        onLngChange={(v) => {
          set("longitude", v);
          onLiveEditPosChange?.({ lat: Number(form.latitude), lng: Number(v) });
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

  useEffect(() => {
    if (!liveEditPos) return;
    setPosForm({
      latitud: liveEditPos.lat.toFixed(7),
      longitud: liveEditPos.lng.toFixed(7),
    });
  }, [liveEditPos]);

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
      latitud: posForm.latitud,
      longitud: posForm.longitud,
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

  useEffect(() => {
    if (!liveEditPos) return;
    setPosForm({
      latitud: liveEditPos.lat.toFixed(7),
      longitud: liveEditPos.lng.toFixed(7),
    });
  }, [liveEditPos]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function save() {
    const payload: PtzPayload = {
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
      latitud: posForm.latitud,
      longitud: posForm.longitud,
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
    </PanelWrapper>
  );
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
