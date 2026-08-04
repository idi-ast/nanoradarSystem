import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui";
import type { Magosradares } from "../../types/ConfigServices.type";
import { useUpdateMagosradar } from "../hooks/useUpdateMagosradar";
import type { MagosradarPayload } from "../service";
import { useMagosradarProfiles, findProfileById } from "../config/magosradarProfiles";
import type { MagosradarProfileValues } from "../config/magosradarProfiles";
import { useToast } from "@/libs/sonner";

interface MagosradarEditModalProps {
  magosradar: Magosradares;
  onClose: () => void;
}

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
  info,
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
  info?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name} className="text-xs text-text-100/80">
        {label}
        {info && <InfoIcon text={info} />}
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

export function MagosradarEditModal({ magosradar, onClose }: MagosradarEditModalProps) {
  const { mutate, isPending, isError, error } = useUpdateMagosradar();
  const { success } = useToast();
  const { profiles: MAGOSRADAR_PROFILES } = useMagosradarProfiles();

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
    maxSpeed: n(magosradar.maxSpeed),
    stationaryTtl: n(magosradar.stationaryTtl),
    minConfidence: n(magosradar.minConfidence),
    confidenceWindow: n(magosradar.confidenceWindow),
  }));

  const [selectedProfileId, setSelectedProfileId] = useState("custom");

  function applyProfile(values: MagosradarProfileValues) {
    setForm((prev) => ({
      ...prev,
      grado: String(values.grado),
      radio: String(values.radio),
      apertura: String(values.apertura),
      color: values.color,
      rcs: values.rcs != null ? String(values.rcs) : "",
      snr: values.snr != null ? String(values.snr) : "",
      speed: values.speed != null ? String(values.speed) : "",
      heading: values.heading != null ? String(values.heading) : "",
      trackColor: values.trackColor ?? "",
      minTrackPoints: values.minTrackPoints != null ? String(values.minTrackPoints) : "",
      associationDist: values.associationDist != null ? String(values.associationDist) : "",
      ttl: values.ttl != null ? String(values.ttl) : "",
      coastTtl: values.coastTtl != null ? String(values.coastTtl) : "",
      emaSmooth: values.emaSmooth != null ? String(values.emaSmooth) : "",
      velSmooth: values.velSmooth != null ? String(values.velSmooth) : "",
      maxDetections: values.maxDetections != null ? String(values.maxDetections) : "",
      clusterDist: values.clusterDist != null ? String(values.clusterDist) : "",
      frecuencia: values.frecuencia != null ? String(values.frecuencia) : "",
      potencia: values.potencia != null ? String(values.potencia) : "",
      elevacion: values.elevacion != null ? String(values.elevacion) : "",
      altitud: values.altitud != null ? String(values.altitud) : "",
      maxSpeed: values.maxSpeed != null ? String(values.maxSpeed) : "",
      stationaryTtl: values.stationaryTtl != null ? String(values.stationaryTtl) : "",
      minConfidence: values.minConfidence != null ? String(values.minConfidence) : "",
      confidenceWindow: values.confidenceWindow != null ? String(values.confidenceWindow) : "",
    }));
  }

  function buildProfilePayload(values: MagosradarProfileValues): Partial<MagosradarPayload> {
    return {
      grado: values.grado,
      radio: values.radio,
      apertura: values.apertura,
      color: values.color || null,
      rcs: values.rcs ?? null,
      snr: values.snr ?? null,
      speed: values.speed ?? null,
      heading: values.heading ?? null,
      trackColor: values.trackColor ?? null,
      minTrackPoints: values.minTrackPoints ?? null,
      associationDist: values.associationDist ?? null,
      ttl: values.ttl ?? null,
      coastTtl: values.coastTtl ?? null,
      emaSmooth: values.emaSmooth ?? null,
      velSmooth: values.velSmooth ?? null,
      maxDetections: values.maxDetections ?? null,
      clusterDist: values.clusterDist ?? null,
      frecuencia: values.frecuencia ?? null,
      potencia: values.potencia ?? null,
      elevacion: values.elevacion ?? null,
      altitud: values.altitud ?? null,
      maxSpeed: values.maxSpeed ?? null,
      stationaryTtl: values.stationaryTtl ?? null,
      minConfidence: values.minConfidence ?? null,
      confidenceWindow: values.confidenceWindow ?? null,
    };
  }

  function handleProfileChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const profileId = e.target.value;
    setSelectedProfileId(profileId);
    if (profileId === "custom") return;
    const profile = findProfileById(MAGOSRADAR_PROFILES, profileId);
    if (!profile) return;
    applyProfile(profile.values);
    // Guardar el perfil directamente en la BD
    mutate(
      { id: magosradar.id, payload: buildProfilePayload(profile.values) },
      {
        onSuccess: () => {
          setSelectedProfileId(profileId);
          success(`Perfil "${profile.name}" aplicado y guardado correctamente`);
        },
      },
    );
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  function buildPayload(): Partial<MagosradarPayload> {
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
      maxSpeed: nn(form.maxSpeed),
      stationaryTtl: nn(form.stationaryTtl),
      minConfidence: nn(form.minConfidence),
      confidenceWindow: form.confidenceWindow === "" ? null : Number(form.confidenceWindow),
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

          <div className="flex flex-col gap-1.5 pb-3 border-b border-border/50">
            <Label htmlFor="profile-mg-edit" className="text-xs text-brand-200/80 uppercase tracking-widest font-semibold">
              Perfil de configuración
            </Label>
            <select
              id="profile-mg-edit"
              value={selectedProfileId}
              onChange={handleProfileChange}
              className="w-full rounded-lg border border-border bg-bg-100 text-text-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200/50 transition"
            >
              {MAGOSRADAR_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))}
            </select>
            {selectedProfileId !== "custom" && (
              <p className="text-[10px] text-brand-200/60 italic">
                Los campos se han preconfigurado con el perfil. Puedes ajustarlos manualmente si lo deseas.
              </p>
            )}
          </div>

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
                <InfoIcon text="Activa/desactiva el radar. 0 = no se conecta. 1 = operativo." />
              </Label>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, enabled: p.enabled === "1" ? "0" : "1" }))}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${form.enabled === "1" ? "bg-emerald-500" : "bg-bg-400"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.enabled === "1" ? "translate-x-5" : "translate-x-1"
                    }`}
                />
              </button>
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
              onChange={handleChange} type="number" step="any" placeholder="2.5" note={globalTooltip}
              info="Ángulo de elevación de la antena respecto al horizonte. Solo informativo." />
            <Field label="Altitud (msnm)" name="altitud" value={form.altitud}
              onChange={handleChange} type="number" step="any" placeholder="580" note={globalTooltip}
              info="Altitud del radar sobre el nivel del mar. Solo informativo." />

            <ColorField
              label="Color del radar" id="color-mg"
              value={form.color}
              onChange={(v) => setForm((p) => ({ ...p, color: v }))}
            />
          </div>

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

            <Field label="SNR (dB)" name="snr" value={form.snr}
              onChange={handleChange} type="number" step="any" placeholder="25"
              info="Umbral mínimo de calidad de señal. Detecciones con SNR menor se descartan." />
            <Field label="RCS (m²)" name="rcs" value={form.rcs}
              onChange={handleChange} type="number" step="any" placeholder="0.5"
              info="Tamaño estimado del blanco radar. Persona ≈ 0.5–1 m², auto ≈ 5–10 m²." />
            <Field label="Vel. máx (m/s)" name="speed" value={form.speed}
              onChange={handleChange} type="number" step="any" placeholder="55"
              info="Velocidad máxima para propagación por inercia (coasting)." />
            <Field label="Rumbo ref. (°)" name="heading" value={form.heading}
              onChange={handleChange} type="number" step="any" placeholder="0"
              info="Rumbo geográfico de referencia del radar (0=N, 90=E, 180=S, 270=W)." />

            <FieldRow>
              <Field label="Puntos mín. track" name="minTrackPoints" value={form.minTrackPoints}
                onChange={handleChange} type="number" min={1} placeholder="3"
                info="Detecciones consecutivas para confirmar un track (tentative → confirmed)." />
              <Field label="Dist. asociación (m)" name="associationDist" value={form.associationDist}
                onChange={handleChange} type="number" step="any" placeholder="50"
                info="Distancia máxima para asignar una detección a un track existente." />
            </FieldRow>

            <FieldRow>
              <Field label="TTL track (seg)" name="ttl" value={form.ttl}
                onChange={handleChange} type="number" step="any" placeholder="8"
                info="Segundos sin detección antes de eliminar un track confirmado." />
              <Field label="TTL coasting (seg)" name="coastTtl" value={form.coastTtl}
                onChange={handleChange} type="number" step="any" placeholder="3"
                info="Tiempo de predicción por inercia sin detecciones." />
            </FieldRow>

            <FieldRow>
              <Field label="Suav. posición" name="emaSmooth" value={form.emaSmooth}
                onChange={handleChange} type="number" step="0.01" placeholder="0.30"
                info="Factor EMA para suavizar posición. Mayor = más reactivo pero titila." />
              <Field label="Suav. velocidad" name="velSmooth" value={form.velSmooth}
                onChange={handleChange} type="number" step="0.01" placeholder="0.20"
                info="Factor EMA para suavizar velocidad del track." />
            </FieldRow>

            <FieldRow>
              <Field label="Máx detecciones" name="maxDetections" value={form.maxDetections}
                onChange={handleChange} type="number" min={1} placeholder="40"
                info="Máximo de detecciones por mensaje que se pasan al tracker." />
              <Field label="Dist. clustering (m)" name="clusterDist" value={form.clusterDist}
                onChange={handleChange} type="number" step="any" placeholder="8"
                info="Distancia para agrupar detecciones cercanas y quedarse con la de mejor SNR." />
            </FieldRow>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SectionTitle>RF &mdash; Especificaciones técnicas</SectionTitle>

            <FieldRow>
              <Field label="Frecuencia (GHz)" name="frecuencia" value={form.frecuencia}
                onChange={handleChange} type="number" step="any" placeholder="77"
                info="Frecuencia de operación del hardware. Solo informativo." />
              <Field label="Potencia (dBm)" name="potencia" value={form.potencia}
                onChange={handleChange} type="number" step="any" placeholder="20"
                info="Potencia de transmisión del hardware. Solo informativo." />
            </FieldRow>

            <SectionTitle>Velocidad &amp; Tiempo</SectionTitle>

            <FieldRow>
              <Field label="Vel. máx escenario (m/s)" name="maxSpeed" value={form.maxSpeed}
                onChange={handleChange} type="number" step="any" placeholder="55"
                info="Velocidad máxima esperada en el escenario." />
              <Field label="TTL detenido (seg)" name="stationaryTtl" value={form.stationaryTtl}
                onChange={handleChange} type="number" step="any" placeholder="30"
                info="TTL extendido para objetos detenidos (isStationary)." />
            </FieldRow>

            <SectionTitle>Scoring &amp; Confianza</SectionTitle>

            <FieldRow>
              <Field label="Confianza mín. (%)" name="minConfidence" value={form.minConfidence}
                onChange={handleChange} type="number" step="any" placeholder="30"
                info="Confianza mínima (0-100) para mostrar track." />
              <Field label="Ventana confianza" name="confidenceWindow" value={form.confidenceWindow}
                onChange={handleChange} type="number" min={1} placeholder="10"
                info="Nº de puntos recientes para evaluar confianza." />
            </FieldRow>
          </div>

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
