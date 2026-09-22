/**
 * Formulario simplificado para configuración de MagosRadar.
 * El tracking usa constantes fijas del backend; aquí solo se configuran
 * identificación, geoposicionamiento, operación y visualización.
 */
import { useState } from "react";
import { IconFilterOff, IconFilter } from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface SimpleMagosradarFormData {
  // Base
  nombre: string;
  direccionIp: string;
  latitud: string;
  longitud: string;
  azimut: string;
  grado: number;
  radio: number;
  apertura: number;
  color: string;

  // Visualización / operación
  trackColor?: string | null;
  enabled?: number | null;

  // Metadatos
  modelo?: string | null;
  frecuencia?: number | null;
  potencia?: number | null;
  elevacion?: number | null;
  altitud?: number | null;
  notas?: string | null;

  // Toggle "sin filtro" (ver tracks crudos)
  sinFiltro?: number | null;

  // Modo espejo (orientación)
  espejoX?: number | null;
  espejoY?: number | null;
}

// ── Utilidades ─────────────────────────────────────────────────────────────

function n(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}

function InfoIcon({ text }: { text: string }) {
  return (
    <Tooltip text={text} side="top">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-text-100/10 text-text-100/40 text-[8px] font-bold cursor-help hover:bg-brand-200/20 hover:text-brand-200/70 transition-colors shrink-0 ml-1">
        ?
      </span>
    </Tooltip>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
  info,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  step?: string | number;
  info?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label
        htmlFor={name}
        className="text-[11px] text-text-100/60 uppercase tracking-widest"
      >
        {label}
        {info && <InfoIcon text={info} />}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className="h-8 text-sm"
      />
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

// ── Componente principal ───────────────────────────────────────────────────

interface MagosradarSimpleFormProps {
  /** Datos iniciales (para edición) */
  initialData?: Partial<SimpleMagosradarFormData>;
  /** Callback al enviar */
  onSubmit: (data: SimpleMagosradarFormData) => Promise<void> | void;
  /** Callback al cancelar */
  onCancel: () => void;
  /** Si está en estado de carga */
  isLoading?: boolean;
  /** Error del servidor */
  error?: string;
  /** Etiqueta del botón submit */
  submitLabel?: string;
}

export function MagosradarSimpleForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  submitLabel = "Guardar",
}: MagosradarSimpleFormProps) {
  const [form, setForm] = useState<SimpleMagosradarFormData>({
    nombre: initialData?.nombre ?? "",
    direccionIp: initialData?.direccionIp ?? "",
    latitud: initialData?.latitud ?? "",
    longitud: initialData?.longitud ?? "",
    azimut: initialData?.azimut ?? "0",
    grado: initialData?.grado ?? 0,
    radio: initialData?.radio ?? 100,
    apertura: initialData?.apertura ?? 360,
    color: initialData?.color ?? "#f43f5e",
    trackColor: initialData?.trackColor ?? null,
    enabled: initialData?.enabled ?? 1,
    modelo: initialData?.modelo ?? null,
    frecuencia: initialData?.frecuencia ?? null,
    potencia: initialData?.potencia ?? null,
    elevacion: initialData?.elevacion ?? null,
    altitud: initialData?.altitud ?? null,
    notas: initialData?.notas ?? null,
    sinFiltro: initialData?.sinFiltro ?? 0,
    espejoX: initialData?.espejoX ?? 0,
    espejoY: initialData?.espejoY ?? 0,
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      grado: Number(form.grado),
      radio: Number(form.radio),
      apertura: Number(form.apertura),
      azimut: String(form.azimut),
      sinFiltro: form.sinFiltro ? 1 : 0,
      espejoX: form.espejoX ? 1 : 0,
      espejoY: form.espejoY ? 1 : 0,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1"
    >
      {/* ═══ TOGGLE: VER TRACKS SIN FILTROS ═══ */}
      <div
        className={`rounded-lg p-3 border transition-colors ${form.sinFiltro ? "bg-rose-500/10 border-rose-500/40" : "bg-bg-200/30 border-border/40"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {form.sinFiltro ? (
              <IconFilterOff size={16} className="text-rose-400" />
            ) : (
              <IconFilter size={16} className="text-text-100/60" />
            )}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-text-100/80">
                Ver tracks sin filtros
              </Label>
              <p className="text-[10px] text-text-200/60 italic">
                Muestra las detecciones crudas post-procesadas (sin SNR, RCS,
                clustering ni tracking)
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={!!form.sinFiltro}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                sinFiltro: prev.sinFiltro ? 0 : 1,
              }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              form.sinFiltro ? "bg-rose-500" : "bg-bg-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                form.sinFiltro ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ═══ ORIENTACIÓN (MODO ESPEJO) ═══ */}
      <div className="bg-bg-200/30 rounded-lg p-3 border border-border/40">
        <div className="flex items-center gap-2 mb-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-text-100/80">
            Modo espejo
          </Label>
        </div>
        <p className="text-[10px] text-text-200/60 italic mb-2">
          Invierte los ejes de las detecciones para alinear los tracks con la
          realidad.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 border border-border/40 bg-bg-100/40">
            <div>
              <span className="text-[10px] font-semibold text-text-100/80">
                Eje X
              </span>
              <p className="text-[8px] text-text-200/60 italic">
                Lateral (izq./der.)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.espejoX}
              onClick={() =>
                setForm((prev) => ({ ...prev, espejoX: prev.espejoX ? 0 : 1 }))
              }
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.espejoX ? "bg-brand-200" : "bg-bg-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.espejoX ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 border border-border/40 bg-bg-100/40">
            <div>
              <span className="text-[10px] font-semibold text-text-100/80">
                Eje Y
              </span>
              <p className="text-[8px] text-text-200/60 italic">
                Boresight (adel./atrás)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.espejoY}
              onClick={() =>
                setForm((prev) => ({ ...prev, espejoY: prev.espejoY ? 0 : 1 }))
              }
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.espejoY ? "bg-brand-200" : "bg-bg-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.espejoY ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ GENERAL ═══ */}
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 -mb-1 mt-1">
        General
      </h4>
      <FieldRow>
        <Field
          label="Nombre"
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="MagosRadar-01"
        />
        <Field
          label="Dirección IP"
          name="direccionIp"
          value={form.direccionIp}
          onChange={handleChange}
          placeholder="192.168.1.200"
        />
      </FieldRow>
      <FieldRow>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Label className="text-[11px] text-text-100/60 uppercase tracking-widest">
              Estado
            </Label>
            <InfoIcon text="Activa/desactiva el radar." />
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((p) => ({ ...p, enabled: p.enabled === 1 ? 0 : 1 }))
            }
            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
              form.enabled === 1 ? "bg-emerald-500" : "bg-bg-400"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.enabled === 1 ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <Field
          label="Modelo"
          name="modelo"
          value={form.modelo ?? ""}
          onChange={handleChange}
          placeholder="MG 1000"
        />
      </FieldRow>
      <FieldRow>
        <Field
          label="Color de tracks"
          name="trackColor"
          value={form.trackColor ?? ""}
          onChange={handleChange}
          placeholder="#00e5ff"
          info="Color único para los tracks de este radar. Vacío = paleta automática."
        />
        <Field
          label="Notas"
          name="notas"
          value={form.notas ?? ""}
          onChange={handleChange}
          placeholder="Radar principal"
        />
      </FieldRow>

      {/* ═══ GEOPOSICIONAMIENTO ═══ */}
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 -mb-1 mt-1">
        Geoposicionamiento
      </h4>
      <FieldRow>
        <Field
          label="Latitud"
          name="latitud"
          value={form.latitud}
          onChange={handleChange}
          placeholder="-33.4489"
        />
        <Field
          label="Longitud"
          name="longitud"
          value={form.longitud}
          onChange={handleChange}
          placeholder="-70.6693"
        />
      </FieldRow>
      <FieldRow>
        <Field
          label="Azimut (°)"
          name="azimut"
          value={form.azimut}
          onChange={handleChange}
          type="number"
          placeholder="0"
        />
        <Field
          label="Grado (°)"
          name="grado"
          value={n(form.grado)}
          onChange={handleChange}
          type="number"
          placeholder="0"
        />
      </FieldRow>
      <FieldRow>
        <Field
          label="Radio (m)"
          name="radio"
          value={n(form.radio)}
          onChange={handleChange}
          type="number"
          placeholder="100"
        />
        <Field
          label="Apertura (°)"
          name="apertura"
          value={n(form.apertura)}
          onChange={handleChange}
          type="number"
          placeholder="360"
        />
      </FieldRow>

      {/* ═══ RF ═══ */}
      {/* <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 -mb-1 mt-1">RF</h4>
      <FieldRow>
        <Field label="Frecuencia (GHz)" name="frecuencia" value={n(form.frecuencia)} onChange={handleChange} type="number" step="any" placeholder="77" />
        <Field label="Potencia (dBm)" name="potencia" value={n(form.potencia)} onChange={handleChange} type="number" step="any" placeholder="20" />
      </FieldRow>
      <FieldRow>
        <Field label="Elevación (°)" name="elevacion" value={n(form.elevacion)} onChange={handleChange} type="number" step="any" placeholder="2.5" />
        <Field label="Altitud (msnm)" name="altitud" value={n(form.altitud)} onChange={handleChange} type="number" step="any" placeholder="580" />
      </FieldRow> */}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
