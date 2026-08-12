/**
 * Formulario simplificado para configuración de MagosRadar.
 *
 * Reduce 17 parámetros a 3 controles intuitivos:
 *   1. Modo de operación (preset)
 *   2. Sensibilidad (1-5)
 *   3. Persistencia (1-5)
 *
 * Incluye toggle "Avanzado" que muestra todos los parámetros.
 */
import { useState, useEffect, useCallback } from "react";
import { IconShield, IconEye, IconClock, IconSettings, IconFilterOff, IconFilter, IconStack } from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui";
import { apiSystem } from "@/apis";
import { useMagosradarProfiles } from "../config/magosradarProfiles";
import type { MagosradarProfileValues } from "../config/magosradarProfiles";

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

  // Macro-parámetros
  modo_operacion: string;
  sensibilidad: number;
  persistencia: number;

  // Toggle "sin filtro" (ver tracks crudos post-procesados)
  sinFiltro?: number | null;

  // Cola/buffer de tracks
  bufferActivo?: number | null;
  bufferIntervalo?: number | null;

  // Avanzados (solo si modo = "personalizado" y toggle activado)
  rcs?: number | null;
  snr?: number | null;
  speed?: number | null;
  maxSpeed?: number | null;
  heading?: number | null;
  trackColor?: string | null;
  minTrackPoints?: number | null;
  associationDist?: number | null;
  ttl?: number | null;
  coastTtl?: number | null;
  stationaryTtl?: number | null;
  emaSmooth?: number | null;
  velSmooth?: number | null;
  maxDetections?: number | null;
  clusterDist?: number | null;
  minConfidence?: number | null;
  confidenceWindow?: number | null;

  // Metadatos
  enabled?: number | null;
  modelo?: string | null;
  frecuencia?: number | null;
  potencia?: number | null;
  elevacion?: number | null;
  altitud?: number | null;
  notas?: string | null;
}

interface ModoInfo {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
}

// ── Modos disponibles ──────────────────────────────────────────────────────

const MODOS_DEFAULT: ModoInfo[] = [
  { id: "urbano", nombre: "🏙️ Urbano", descripcion: "Calles, peatones, tráfico lento", icono: "building" },
  { id: "carretera", nombre: "🛣️ Carretera", descripcion: "Vehículos rápidos, autopistas", icono: "road" },
  { id: "industrial", nombre: "🏭 Industrial", descripcion: "Maquinaria pesada, movimiento lento", icono: "factory" },
  { id: "maritimo", nombre: "⚓ Marítimo", descripcion: "Barcos, costa, puertos", icono: "anchor" },
  { id: "personalizado", nombre: "🔧 Personalizado", descripcion: "Configuración manual avanzada", icono: "settings" },
];

const SENSIBILIDAD_LABELS: Record<number, string> = {
  1: "Muy baja — Solo objetos grandes y claros, cero falsos",
  2: "Baja — Pocos falsos, puede perder blancos débiles",
  3: "Media — Balance recomendado",
  4: "Alta — Detecta más, algunos falsos",
  5: "Muy alta — Detecta todo, más falsos positivos",
};

const PERSISTENCIA_LABELS: Record<number, string> = {
  1: "Efímera — Tracks desaparecen rápido, mapa limpio",
  2: "Corta — Tracks se mantienen poco tiempo",
  3: "Normal — Balance recomendado",
  4: "Larga — Tracks persisten bastante",
  5: "Muy larga — Seguimiento continuo, ideal para barcos",
};

// ── Utilidades ─────────────────────────────────────────────────────────────

function n(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}

function nn(v: string): number | null {
  return v === "" ? null : Number(v);
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
  min,
  max,
  info,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  step?: string | number;
  min?: number;
  max?: number;
  info?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name} className="text-[11px] text-text-100/60 uppercase tracking-widest">
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
        min={min}
        max={max}
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
    modo_operacion: initialData?.modo_operacion ?? "personalizado",
    sensibilidad: initialData?.sensibilidad ?? 3,
    persistencia: initialData?.persistencia ?? 3,
    sinFiltro: initialData?.sinFiltro ?? 0,
    bufferActivo: initialData?.bufferActivo ?? 1,
    bufferIntervalo: initialData?.bufferIntervalo ?? 3,
    // Avanzados
    rcs: initialData?.rcs ?? null,
    snr: initialData?.snr ?? null,
    speed: initialData?.speed ?? null,
    maxSpeed: initialData?.maxSpeed ?? null,
    heading: initialData?.heading ?? null,
    trackColor: initialData?.trackColor ?? null,
    minTrackPoints: initialData?.minTrackPoints ?? null,
    associationDist: initialData?.associationDist ?? null,
    ttl: initialData?.ttl ?? null,
    coastTtl: initialData?.coastTtl ?? null,
    stationaryTtl: initialData?.stationaryTtl ?? null,
    emaSmooth: initialData?.emaSmooth ?? null,
    velSmooth: initialData?.velSmooth ?? null,
    maxDetections: initialData?.maxDetections ?? null,
    clusterDist: initialData?.clusterDist ?? null,
    minConfidence: initialData?.minConfidence ?? null,
    confidenceWindow: initialData?.confidenceWindow ?? null,
    // Metadatos
    enabled: initialData?.enabled ?? 1,
    modelo: initialData?.modelo ?? null,
    frecuencia: initialData?.frecuencia ?? null,
    potencia: initialData?.potencia ?? null,
    elevacion: initialData?.elevacion ?? null,
    altitud: initialData?.altitud ?? null,
    notas: initialData?.notas ?? null,
  });

  const [showAdvanced, setShowAdvanced] = useState(
    form.modo_operacion === "personalizado"
  );
  const [modos, setModos] = useState<ModoInfo[]>(MODOS_DEFAULT);
  const [previewParams, setPreviewParams] = useState<Record<string, number> | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("custom");

  // ── Cargar perfiles desde BD ──
  const { profiles: MAGOSRADAR_PROFILES } = useMagosradarProfiles();

  // Cargar modos desde API
  useEffect(() => {
    apiSystem
      .get<{ data: ModoInfo[] }>("/magosradares/modos")
      .then((res) => {
        if (res.data?.data?.length) setModos(res.data.data);
      })
      .catch(() => {}); // fallback a defaults
  }, []);

  // Auto-avanzado cuando se selecciona "personalizado"
  useEffect(() => {
    if (form.modo_operacion === "personalizado") {
      setShowAdvanced(true);
    }
  }, [form.modo_operacion]);

  // Previsualizar parámetros traducidos
  const fetchPreview = useCallback(async () => {
    if (form.modo_operacion === "personalizado") {
      setPreviewParams(null);
      return;
    }
    try {
      const res = await apiSystem.post<{
        data: { parametros: Record<string, number> };
      }>("/magosradares/translate-params", {
        modo_operacion: form.modo_operacion,
        sensibilidad: form.sensibilidad,
        persistencia: form.persistencia,
      });
      setPreviewParams(res.data?.data?.parametros ?? null);
    } catch {
      setPreviewParams(null);
    }
  }, [form.modo_operacion, form.sensibilidad, form.persistencia]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const num = value === "" ? null : Number(value);
    setForm((prev) => ({ ...prev, [name]: num }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: SimpleMagosradarFormData = {
      ...form,
      grado: Number(form.grado),
      radio: Number(form.radio),
      apertura: Number(form.apertura),
      azimut: String(form.azimut),
      sensibilidad: Number(form.sensibilidad),
      persistencia: Number(form.persistencia),
      sinFiltro: form.sinFiltro ? 1 : 0,
      bufferActivo: form.bufferActivo ? 1 : 0,
      bufferIntervalo: Number(form.bufferIntervalo) || 3,
    };

    // Si no es personalizado, no enviar params avanzados
    if (form.modo_operacion !== "personalizado") {
      data.rcs = null;
      data.snr = null;
      data.speed = null;
      data.maxSpeed = null;
      data.minTrackPoints = null;
      data.associationDist = null;
      data.ttl = null;
      data.coastTtl = null;
      data.stationaryTtl = null;
      data.emaSmooth = null;
      data.velSmooth = null;
      data.maxDetections = null;
      data.clusterDist = null;
      data.minConfidence = null;
      data.confidenceWindow = null;
    }
    onSubmit(data);
  }

  const isAdvanced = form.modo_operacion === "personalizado";

  // ── Aplicar perfil desde BD ──
  function handleProfileChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const profileId = e.target.value;
    setSelectedProfileId(profileId);
    if (profileId === "custom") return;
    const profile = MAGOSRADAR_PROFILES.find((p) => p.id === profileId);
    if (!profile) return;

    // Aplicar macro-parámetros del perfil
    setForm((prev) => ({
      ...prev,
      modo_operacion: profile.values.modo_operacion ?? "personalizado",
      sensibilidad: profile.values.sensibilidad ?? 3,
      persistencia: profile.values.persistencia ?? 3,
      // También aplicar avanzados si existen en el perfil
      grado: profile.values.grado ?? prev.grado,
      radio: profile.values.radio ?? prev.radio,
      apertura: profile.values.apertura ?? prev.apertura,
      color: profile.values.color ?? prev.color,
      rcs: profile.values.rcs ?? prev.rcs,
      snr: profile.values.snr ?? prev.snr,
      speed: profile.values.speed ?? prev.speed,
      maxSpeed: profile.values.maxSpeed ?? prev.maxSpeed,
      heading: profile.values.heading ?? prev.heading,
      trackColor: profile.values.trackColor ?? prev.trackColor,
      minTrackPoints: profile.values.minTrackPoints ?? prev.minTrackPoints,
      associationDist: profile.values.associationDist ?? prev.associationDist,
      ttl: profile.values.ttl ?? prev.ttl,
      coastTtl: profile.values.coastTtl ?? prev.coastTtl,
      stationaryTtl: profile.values.stationaryTtl ?? prev.stationaryTtl,
      emaSmooth: profile.values.emaSmooth ?? prev.emaSmooth,
      velSmooth: profile.values.velSmooth ?? prev.velSmooth,
      maxDetections: profile.values.maxDetections ?? prev.maxDetections,
      clusterDist: profile.values.clusterDist ?? prev.clusterDist,
      minConfidence: profile.values.minConfidence ?? prev.minConfidence,
      confidenceWindow: profile.values.confidenceWindow ?? prev.confidenceWindow,
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
      {/* ═══ PERFIL DE CONFIGURACIÓN (desde BD) ═══ */}
      <div className="flex flex-col gap-1.5 pb-3 border-b border-border/50">
        <Label htmlFor="profile-mg" className="text-[11px] text-brand-200/80 uppercase tracking-widest font-semibold">
          Perfil de configuración
        </Label>
        <select
          id="profile-mg"
          value={selectedProfileId}
          onChange={handleProfileChange}
          className="w-full rounded-lg border border-border bg-bg-100 text-text-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition"
        >
          <option value="custom">🔧 Personalizado — Sin perfil</option>
          {MAGOSRADAR_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.description}
            </option>
          ))}
        </select>
        {selectedProfileId !== "custom" && (
          <p className="text-[10px] text-brand-200/60 italic">
            Perfil aplicado. Los controles de abajo reflejan sus valores. Puedes ajustarlos.
          </p>
        )}
      </div>

      {/* ═══ MODO DE OPERACIÓN ═══ */}
      <div className="bg-bg-200/30 rounded-lg p-3 border border-brand-200/20">
        <div className="flex items-center gap-2 mb-2">
          <IconShield size={16} className="text-brand-200/70" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-brand-200/80">
            Modo de Operación
          </Label>
        </div>
        <select
          name="modo_operacion"
          value={form.modo_operacion}
          onChange={handleChange}
          className="w-full rounded-lg border border-border bg-bg-100 text-text-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition"
        >
          {modos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-text-200/60 mt-1 italic">
          {modos.find((m) => m.id === form.modo_operacion)?.descripcion ??
            "Selecciona el escenario que mejor describe tu entorno"}
        </p>
      </div>

      {/* ═══ SENSIBILIDAD ═══ */}
      <div className="bg-bg-200/30 rounded-lg p-3 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <IconEye size={16} className="text-amber-400/70" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">
            Sensibilidad: {form.sensibilidad}/5
          </Label>
        </div>
        <input
          type="range"
          name="sensibilidad"
          min={1}
          max={5}
          value={form.sensibilidad}
          onChange={handleChange}
          className="w-full h-2 bg-bg-300 rounded-lg appearance-none cursor-pointer accent-amber-400"
          disabled={isAdvanced}
        />
        <div className="flex justify-between text-[9px] text-text-200/50 mt-0.5">
          <span>1 — Baja</span>
          <span>3 — Media</span>
          <span>5 — Alta</span>
        </div>
        <p className="text-[10px] text-amber-300/60 mt-1 italic">
          {SENSIBILIDAD_LABELS[form.sensibilidad] ?? ""}
        </p>
      </div>

      {/* ═══ PERSISTENCIA ═══ */}
      <div className="bg-bg-200/30 rounded-lg p-3 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-2">
          <IconClock size={16} className="text-cyan-400/70" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-cyan-400/80">
            Persistencia: {form.persistencia}/5
          </Label>
        </div>
        <input
          type="range"
          name="persistencia"
          min={1}
          max={5}
          value={form.persistencia}
          onChange={handleChange}
          className="w-full h-2 bg-bg-300 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          disabled={isAdvanced}
        />
        <div className="flex justify-between text-[9px] text-text-200/50 mt-0.5">
          <span>1 — Efímero</span>
          <span>3 — Normal</span>
          <span>5 — Persistente</span>
        </div>
        <p className="text-[10px] text-cyan-300/60 mt-1 italic">
          {PERSISTENCIA_LABELS[form.persistencia] ?? ""}
        </p>
      </div>

      {/* ═══ TOGGLE: VER TRACKS SIN FILTROS ═══ */}
      <div className={`rounded-lg p-3 border transition-colors ${form.sinFiltro ? "bg-rose-500/10 border-rose-500/40" : "bg-bg-200/30 border-border/40"}`}>
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
                Muestra las detecciones crudas post-procesadas (sin SNR, RCS, clustering ni tracking)
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={!!form.sinFiltro}
            onClick={() => setForm((prev) => ({ ...prev, sinFiltro: prev.sinFiltro ? 0 : 1 }))}
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

      {/* ═══ TOGGLE: COLA DE TRACKS (BUFFER) ═══ */}
      <div className={`rounded-lg p-3 border transition-colors ${form.bufferActivo ? "bg-emerald-500/10 border-emerald-500/30" : "bg-bg-200/30 border-border/40"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconStack size={16} className={form.bufferActivo ? "text-emerald-400" : "text-text-100/60"} />
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-text-100/80">
                Cola de tracks (buffer)
              </Label>
              <p className="text-[10px] text-text-200/60 italic">
                Agrupa los tracks en el backend y los envía en bloques cada cierto tiempo
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={!!form.bufferActivo}
            onClick={() => setForm((prev) => ({ ...prev, bufferActivo: prev.bufferActivo ? 0 : 1 }))}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              form.bufferActivo ? "bg-emerald-500" : "bg-bg-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                form.bufferActivo ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Tiempo de la cola */}
        {form.bufferActivo ? (
          <div className="mt-2 flex items-center gap-2">
            <Label htmlFor="bufferIntervalo" className="text-[10px] text-text-100/70 shrink-0">
              Tiempo de cola (s):
            </Label>
            <input
              id="bufferIntervalo"
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              value={form.bufferIntervalo ?? 3}
              onChange={(e) => setForm((prev) => ({ ...prev, bufferIntervalo: Number(e.target.value) || 3 }))}
              className="w-20 rounded-md border border-border bg-bg-100 text-text-100 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition"
            />
            <span className="text-[10px] text-text-200/60 italic">segundos antes de enviar</span>
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-text-200/60 italic">
            Cola desactivada: los tracks se envían inmediatamente, sin agrupar.
          </p>
        )}
      </div>

      {/* ═══ PREVISUALIZACIÓN DE PARÁMETROS (no personalizado) ═══ */}
      {!isAdvanced && previewParams && (
        <div className="bg-bg-200/20 rounded-lg p-2 border border-border/30">
          <p className="text-[10px] text-text-200/50 uppercase tracking-wider mb-1">
            Parámetros resultantes:
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px] text-text-200/70">
            <span>SNR: {previewParams.snr} dB</span>
            <span>RCS: {previewParams.rcs} m²</span>
            <span>TTL: {previewParams.ttl}s</span>
            <span>Conf: {previewParams.minConfidence}%</span>
            <span>Vel máx: {previewParams.maxSpeed} m/s</span>
            <span>Pts: {previewParams.minTrackPoints}</span>
          </div>
        </div>
      )}

      {/* ═══ GENERAL ═══ */}
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 -mb-1 mt-1">General</h4>
      <FieldRow>
        <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="MagosRadar-01" />
        <Field label="Dirección IP" name="direccionIp" value={form.direccionIp} onChange={handleChange} placeholder="192.168.1.200" />
      </FieldRow>
      <FieldRow>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Label className="text-[11px] text-text-100/60 uppercase tracking-widest">Estado</Label>
            <InfoIcon text="Activa/desactiva el radar." />
          </div>
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, enabled: p.enabled === 1 ? 0 : 1 }))}
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
        <Field label="Modelo" name="modelo" value={form.modelo ?? ""} onChange={handleChange} placeholder="Magos X7" />
      </FieldRow>

      {/* ═══ GEOPOSICIONAMIENTO ═══ */}
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 -mb-1 mt-1">Geoposicionamiento</h4>
      <FieldRow>
        <Field label="Latitud" name="latitud" value={form.latitud} onChange={handleChange} placeholder="-33.4489" />
        <Field label="Longitud" name="longitud" value={form.longitud} onChange={handleChange} placeholder="-70.6693" />
      </FieldRow>
      <FieldRow>
        <Field label="Azimut (°)" name="azimut" value={form.azimut} onChange={handleChange} type="number" placeholder="0" />
        <Field label="Grado (°)" name="grado" value={n(form.grado)} onChange={handleChange} type="number" placeholder="0" />
      </FieldRow>
      <FieldRow>
        <Field label="Radio (m)" name="radio" value={n(form.radio)} onChange={handleChange} type="number" placeholder="100" />
        <Field label="Apertura (°)" name="apertura" value={n(form.apertura)} onChange={handleChange} type="number" placeholder="360" />
      </FieldRow>

      {/* ═══ TOGGLE AVANZADO ═══ */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-[11px] text-text-200/60 hover:text-brand-200/80 transition-colors"
        >
          <IconSettings size={14} />
          {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
        </button>
      </div>

      {/* ═══ OPCIONES AVANZADAS ═══ */}
      {showAdvanced && (
        <>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/70 -mb-1">
            Tracking avanzado
          </h4>
          <FieldRow>
            <Field label="SNR (dB)" name="snr" value={n(form.snr)} onChange={handleChange} type="number" step="any" placeholder="25"
              info="Umbral mínimo de calidad de señal." />
            <Field label="RCS (m²)" name="rcs" value={n(form.rcs)} onChange={handleChange} type="number" step="any" placeholder="0.5"
              info="Tamaño estimado del blanco radar." />
          </FieldRow>
          <FieldRow>
            <Field label="Vel. máx (m/s)" name="maxSpeed" value={n(form.maxSpeed)} onChange={handleChange} type="number" step="any" placeholder="55"
              info="Velocidad máxima esperada en el escenario." />
            <Field label="Vel. coast (m/s)" name="speed" value={n(form.speed)} onChange={handleChange} type="number" step="any" placeholder="55"
              info="Velocidad máxima para coasting." />
          </FieldRow>
          <FieldRow>
            <Field label="Puntos mín." name="minTrackPoints" value={n(form.minTrackPoints)} onChange={handleChange} type="number" min={1} placeholder="3"
              info="Detecciones para confirmar un track." />
            <Field label="Dist. asoc. (m)" name="associationDist" value={n(form.associationDist)} onChange={handleChange} type="number" step="any" placeholder="50"
              info="Distancia máxima de asociación." />
          </FieldRow>
          <FieldRow>
            <Field label="TTL (seg)" name="ttl" value={n(form.ttl)} onChange={handleChange} type="number" step="any" placeholder="8"
              info="Segundos sin detección antes de eliminar track." />
            <Field label="Coast TTL (seg)" name="coastTtl" value={n(form.coastTtl)} onChange={handleChange} type="number" step="any" placeholder="3"
              info="Tiempo de predicción por inercia." />
          </FieldRow>
          <FieldRow>
            <Field label="Stat. TTL (seg)" name="stationaryTtl" value={n(form.stationaryTtl)} onChange={handleChange} type="number" step="any" placeholder="45"
              info="TTL extendido para objetos detenidos." />
            <Field label="Mín. confianza" name="minConfidence" value={n(form.minConfidence)} onChange={handleChange} type="number" step="any" placeholder="20"
              info="Confianza mínima para mostrar track." />
          </FieldRow>
          <FieldRow>
            <Field label="Suav. posición" name="emaSmooth" value={n(form.emaSmooth)} onChange={handleChange} type="number" step="0.01" placeholder="0.30"
              info="Factor EMA para posición." />
            <Field label="Suav. velocidad" name="velSmooth" value={n(form.velSmooth)} onChange={handleChange} type="number" step="0.01" placeholder="0.20"
              info="Factor EMA para velocidad." />
          </FieldRow>
          <FieldRow>
            <Field label="Máx. detecciones" name="maxDetections" value={n(form.maxDetections)} onChange={handleChange} type="number" min={1} placeholder="40"
              info="Máximo de detecciones por mensaje." />
            <Field label="Cluster dist. (m)" name="clusterDist" value={n(form.clusterDist)} onChange={handleChange} type="number" step="any" placeholder="8"
              info="Distancia para agrupar detecciones." />
          </FieldRow>
          <FieldRow>
            <Field label="Ventana conf." name="confidenceWindow" value={n(form.confidenceWindow)} onChange={handleChange} type="number" min={1} placeholder="10"
              info="Puntos recientes para evaluar confianza." />
            <Field label="Heading ref. (°)" name="heading" value={n(form.heading)} onChange={handleChange} type="number" step="any" placeholder="0"
              info="Rumbo de referencia." />
          </FieldRow>

          {/* RF */}
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 -mb-1 mt-1">RF</h4>
          <FieldRow>
            <Field label="Frecuencia (GHz)" name="frecuencia" value={n(form.frecuencia)} onChange={handleChange} type="number" step="any" placeholder="77" />
            <Field label="Potencia (dBm)" name="potencia" value={n(form.potencia)} onChange={handleChange} type="number" step="any" placeholder="20" />
          </FieldRow>
          <FieldRow>
            <Field label="Elevación (°)" name="elevacion" value={n(form.elevacion)} onChange={handleChange} type="number" step="any" placeholder="2.5" />
            <Field label="Altitud (msnm)" name="altitud" value={n(form.altitud)} onChange={handleChange} type="number" step="any" placeholder="580" />
          </FieldRow>
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
