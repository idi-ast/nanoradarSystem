import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

export interface CustomSound {
  id: number;
  /** Nombre visible (sin extensión) */
  label: string;
  /** Ruta pública del archivo, ej: /mp3/sonido_custom.mp3 */
  file: string;
}

export const MAX_CUSTOM_SOUNDS = 10;

interface CustomSoundsState {
  customSounds: CustomSound[];
  isUploading: boolean;
  addSound: (file: File) => Promise<void>;
  removeSound: (id: number) => Promise<void>;
}

export const useCustomSounds = create<CustomSoundsState>()(
  persist(
    (set, get) => ({
      customSounds: [],
      isUploading: false,

      addSound: async (file: File) => {
        const { customSounds } = get();

        if (customSounds.length >= MAX_CUSTOM_SOUNDS) {
          toast.error(`Límite alcanzado: máximo ${MAX_CUSTOM_SOUNDS} sonidos personalizados.`);
          return;
        }

        set({ isUploading: true });

        try {
          const buffer = await file.arrayBuffer();
          const res = await fetch("/api-local/upload-sound", {
            method: "POST",
            headers: {
              "x-file-name": file.name,
              "Content-Type": "application/octet-stream",
            },
            body: buffer,
          });

          if (!res.ok) throw new Error("Error al subir el archivo");

          const data = await res.json() as { url: string; filename: string };

          const newSound: CustomSound = {
            id: Date.now(),
            label: data.filename.replace(/\.mp3$/i, ""),
            file: data.url,
          };

          set({ customSounds: [...customSounds, newSound] });
          toast.success(`"${newSound.label}" agregado correctamente.`);
        } catch (error) {
          console.error("Error al subir sonido:", error);
          toast.error("Ocurrió un error al subir el sonido.");
        } finally {
          set({ isUploading: false });
        }
      },

      removeSound: async (id: number) => {
        const { customSounds } = get();
        const sound = customSounds.find((s) => s.id === id);
        if (!sound) return;

        try {
          const filename = sound.file.split("/").pop();
          if (filename) {
            await fetch("/api-local/delete-sound", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename }),
            });
          }
          set({ customSounds: customSounds.filter((s) => s.id !== id) });
          toast.success(`"${sound.label}" eliminado.`);
        } catch (error) {
          console.error("Error al eliminar sonido:", error);
          toast.error("Error al eliminar el sonido.");
        }
      },
    }),
    {
      name: "nanoradar-custom-sounds",
    }
  )
);
