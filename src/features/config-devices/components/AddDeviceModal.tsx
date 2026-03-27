import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { IconX, IconRadar, IconCurrentLocation, IconCamera, IconAdjustments } from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useCreateNanoradar } from "../nanoradar/hooks/useUpdateNanoradar";
import { useCreateSpotter } from "../spotter/hooks/useUpdateSpotter";
import { useCreateCamara } from "../camara/hooks/useUpdateCamara";
import { useCreatePtz } from "../ptz/hooks";
import type { NanoradarPayload } from "../nanoradar/service";
import type { SpotterPayload } from "../spotter/service";
import type { CamaraPayload } from "../camara/service";
import type { PtzPayload } from "../ptz/service";

type DeviceTab = "nanoradar" | "spotter" | "camara" | "ptz";

interface AddDeviceModalProps {
  onClose: () => void;
  defaultTab?: DeviceTab;
}

const TABS: { key: DeviceTab; label: string; icon: React.ReactNode }[] = [
  { key: "nanoradar", label: "NanoRadar", icon: <IconRadar size={14} stroke={1.5} /> },
  { key: "spotter", label: "Spotter", icon: <IconCurrentLocation size={14} stroke={1.5} /> },
  { key: "camara", label: "Cámara", icon: <IconCamera size={14} stroke={1.5} /> },
  { key: "ptz", label: "PTZ", icon: <IconAdjustments size={14} stroke={1.5} /> },
];

const defaultNanoradar: NanoradarPayload = {
  nombre: "",
  direccionIp: "",
  latitud: "",
  longitud: "",
  azimut: "0",
  grado: 0,
  radio: 100,
  apertura: 360,
  color: "#22c55e",
};

const defaultSpotter: SpotterPayload = {
  nombre: "",
  direccionIp: "",
  latitude: "",
  longitude: "",
  azimut: "0",
  grado: 0,
  radio: 100,
  apertura: 360,
  color: "#38bdf8",
};

const defaultCamara: CamaraPayload = {
  nombre: "",
  direccionIp: "",
  channel: 1,
  subtype: 0,
  azimut: "0",
  usuario: "admin",
  password: "",
  color: "#f59e0b",
  grado: 0,
  radio: 100,
  apertura: 90,
  url_stream: "",
  tipo: "IP",
};

const defaultPtz: PtzPayload = {
  nombre: "",
  direccionIp: "",
  channel: 1,
  subtype: 0,
  azimut: "0",
  usuario: "admin",
  password: "",
  color: "#8207d5",
  grado: 0,
  radio: 100,
  apertura: 90,
  url_stream: "",
  tipo: "IP",
  latitud: "",
  longitud: "",
  idEmpresa: 1,
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name} className="text-[11px] text-text-100/60 uppercase tracking-widest">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

function NanoradarForm({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error } = useCreateNanoradar();
  const [form, setForm] = useState<NanoradarPayload>(defaultNanoradar);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        ...form,
        grado: Number(form.grado),
        radio: Number(form.radio),
        apertura: Number(form.apertura),
        azimut: String(form.azimut),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldRow>
        <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="NanoRadar-01" />
        <Field label="Dirección IP" name="direccionIp" value={form.direccionIp} onChange={handleChange} placeholder="192.168.1.100" />
      </FieldRow>
      <FieldRow>
        <Field label="Latitud" name="latitud" value={form.latitud} onChange={handleChange} placeholder="-33.4489" />
        <Field label="Longitud" name="longitud" value={form.longitud} onChange={handleChange} placeholder="-70.6693" />
      </FieldRow>
      <FieldRow>
        <Field label="Azimut (°)" name="azimut" value={form.azimut} onChange={handleChange} type="number" placeholder="0" />
        <Field label="Grado (°)" name="grado" value={form.grado} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Radio (m)" name="radio" value={form.radio} onChange={handleChange} type="number" placeholder="100" />
        <Field label="Apertura (°)" name="apertura" value={form.apertura} onChange={handleChange} type="number" placeholder="360" />
      </FieldRow>
      <div className="flex flex-col gap-1">
        <Label htmlFor="color-nr" className="text-[11px] text-text-100/60 uppercase tracking-widest">Color</Label>
        <div className="flex items-center gap-2">
          <input id="color-nr" type="color" name="color" value={form.color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
          <span className="text-xs text-text-100/50">{form.color}</span>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{String((error as Error).message)}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Agregar NanoRadar"}</Button>
      </div>
    </form>
  );
}

function SpotterForm({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error } = useCreateSpotter();
  const [form, setForm] = useState<SpotterPayload>(defaultSpotter);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        ...form,
        grado: Number(form.grado),
        radio: Number(form.radio),
        apertura: Number(form.apertura),
        azimut: String(form.azimut),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldRow>
        <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Spotter-01" />
        <Field label="Dirección IP" name="direccionIp" value={form.direccionIp} onChange={handleChange} placeholder="192.168.1.101" />
      </FieldRow>
      <FieldRow>
        <Field label="Latitud" name="latitude" value={form.latitude} onChange={handleChange} placeholder="-33.4489" />
        <Field label="Longitud" name="longitude" value={form.longitude} onChange={handleChange} placeholder="-70.6693" />
      </FieldRow>
      <FieldRow>
        <Field label="Azimut (°)" name="azimut" value={form.azimut} onChange={handleChange} type="number" placeholder="0" />
        <Field label="Grado (°)" name="grado" value={form.grado} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Radio (m)" name="radio" value={form.radio} onChange={handleChange} type="number" placeholder="100" />
        <Field label="Apertura (°)" name="apertura" value={form.apertura} onChange={handleChange} type="number" placeholder="360" />
      </FieldRow>
      <div className="flex flex-col gap-1">
        <Label htmlFor="color-sp" className="text-[11px] text-text-100/60 uppercase tracking-widest">Color</Label>
        <div className="flex items-center gap-2">
          <input id="color-sp" type="color" name="color" value={form.color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
          <span className="text-xs text-text-100/50">{form.color}</span>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{String((error as Error).message)}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Agregar Spotter"}</Button>
      </div>
    </form>
  );
}

function CamaraForm({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error } = useCreateCamara();
  const [form, setForm] = useState<CamaraPayload>(defaultCamara);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        ...form,
        channel: Number(form.channel),
        subtype: Number(form.subtype),
        grado: Number(form.grado),
        radio: Number(form.radio),
        apertura: Number(form.apertura),
        azimut: String(form.azimut),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldRow>
        <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Cámara-01" />
        <Field label="Dirección IP" name="direccionIp" value={form.direccionIp} onChange={handleChange} placeholder="192.168.1.102" />
      </FieldRow>
      <FieldRow>
        <Field label="Usuario" name="usuario" value={form.usuario} onChange={handleChange} placeholder="admin" />
        <Field label="Contraseña" name="password" value={form.password} onChange={handleChange} type="password" placeholder="••••••" />
      </FieldRow>
      <div className="flex flex-col gap-1">
        <Label htmlFor="url_stream" className="text-[11px] text-text-100/60 uppercase tracking-widest">URL Stream</Label>
        <Input
          id="url_stream"
          name="url_stream"
          value={form.url_stream}
          onChange={handleChange}
          placeholder="http://10.0.0.1:8889/camara_1/index.m3u8"
          className="h-8 text-sm"
        />
      </div>
      <FieldRow>
        <div className="flex flex-col gap-1">
          <Label htmlFor="tipo" className="text-[11px] text-text-100/60 uppercase tracking-widest">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="h-8 text-sm rounded-md border border-border bg-bg-200 text-text-100 px-2 focus:outline-none focus:ring-1 focus:ring-brand-200"
          >
            <option value="IP">IP</option>
            <option value="RTSP">RTSP</option>
            <option value="ONVIF">ONVIF</option>
            <option value="Hikvision">Hikvision</option>
            <option value="Dahua">Dahua</option>
          </select>
        </div>
        <Field label="Azimut (°)" name="azimut" value={form.azimut} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Canal" name="channel" value={form.channel} onChange={handleChange} type="number" placeholder="1" />
        <Field label="Subtipo" name="subtype" value={form.subtype} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Radio (m)" name="radio" value={form.radio} onChange={handleChange} type="number" placeholder="100" />
        <Field label="Apertura (°)" name="apertura" value={form.apertura} onChange={handleChange} type="number" placeholder="90" />
      </FieldRow>
      <div className="flex flex-col gap-1">
        <Label htmlFor="color-cam" className="text-[11px] text-text-100/60 uppercase tracking-widest">Color</Label>
        <div className="flex items-center gap-2">
          <input id="color-cam" type="color" name="color" value={form.color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
          <span className="text-xs text-text-100/50">{form.color}</span>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{String((error as Error).message)}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Agregar Cámara"}</Button>
      </div>
    </form>
  );
}

function PtzForm({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error } = useCreatePtz();
  const [form, setForm] = useState<PtzPayload>(defaultPtz);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        ...form,
        channel: Number(form.channel),
        subtype: Number(form.subtype),
        grado: Number(form.grado),
        radio: Number(form.radio),
        apertura: Number(form.apertura),
        azimut: String(form.azimut),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldRow>
        <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="PTZ-01" />
        <Field label="Dirección IP" name="direccionIp" value={form.direccionIp} onChange={handleChange} placeholder="192.168.1.103" />
      </FieldRow>
      <FieldRow>
        <Field label="Latitud" name="latitud" value={form.latitud} onChange={handleChange} placeholder="-33.4489" />
        <Field label="Longitud" name="longitud" value={form.longitud} onChange={handleChange} placeholder="-70.6693" />
      </FieldRow>
      <FieldRow>
        <Field label="Usuario" name="usuario" value={form.usuario} onChange={handleChange} placeholder="admin" />
        <Field label="Contraseña" name="password" value={form.password} onChange={handleChange} type="password" placeholder="••••••" />
      </FieldRow>
      <div className="flex flex-col gap-1">
        <Label htmlFor="url_stream_ptz" className="text-[11px] text-text-100/60 uppercase tracking-widest">URL Stream</Label>
        <Input
          id="url_stream_ptz"
          name="url_stream"
          value={form.url_stream}
          onChange={handleChange}
          placeholder="http://10.0.0.1:8889/ptz_1/index.m3u8"
          className="h-8 text-sm"
        />
      </div>
      <FieldRow>
        <div className="flex flex-col gap-1">
          <Label htmlFor="tipo_ptz" className="text-[11px] text-text-100/60 uppercase tracking-widest">Tipo</Label>
          <select
            id="tipo_ptz"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="h-8 text-sm rounded-md border border-border bg-bg-200 text-text-100 px-2 focus:outline-none focus:ring-1 focus:ring-brand-200"
          >
            <option value="IP">IP</option>
            <option value="RTSP">RTSP</option>
            <option value="ONVIF">ONVIF</option>
            <option value="Hikvision">Hikvision</option>
            <option value="Dahua">Dahua</option>
          </select>
        </div>
        <Field label="Azimut (°)" name="azimut" value={form.azimut} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Canal" name="channel" value={form.channel} onChange={handleChange} type="number" placeholder="1" />
        <Field label="Subtipo" name="subtype" value={form.subtype} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Radio (m)" name="radio" value={form.radio} onChange={handleChange} type="number" placeholder="100" />
        <Field label="Apertura (°)" name="apertura" value={form.apertura} onChange={handleChange} type="number" placeholder="90" />
      </FieldRow>
      <div className="flex flex-col gap-1">
        <Label htmlFor="color-ptz" className="text-[11px] text-text-100/60 uppercase tracking-widest">Color</Label>
        <div className="flex items-center gap-2">
          <input id="color-ptz" type="color" name="color" value={form.color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
          <span className="text-xs text-text-100/50">{form.color}</span>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{String((error as Error).message)}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Agregar PTZ"}</Button>
      </div>
    </form>
  );
}

export function AddDeviceModal({ onClose, defaultTab = "nanoradar" }: AddDeviceModalProps) {
  const [activeTab, setActiveTab] = useState<DeviceTab>(defaultTab);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-100">Agregar dispositivo</h2>
          <button
            onClick={onClose}
            className="text-text-200 hover:text-text-100 transition"
            aria-label="Cerrar"
          >
            <IconX size={16} stroke={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === key
                  ? "border-brand-200 text-brand-200"
                  : "border-transparent text-text-100/40 hover:text-text-100/70"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-5 py-4">
          {activeTab === "nanoradar" && <NanoradarForm onClose={onClose} />}
          {activeTab === "spotter" && <SpotterForm onClose={onClose} />}
          {activeTab === "camara" && <CamaraForm onClose={onClose} />}
          {activeTab === "ptz" && <PtzForm onClose={onClose} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
