import { useState, useEffect, useCallback } from "react";
import type { Magosradares } from "../../types/ConfigServices.type";
import { useUpdateMagosradar } from "../hooks/useUpdateMagosradar";
import type { MagosradarPayload } from "../service";
import { useToast } from "@/libs/sonner";
import { MagosradarSimpleForm } from "./MagosradarSimpleForm";
import type { SimpleMagosradarFormData } from "./MagosradarSimpleForm";

interface MagosradarEditModalProps {
  magosradar: Magosradares;
  onClose: () => void;
}

export function MagosradarEditModal({ magosradar, onClose }: MagosradarEditModalProps) {
  const { mutate, isPending, isError, error } = useUpdateMagosradar();
  const { success } = useToast();

  const initialData: SimpleMagosradarFormData = {
    nombre: magosradar.nombre,
    direccionIp: magosradar.direccionIp,
    latitud: magosradar.latitud,
    longitud: magosradar.longitud,
    azimut: magosradar.azimut,
    grado: magosradar.grado,
    radio: magosradar.radio,
    apertura: magosradar.apertura,
    color: magosradar.color ?? "#f43f5e",
    // Avanzados
    rcs: magosradar.rcs,
    snr: magosradar.snr,
    speed: magosradar.speed,
    maxSpeed: magosradar.maxSpeed,
    heading: magosradar.heading,
    trackColor: magosradar.trackColor,
    minTrackPoints: magosradar.minTrackPoints,
    associationDist: magosradar.associationDist,
    ttl: magosradar.ttl,
    coastTtl: magosradar.coastTtl,
    stationaryTtl: magosradar.stationaryTtl,
    emaSmooth: magosradar.emaSmooth,
    velSmooth: magosradar.velSmooth,
    maxDetections: magosradar.maxDetections,
    clusterDist: magosradar.clusterDist,
    minConfidence: magosradar.minConfidence,
    confidenceWindow: magosradar.confidenceWindow,
    // Metadatos
    enabled: magosradar.enabled,
    modelo: magosradar.modelo,
    frecuencia: magosradar.frecuencia,
    potencia: magosradar.potencia,
    elevacion: magosradar.elevacion,
    altitud: magosradar.altitud,
    notas: magosradar.notas,
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(data: SimpleMagosradarFormData) {
    const payload: Partial<MagosradarPayload> = {
      ...data,
      grado: Number(data.grado),
      radio: Number(data.radio),
      apertura: Number(data.apertura),
      azimut: String(data.azimut),
    };
    await new Promise<void>((resolve, reject) => {
      mutate(
        { id: magosradar.id, payload },
        {
          onSuccess: () => {
            success("MagosRadar actualizado correctamente");
            onClose();
            resolve();
          },
          onError: (err) => reject(err),
        },
      );
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-100">Editar MagosRadar</h2>
            <p className="text-xs text-text-200 mt-0.5">ID: {magosradar.id} — {magosradar.nombre}</p>
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

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          {isError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 mb-3">
              {(error as Error)?.message ?? "Error al guardar los cambios."}
            </div>
          )}

          <MagosradarSimpleForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isPending}
            submitLabel="Guardar cambios"
          />
        </div>
      </div>
    </div>
  );
}
