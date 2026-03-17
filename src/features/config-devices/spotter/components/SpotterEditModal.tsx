import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import type { Spotters } from "../../types/ConfigServices.type";
import { useUpdateSpotter } from "../hooks/useUpdateSpotter";
import type { SpotterPayload } from "../service";

interface SpotterEditModalProps {
  spotter: Spotters;
  onClose: () => void;
}

export function SpotterEditModal({ spotter, onClose }: SpotterEditModalProps) {
  const { mutate, isPending, isError, error } = useUpdateSpotter();

  const [form, setForm] = useState<SpotterPayload>({
    nombre: spotter.nombre,
    direccionIp: spotter.direccionIp,
    latitude: spotter.latitude,
    longitude: spotter.longitude,
    azimut: spotter.azimut,
    grado: spotter.grado,
    radio: spotter.radio,
    apertura: spotter.apertura,
    color: spotter.color,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: SpotterPayload = {
      ...form,
      grado: Number(form.grado),
      radio: Number(form.radio),
      apertura: Number(form.apertura),
    };
    mutate(
      { id: spotter.id, payload },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-200 border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-100">Editar Spotter</h2>
            <p className="text-xs text-text-200 mt-0.5">ID: {spotter.id}</p>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>

            <div className="col-span-2">
              <Label htmlFor="direccionIp">Dirección IP</Label>
              <Input id="direccionIp" name="direccionIp" value={form.direccionIp} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="latitude">Latitud</Label>
              <Input id="latitude" name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="longitude">Longitud</Label>
              <Input id="longitude" name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="azimut">Azimut (°)</Label>
              <Input id="azimut" name="azimut" type="number" min="0" max="360" value={form.azimut} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="grado">Grado (°)</Label>
              <Input id="grado" name="grado" type="number" min="0" max="360" value={form.grado} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="radio">Radio (m)</Label>
              <Input id="radio" name="radio" type="number" min="1" value={form.radio} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="apertura">Apertura (°)</Label>
              <Input id="apertura" name="apertura" type="number" min="1" max="360" value={form.apertura} onChange={handleChange} />
            </div>

            <div className="col-span-2 flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" value={form.color} onChange={handleChange} placeholder="#a855f7" />
              </div>
              <div
                className="w-10 h-10 rounded-lg border border-border shrink-0 mb-0.5"
                style={{ backgroundColor: form.color }}
              />
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent shrink-0 mb-0.5"
                title="Seleccionar color"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
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
