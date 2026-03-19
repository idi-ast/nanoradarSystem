import { useState } from "react";
import { IconX, IconDeviceFloppy } from "@tabler/icons-react";
import type {
  Nanoradares,
  Spotters,
  Camaras,
} from "@/features/config-devices/types/ConfigServices.type";
import { useUpdateNanoradar } from "@/features/config-devices/nanoradar/hooks/useUpdateNanoradar";
import type { NanoradarPayload } from "@/features/config-devices/nanoradar/service";
import { useUpdateSpotter } from "@/features/config-devices/spotter/hooks/useUpdateSpotter";
import type { SpotterPayload } from "@/features/config-devices/spotter/service";
import { useUpdateCamara } from "@/features/config-devices/camara/hooks/useUpdateCamara";
import type { CamaraPayload } from "@/features/config-devices/camara/service";

export interface LiveEditValues {
  grado: number;
  apertura: number;
  radio: number;
  color: string;
}

export type EditingDevice =
  | { kind: "nanoradar"; device: Nanoradares }
  | { kind: "spotter"; device: Spotters }
  | { kind: "camara"; device: Camaras };

function RangeNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
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

function TextField({
  label,
  value,
  type,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
}) {
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

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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

function PanelWrapper({
  title,
  subtitle,
  onClose,
  onSave,
  isPending,
  isError,
  children,
  mode = "sidebar",
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
  isError: boolean;
  children: React.ReactNode;
  mode?: "sidebar" | "floating";
}) {
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

      <div className="px-3 py-2 border-t border-border/60 shrink-0">
        <button
          onClick={onSave}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors disabled:opacity-50"
        >
          <IconDeviceFloppy size={13} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function NanoradarForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  mode = "sidebar",
}: {
  device: Nanoradares;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  mode?: "sidebar" | "floating";
}) {
  const { mutate, isPending, isError } = useUpdateNanoradar();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitud: device.latitud,
    longitud: device.longitud,
    azimut: device.azimut ?? "0",
  });

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

  return (
    <PanelWrapper
      title="NanoRadar"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      isPending={isPending}
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
      <TextField
        label="Latitud"
        value={form.latitud}
        onChange={(v) => set("latitud", v)}
      />
      <TextField
        label="Longitud"
        value={form.longitud}
        onChange={(v) => set("longitud", v)}
      />
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
    </PanelWrapper>
  );
}

function SpotterForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  mode = "sidebar",
}: {
  device: Spotters;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  mode?: "sidebar" | "floating";
}) {
  const { mutate, isPending, isError } = useUpdateSpotter();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitude: device.latitude,
    longitude: device.longitude,
    azimut: device.azimut ?? "0",
  });

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

  return (
    <PanelWrapper
      title="Spotter"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      isPending={isPending}
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
      <TextField
        label="Latitud"
        value={form.latitude}
        onChange={(v) => set("latitude", v)}
      />
      <TextField
        label="Longitud"
        value={form.longitude}
        onChange={(v) => set("longitude", v)}
      />
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
    </PanelWrapper>
  );
}

function CamaraForm({
  device,
  onClose,
  liveEdit,
  onLiveEditChange,
  mode = "sidebar",
}: {
  device: Camaras;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  mode?: "sidebar" | "floating";
}) {
  const { mutate, isPending, isError } = useUpdateCamara();
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
    };
    mutate({ id: device.id, payload }, { onSuccess: onClose });
  }

  return (
    <PanelWrapper
      title="Cámara"
      subtitle={form.nombre}
      onClose={onClose}
      onSave={save}
      isPending={isPending}
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
      {/* <RangeNumberField
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
      /> */}
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
      <ColorField
        value={liveEdit.color}
        onChange={(v) => onLiveEditChange({ ...liveEdit, color: v })}
      />
    </PanelWrapper>
  );
}

export function DeviceEditPanel({
  editing,
  onClose,
  liveEdit,
  onLiveEditChange,
  mode = "sidebar",
}: {
  editing: EditingDevice;
  onClose: () => void;
  liveEdit: LiveEditValues;
  onLiveEditChange: (v: LiveEditValues) => void;
  mode?: "sidebar" | "floating";
}) {
  if (editing.kind === "nanoradar") {
    return (
      <NanoradarForm
        device={editing.device}
        onClose={onClose}
        liveEdit={liveEdit}
        onLiveEditChange={onLiveEditChange}
        mode={mode}
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
    />
  );
}
