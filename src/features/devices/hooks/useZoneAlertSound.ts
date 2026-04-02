import { useEffect, useRef } from "react";
import type { RadarZone } from "../types";
import { ZONE_SOUNDS } from "../config";
import { useCustomSounds } from "./useCustomSounds";

/**
 * Reproduce (en loop) el sonido configurado en cada zona mientras haya un
 * target activo dentro de ella. Detiene la reproducción cuando la zona deja
 * de estar activa.
 *
 * @param zones    - Lista completa de zonas del radar.
 * @param activeZoneIds - Set de IDs de zonas con detección activa.
 */
export function useZoneAlertSound(
  zones: RadarZone[],
  activeZoneIds: Set<string>,
): void {
  // Map<zoneKey, HTMLAudioElement>
  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  // Sonidos bloqueados por autoplay policy — se reproducen en la próxima interacción
  const blockedRef = useRef<Set<string>>(new Set());

  // Intenta reproducir todos los sonidos bloqueados en la primera interacción del usuario
  useEffect(() => {
    const unblock = () => {
      for (const key of blockedRef.current) {
        const audio = audioMap.current.get(key);
        if (audio) {
          audio.play().catch(() => {
            // Sigue bloqueado; el usuario necesita más interacción
          });
        }
      }
      blockedRef.current.clear();
    };
    window.addEventListener("pointerdown", unblock, { once: true });
    window.addEventListener("keydown", unblock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unblock);
      window.removeEventListener("keydown", unblock);
    };
  }, []);

  useEffect(() => {
    const currentKeys = new Set(audioMap.current.keys());

    for (const zone of zones) {
      const key = zone.id?.toString() ?? zone.nombre;
      const isActive = activeZoneIds.has(key);

      if (isActive) {
        // Si la zona acaba de activarse y tiene sonido configurado → arrancar
        if (!audioMap.current.has(key) && zone.sonido != null) {
          // Buscamos primero en el store local, luego en los estáticos
          const { customSounds } = useCustomSounds.getState();
          const soundDef =
            ZONE_SOUNDS.find((s) => s.id === zone.sonido) ||
            customSounds.find((s) => s.id === zone.sonido);

          if (soundDef) {
            const audio = new Audio(soundDef.file);
            audio.loop = true;
            audio.play().catch(() => {
              // El navegador bloquea autoplay sin interacción previa.
              // Registrar para reintentar en la próxima interacción del usuario.
              blockedRef.current.add(key);
              if (import.meta.env.DEV) {
                console.warn(` Autoplay bloqueado para zona "${zone.nombre}". Se reproducirá en la próxima interacción.`);
              }
            });
            audioMap.current.set(key, audio);
          }
        }
      } else {
        // La zona ya no está activa → detener y eliminar
        if (audioMap.current.has(key)) {
          const audio = audioMap.current.get(key)!;
          audio.pause();
          audio.currentTime = 0;
          audioMap.current.delete(key);
          blockedRef.current.delete(key);
        }
      }

      currentKeys.delete(key);
    }

    // Zonas que ya no existen en el listado → limpiar también
    for (const orphanKey of currentKeys) {
      const audio = audioMap.current.get(orphanKey);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audioMap.current.delete(orphanKey);
        blockedRef.current.delete(orphanKey);
      }
    }
  }, [zones, activeZoneIds]);

  // Cleanup al desmontar
  useEffect(() => {
    const map = audioMap.current;
    return () => {
      for (const audio of map.values()) {
        audio.pause();
        audio.currentTime = 0;
      }
      map.clear();
    };
  }, []);
}
