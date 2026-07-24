import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui";
import type { PerfilMagos, PerfilMagosPayload } from "../../types/ConfigServices.type";
import { useCreatePerfilMagos, useUpdatePerfilMagos } from "../hooks/usePerfilMagos";
import { useToast } from "@/libs/sonner";

interface PerfilMagosModalProps {
  perfil?: PerfilMagos | null;
  onClose: () => void;
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
  step,
  info,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  info?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name} className="text-xs text-text-100/80">
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
      />
    </div>
  );
}

function n(v: number | string | null | undefined): string {
  return v == null ? "" : String(v);
}
function nn(v: string): number | null {
  return v === "" ? null : Number(v);
}

export function PerfilMagosModal({ perfil, onClose }: PerfilMagosModalProps) {
  const isEditing = !!perfil;
  const { mutate: createMutate, isPending: isCreating } = useCreatePerfilMagos();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdatePerfilMagos();
  const { success } = useToast();
  const isPending = isCreating || isUpdating;

  const [form, setForm] = useState({
    nombre: perfil?.nombre ?? "",
    descripcion: perfil?.descripcion ?? "",
    snr: n(perfil?.snr),
    rcs: n(perfil?.rcs),
    speed: n(perfil?.speed),
    heading: n(perfil?.heading),
    trackColor: perfil?.trackColor ?? "",
    minTrackPoints: n(perfil?.minTrackPoints),
    associationDist: n(perfil?.associationDist),
    ttl: n(perfil?.ttl),
    coastTtl: n(perfil?.coastTtl),
    emaSmooth: n(perfil?.emaSmooth),
    velSmooth: n(perfil?.velSmooth),
    maxDetections: n(perfil?.maxDetections),
    clusterDist: n(perfil?.clusterDist),
    maxSpeed: n(perfil?.maxSpeed),
    stationaryTtl: n(perfil?.stationaryTtl),
    minConfidence: n(perfil?.minConfidence),
    confidenceWindow: n(perfil?.confidenceWindow),
    rcsRangeRef: n(perfil?.rcsRangeRef),
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function buildPayload(): PerfilMagosPayload {
    return {
      nombre: form.nombre,
      descripcion: form.descripcion,
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
      rcsRangeRef: nn(form.rcsRangeRef),
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = buildPayload();

    if (isEditing && perfil) {
      updateMutate(
        { id: perfil.id, payload },
        {
          onSuccess: () => {
            success("Perfil actualizado correctamente");
            onClose();
          },
        },
      );
    } else {
      createMutate(payload, {
        onSuccess: () => {
          success("Perfil creado correctamente");
          onClose();
        },
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-bg-200 z-10">
          <div>
            <h2 className="text-base font-semibold text-text-100">
              {isEditing ? "Editar Perfil" : "Nuevo Perfil"}
            </h2>
            <p className="text-xs text-text-200 mt-0.5">
              {isEditing ? `ID: ${perfil.id}` : "Configuración de tracking avanzado"}
            </p>
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
          {/* Información básica */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="nombre" className="text-xs text-text-100/80">Nombre del perfil</Label>
            <Input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Balanceado"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="descripcion" className="text-xs text-text-100/80">Descripción</Label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Perfil recomendado para uso general"
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-100 text-text-100 placeholder-text-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Tracking */}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-200/80 mt-2">
            Parámetros de tracking
          </h3>
          <div className="h-px bg-border/60 -mt-2" />

          <FieldRow>
            <Field label="SNR (dB)" name="snr" value={form.snr} onChange={handleChange} type="number" step="any" placeholder="22"
              info="Umbral mínimo de calidad de señal." />
            <Field label="RCS (m²)" name="rcs" value={form.rcs} onChange={handleChange} type="number" step="any" placeholder="0.5"
              info="Tamaño estimado del blanco radar." />
          </FieldRow>
          <FieldRow>
            <Field label="Vel. máx (m/s)" name="speed" value={form.speed} onChange={handleChange} type="number" step="any" placeholder="40"
              info="Velocidad máxima para propagación por inercia." />
            <Field label="Rumbo ref. (°)" name="heading" value={form.heading} onChange={handleChange} type="number" step="any" placeholder="0"
              info="Rumbo geográfico de referencia." />
          </FieldRow>
          <FieldRow>
            <Field label="Puntos mín. track" name="minTrackPoints" value={form.minTrackPoints} onChange={handleChange} type="number" min={1} placeholder="3"
              info="Detecciones consecutivas para confirmar un track." />
            <Field label="Dist. asociación (m)" name="associationDist" value={form.associationDist} onChange={handleChange} type="number" step="any" placeholder="50"
              info="Distancia máxima para asignar detección a track." />
          </FieldRow>
          <FieldRow>
            <Field label="TTL track (seg)" name="ttl" value={form.ttl} onChange={handleChange} type="number" step="any" placeholder="8"
              info="Segundos sin detección antes de eliminar track." />
            <Field label="TTL coasting (seg)" name="coastTtl" value={form.coastTtl} onChange={handleChange} type="number" step="any" placeholder="3"
              info="Tiempo de predicción por inercia." />
          </FieldRow>
          <FieldRow>
            <Field label="Suav. posición" name="emaSmooth" value={form.emaSmooth} onChange={handleChange} type="number" step="0.01" placeholder="0.30"
              info="Factor EMA para suavizar posición." />
            <Field label="Suav. velocidad" name="velSmooth" value={form.velSmooth} onChange={handleChange} type="number" step="0.01" placeholder="0.20"
              info="Factor EMA para suavizar velocidad." />
          </FieldRow>
          <FieldRow>
            <Field label="Máx detecciones" name="maxDetections" value={form.maxDetections} onChange={handleChange} type="number" min={1} placeholder="40"
              info="Máximo de detecciones por mensaje al tracker." />
            <Field label="Dist. clustering (m)" name="clusterDist" value={form.clusterDist} onChange={handleChange} type="number" step="any" placeholder="8"
              info="Distancia para agrupar detecciones cercanas." />
          </FieldRow>

        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-200/80 mt-3">
          Velocidad &amp; Tiempo
        </h3>
        <div className="h-px bg-border/60 -mt-2" />

        <FieldRow>
          <Field label="Vel. máx escenario (m/s)" name="maxSpeed" value={form.maxSpeed} onChange={handleChange} type="number" step="any" placeholder="55"
            info="Velocidad máxima esperada en el escenario." />
          <Field label="TTL detenido (seg)" name="stationaryTtl" value={form.stationaryTtl} onChange={handleChange} type="number" step="any" placeholder="30"
            info="TTL extendido para objetos detenidos (isStationary)." />
        </FieldRow>

        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-200/80 mt-3">
          Scoring &amp; Confianza
        </h3>
        <div className="h-px bg-border/60 -mt-2" />

        <FieldRow>
          <Field label="Confianza mín. (%)" name="minConfidence" value={form.minConfidence} onChange={handleChange} type="number" step="any" placeholder="30"
            info="Confianza mínima (0-100) para mostrar un track." />
          <Field label="Ventana confianza" name="confidenceWindow" value={form.confidenceWindow} onChange={handleChange} type="number" min={1} placeholder="10"
            info="Nº de puntos recientes para evaluar confianza." />
          <Field label="Rango ref. RCS (m)" name="rcsRangeRef" value={form.rcsRangeRef} onChange={handleChange} type="number" step="any" placeholder="1000"
            info="Rango de referencia para normalizar RSC según distancia." />
        </FieldRow>

        {/* Color */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="trackColor" className="text-xs text-text-100/80">Color de tracks</Label>
            <div className="flex items-center gap-2">
              <input
                id="trackColor"
                type="color"
                name="trackColor"
                value={form.trackColor || "#00e5ff"}
                onChange={(e) => setForm((p) => ({ ...p, trackColor: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
              />
              <span className="text-xs text-text-100/50">{form.trackColor || "—"}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="solid" isLoading={isPending} loadingText="Guardando...">
              {isEditing ? "Guardar cambios" : "Crear perfil"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
