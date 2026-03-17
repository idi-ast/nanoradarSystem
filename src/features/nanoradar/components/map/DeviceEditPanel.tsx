import { useState } from "react";
import { IconX, IconDeviceFloppy } from "@tabler/icons-react";
import type { Nanoradares, Spotters } from "@/features/config-devices/types/ConfigServices.type";
import { useUpdateNanoradar } from "@/features/config-devices/nanoradar/hooks/useUpdateNanoradar";
import type { NanoradarPayload } from "@/features/config-devices/nanoradar/service";
import { useUpdateSpotter } from "@/features/config-devices/spotter/hooks/useUpdateSpotter";
import type { SpotterPayload } from "@/features/config-devices/spotter/service";

export type EditingDevice =
  | { kind: "nanoradar"; device: Nanoradares }
  | { kind: "spotter"; device: Spotters };


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
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-text-100/50 uppercase tracking-widest">
        {label}
      </span>
      <input
        type="text"
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
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
  isError: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full w-60 border-r border-emerald-500/20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-100/40">
            {title}
          </p>
          <p className="text-[11px] font-semibold text-text-100 truncate">{subtitle}</p>
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


function NanoradarForm({ device, onClose }: { device: Nanoradares; onClose: () => void }) {
  const { mutate, isPending, isError } = useUpdateNanoradar();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitud: device.latitud,
    longitud: device.longitud,
    azimut: Number(device.azimut) || 0,
    grado: device.grado ?? 0,
    radio: device.radio ?? 0,
    apertura: device.apertura ?? 0,
    color: device.color,
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
      azimut: String(form.azimut),
      grado: form.grado,
      radio: form.radio,
      apertura: form.apertura,
      color: form.color,
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
    >
      <TextField label="Nombre" value={form.nombre} onChange={(v) => set("nombre", v)} />
      <TextField label="Dirección IP" value={form.direccionIp} onChange={(v) => set("direccionIp", v)} />
      <RangeNumberField
        label="Grado"
        value={form.grado}
        onChange={(v) => set("grado", v)}
        min={0} max={360} unit="°"
      />
      <RangeNumberField
        label="Azimut"
        value={form.azimut}
        onChange={(v) => set("azimut", v)}
        min={0} max={360} unit="°"
      />
      <RangeNumberField
        label="Apertura"
        value={form.apertura}
        onChange={(v) => set("apertura", v)}
        min={1} max={180} unit="°"
      />
      <RangeNumberField
        label="Radio"
        value={form.radio}
        onChange={(v) => set("radio", v)}
        min={0} max={10000} step={50} unit="m"
      />
      <TextField label="Latitud" value={form.latitud} onChange={(v) => set("latitud", v)} />
      <TextField label="Longitud" value={form.longitud} onChange={(v) => set("longitud", v)} />
      <ColorField value={form.color} onChange={(v) => set("color", v)} />
    </PanelWrapper>
  );
}


function SpotterForm({ device, onClose }: { device: Spotters; onClose: () => void }) {
  const { mutate, isPending, isError } = useUpdateSpotter();
  const [form, setForm] = useState({
    nombre: device.nombre,
    direccionIp: device.direccionIp,
    latitude: device.latitude,
    longitude: device.longitude,
    azimut: Number(device.azimut) || 0,
    grado: device.grado ?? 0,
    radio: device.radio ?? 0,
    apertura: device.apertura ?? 0,
    color: device.color,
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
      azimut: String(form.azimut),
      grado: form.grado,
      radio: form.radio,
      apertura: form.apertura,
      color: form.color,
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
    >
      <TextField label="Nombre" value={form.nombre} onChange={(v) => set("nombre", v)} />
      <TextField label="Dirección IP" value={form.direccionIp} onChange={(v) => set("direccionIp", v)} />
      <RangeNumberField
        label="Grado"
        value={form.grado}
        onChange={(v) => set("grado", v)}
        min={0} max={360} unit="°"
      />
      <RangeNumberField
        label="Azimut"
        value={form.azimut}
        onChange={(v) => set("azimut", v)}
        min={0} max={360} unit="°"
      />
      <RangeNumberField
        label="Apertura"
        value={form.apertura}
        onChange={(v) => set("apertura", v)}
        min={1} max={180} unit="°"
      />
      <RangeNumberField
        label="Radio"
        value={form.radio}
        onChange={(v) => set("radio", v)}
        min={0} max={10000} step={50} unit="m"
      />
      <TextField label="Latitud" value={form.latitude} onChange={(v) => set("latitude", v)} />
      <TextField label="Longitud" value={form.longitude} onChange={(v) => set("longitude", v)} />
      <ColorField value={form.color} onChange={(v) => set("color", v)} />
    </PanelWrapper>
  );
}


export function DeviceEditPanel({
  editing,
  onClose,
}: {
  editing: EditingDevice;
  onClose: () => void;
}) {
  if (editing.kind === "nanoradar") {
    return <NanoradarForm device={editing.device} onClose={onClose} />;
  }
  return <SpotterForm device={editing.device} onClose={onClose} />;
}
