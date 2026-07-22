import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import type { Magosradares } from "../../types/ConfigServices.type";
import { useUpdateMagosradar } from "../hooks/useUpdateMagosradar";
import type { MagosradarUpdatePayload } from "../service";

interface MagosradarEditModalProps {
  magosradar: Magosradares;
  onClose: () => void;
}

// ─── Helpers ───────────────────────────────────────────────
function n(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}
function nn(v: string): number | null {
  return v === "" ? null : Number(v);
}

// ─── Section header ────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 mt-2 mb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-200/80">
        {children}
      </h3>
      <div className="h-px bg-border/60 mt-1" />
    </div>
  );
}

// ─── Color field with picker ───────────────────────────────
function ColorField({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="col-span-2 flex items-end gap-3">
      <div className="flex-1">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={id === "trackColor-mg" ? "#00e5ff" : "#f43f5e"}
        />
      </div>
      <div
        className="w-10 h-10 rounded-lg border border-border shrink-0 mb-0.5"
        style={{ backgroundColor: value || "transparent" }}
      />
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent shrink-0 mb-0.5"
        title="Seleccionar color"
      />
    </div>
  );
}

// ─── Field row helper ──────────────────────────────────────
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  required,
  note,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name} className="text-xs text-text-100/80">
        {label}
        {note && <span className="text-[10px] text-text-200/60 ml-1">({note})</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
      />
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

// ═══════════════════════════════════════════════════════════
// M A I N   C O M P O N E N T
// ═══════════════════════════════════════════════════════════
export function MagosradarEditModal({ magosradar, onClose }: MagosradarEditModalProps) {
  const { mutate, isPending, isError, error } = useUpdateMagosradar();

  const [form, setForm] = useState<Record<string, string>>(() => ({
    nombre: magosradar.nombre,
    direccionIp: magosradar.direccionIp,
    latitud: magosradar.latitud,
    longitud: magosradar.longitud,
    azimut: magosradar.azimut,
    grado: n(magosradar.grado),
    radio: n(magosradar.radio),
    apertura: n(magosradar.apertura),
    color: magosradar.color ?? "",
    // Tracking
    rcs: n(magosradar.rcs),
    snr: n(magosradar.snr),
    speed: n(magosradar.speed),
    heading: n(magosradar.heading),
    trackColor: magosradar.trackColor ?? "",
    minTrackPoints: n(magosradar.minTrackPoints),
    associationDist: n(magosradar.associationDist),
    ttl: n(magosradar.ttl),
    coastTtl: n(magosradar.coastTtl),
    emaSmooth: n(magosradar.emaSmooth),
    velSmooth: n(magosradar.velSmooth),
    maxDetections: n(magosradar.maxDetections),
    clusterDist: n(magosradar.clusterDist),
    // Metadatos
    enabled: n(magosradar.enabled),
    modelo: magosradar.modelo ?? "",
    frecuencia: n(magosradar.frecuencia),
    potencia: n(magosradar.potencia),
    elevacion: n(magosradar.elevacion),
    altitud: n(magosradar.altitud),
    notas: magosradar.notas ?? "",
  }));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  function buildPayload(): MagosradarUpdatePayload {
    return {
      nombre: form.nombre,
      direccionIp: form.direccionIp,
      latitud: form.latitud,
      longitud: form.longitud,
      azimut: form.azimut,
      grado: Number(form.grado),
      radio: Number(form.radio),
      apertura: Number(form.apertura),
      color: form.color || null,
      // Tracking
      rcs: nn(form.rcs),
      snr: nn(form.snr),
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
      // Metadatos
      enabled: form.enabled === "" ? null : Number(form.enabled),
      modelo: form.modelo || null,
      frecuencia: nn(form.frecuencia),
      potencia: nn(form.potencia),
      elevacion: nn(form.elevacion),
      altitud: nn(form.altitud),
      notas: form.notas || null,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      { id: magosradar.id, payload: buildPayload() },
      { onSuccess: onClose },
    );
  }

  const globalTooltip = "Vacío = usa el valor global del servidor";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-bg-200 z-10">
          <div>
            <h2 className="text-base font-semibold text-text-100">Editar MagosRadar</h2>
            <p className="text-xs text-text-200 mt-0.5">ID: {magosradar.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-200 hover:text-text-100 transition"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {isError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {(error as Error)?.message ?? "Error al guardar los cambios."}
            </div>
          )}

          {/* ════════ SECCIÓN: GENERAL ════════ */}
          <div className="grid grid-cols-2 gap-3">
            <SectionTitle>General</SectionTitle>

            <Field
              label="Nombre" name="nombre" value={form.nombre}
              onChange={handleChange} required
            />
            <Field
              label="Dirección IP" name="direccionIp" value={form.direccionIp}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-1">
              <Label htmlFor="enabled-mg" className="text-xs text-text-100/80">
                Estado
              </Label>
              <select
                id="enabled-mg"
                name="enabled"
                value={form.enabled}
                onChange={handleChange}
                className="h-10 rounded-lg border border-border bg-bg-100 text-text-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Usar valor global —</option>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>

            <Field
              label="Modelo" name="modelo" value={form.modelo}
              onChange={handleChange} placeholder="Magos X7"
            />

            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor="notas-mg" className="text-xs text-text-100/80">Notas</Label>
              <textarea
                id="notas-mg"
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Radar principal sector norte"
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-100 text-text-100 placeholder-text-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* ════════ SECCIÓN: GEOPOSICIONAMIENTO ════════ */}
          <div className="grid grid-cols-2 gap-3">
            <SectionTitle>Geoposicionamiento</SectionTitle>

            <Field label="Latitud" name="latitud" value={form.latitud}
              onChange={handleChange} type="number" step="any" placeholder="-41.4621845" />
            <Field label="Longitud" name="longitud" value={form.longitud}
              onChange={handleChange} type="number" step="any" placeholder="-72.9869786" />
            <Field label="Azimut (°)" name="azimut" value={form.azimut}
              onChange={handleChange} type="number" min={0} max={360} />
            <Field label="Grado (°)" name="grado" value={form.grado}
              onChange={handleChange} type="number" min={0} max={360} />
            <Field label="Radio (m)" name="radio" value={form.radio}
              onChange={handleChange} type="number" min={1} />
            <Field label="Apertura (°)" name="apertura" value={form.apertura}
              onChange={handleChange} type="number" min={1} max={360} />
            <Field label="Elevación (°)" name="elevacion" value={form.elevacion}
              onChange={handleChange} type="number" step="any" placeholder="2.5" note={globalTooltip} />
            <Field label="Altitud (msnm)" name="altitud" value={form.altitud}
              onChange={handleChange} type="number" step="any" placeholder="580" note={globalTooltip} />

            <ColorField
              label="Color del radar" id="color-mg"
              value={form.color}
              onChange={(v) => setForm((p) => ({ ...p, color: v }))}
            />
          </div>

          {/* ════════ SECCIÓN: TRACKING AVANZADO ════════ */}
          <div className="grid grid-cols-2 gap-3">
            <SectionTitle>Tracking avanzado</SectionTitle>
            <p className="col-span-2 text-[11px] text-text-200/60 -mt-1">
              {globalTooltip}
            </p>

            <ColorField
              label="Color de tracks" id="trackColor-mg"
              value={form.trackColor}
              onChange={(v) => setForm((p) => ({ ...p, trackColor: v }))}
            />

            <Field label="SNR mínimo (dB)" name="snr" value={form.snr}
              onChange={handleChange} type="number" step="any" placeholder="25" />
            <Field label="RCS (m²)" name="rcs" value={form.rcs}
              onChange={handleChange} type="number" step="any" placeholder="0.5" />
            <Field label="Velocidad máx (m/s)" name="speed" value={form.speed}
              onChange={handleChange} type="number" step="any" placeholder="55" />
            <Field label="Rumbo de referencia (°)" name="heading" value={form.heading}
              onChange={handleChange} type="number" step="any" placeholder="0" />

            <FieldRow>
              <Field label="Puntos mín. track" name="minTrackPoints" value={form.minTrackPoints}
                onChange={handleChange} type="number" min={1} placeholder="3" />
              <Field label="Dist. asociación (m)" name="associationDist" value={form.associationDist}
                onChange={handleChange} type="number" step="any" placeholder="50" />
            </FieldRow>

            <FieldRow>
              <Field label="TTL track (seg)" name="ttl" value={form.ttl}
                onChange={handleChange} type="number" step="any" placeholder="8" />
              <Field label="TTL coasting (seg)" name="coastTtl" value={form.coastTtl}
                onChange={handleChange} type="number" step="any" placeholder="3" />
            </FieldRow>

            <FieldRow>
              <Field label="Suavizado posición" name="emaSmooth" value={form.emaSmooth}
                onChange={handleChange} type="number" step="0.01" min={0} max={1} placeholder="0.30" />
              <Field label="Suavizado velocidad" name="velSmooth" value={form.velSmooth}
                onChange={handleChange} type="number" step="0.01" min={0} max={1} placeholder="0.20" />
            </FieldRow>

            <FieldRow>
              <Field label="Máx detecciones" name="maxDetections" value={form.maxDetections}
                onChange={handleChange} type="number" min={1} placeholder="40" />
              <Field label="Dist. clustering (m)" name="clusterDist" value={form.clusterDist}
                onChange={handleChange} type="number" step="any" placeholder="8" />
            </FieldRow>
          </div>

          {/* ════════ SECCIÓN: RF ════════ */}
          <div className="grid grid-cols-2 gap-3">
            <SectionTitle>RF &mdash; Especificaciones técnicas</SectionTitle>

            <FieldRow>
              <Field label="Frecuencia (GHz)" name="frecuencia" value={form.frecuencia}
                onChange={handleChange} type="number" step="any" placeholder="77" />
              <Field label="Potencia (dBm)" name="potencia" value={form.potencia}
                onChange={handleChange} type="number" step="any" placeholder="20" />
            </FieldRow>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="solid" isLoading={isPending} loadingText="Guardando...">
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
