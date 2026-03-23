import { useEffect, useRef } from "react";
import type { RadarZone } from "../types";
import { ZONE_SOUNDS } from "../config";

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

  useEffect(() => {
    const currentKeys = new Set(audioMap.current.keys());

    for (const zone of zones) {
      const key = zone.id?.toString() ?? zone.nombre;
      const isActive = activeZoneIds.has(key);

      if (isActive) {
        // Si la zona acaba de activarse y tiene sonido configurado → arrancar
        if (!audioMap.current.has(key) && zone.sonido != null) {
          const soundDef = ZONE_SOUNDS.find((s) => s.id === zone.sonido);
          if (soundDef) {
            const audio = new Audio(soundDef.file);
            audio.loop = true;
            audio.play().catch(() => {
              // El navegador puede bloquear autoplay si no hubo interacción previa
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
