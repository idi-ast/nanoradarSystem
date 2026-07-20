import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import type { Magosradares } from "../../types/ConfigServices.type";
import { useUpdateMagosradar } from "../hooks/useUpdateMagosradar";
import type { MagosradarPayload } from "../service";

interface MagosradarEditModalProps {
  magosradar: Magosradares;
  onClose: () => void;
}

export function MagosradarEditModal({ magosradar, onClose }: MagosradarEditModalProps) {
  const { mutate, isPending, isError, error } = useUpdateMagosradar();

  const [form, setForm] = useState<MagosradarPayload>({
    nombre: magosradar.nombre,
    direccionIp: magosradar.direccionIp,
    latitud: magosradar.latitud,
    longitud: magosradar.longitud,
    azimut: magosradar.azimut,
    grado: magosradar.grado,
    radio: magosradar.radio,
    apertura: magosradar.apertura,
    color: magosradar.color,
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
    const payload: MagosradarPayload = {
      ...form,
      grado: Number(form.grado),
      radio: Number(form.radio),
      apertura: Number(form.apertura),
    };
    mutate(
      { id: magosradar.id, payload },
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

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nombre-mg">Nombre</Label>
              <Input id="nombre-mg" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>

            <div className="col-span-2">
              <Label htmlFor="direccionIp-mg">Dirección IP</Label>
              <Input id="direccionIp-mg" name="direccionIp" value={form.direccionIp} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="latitud-mg">Latitud</Label>
              <Input id="latitud-mg" name="latitud" type="number" step="any" value={form.latitud} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="longitud-mg">Longitud</Label>
              <Input id="longitud-mg" name="longitud" type="number" step="any" value={form.longitud} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="azimut-mg">Azimut (°)</Label>
              <Input id="azimut-mg" name="azimut" type="number" min="0" max="360" value={form.azimut} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="grado-mg">Grado (°)</Label>
              <Input id="grado-mg" name="grado" type="number" min="0" max="360" value={form.grado} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="radio-mg">Radio (m)</Label>
              <Input id="radio-mg" name="radio" type="number" min="1" value={form.radio} onChange={handleChange} />
            </div>

            <div>
              <Label htmlFor="apertura-mg">Apertura (°)</Label>
              <Input id="apertura-mg" name="apertura" type="number" min="1" max="360" value={form.apertura} onChange={handleChange} />
            </div>

            <div className="col-span-2 flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="color-mg">Color</Label>
                <Input id="color-mg" name="color" value={form.color} onChange={handleChange} placeholder="#f43f5e" />
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
