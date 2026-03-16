/**
 * DevicesOverlay
 *
 * Renderiza todos los dispositivos del sistema sobre el mapa Mapbox:
 *  - Nanoradares  → beam sectorial + anillos concéntricos + pulso animado
 *  - Spotters     → sector de cobertura + marcador con bearing
 *  - Cámaras      → cono FOV + ícono de cámara con tooltip
 *
 * La lógica visual de cada tipo de dispositivo vive en ./devices/
 * Fuente de datos: GET /configuracion-general  (useConfigDevices)
 */

import { useState, useEffect, useRef } from "react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { BEAM_ANIMATION } from "../../config";
import { NR_PALETTE, ALL_VISIBLE } from "./devicesConfig";
import {
  NanoradarDeviceLayer,
  SpotterDeviceLayer,
  CameraDeviceLayers,
} from "./devices";

export interface DeviceVisibility {
  hiddenNanoradares: Set<number>;
  hiddenSpotters: Set<number>;
  hiddenCamaras: Set<number>;
}

export function DevicesOverlay({
  visibility = ALL_VISIBLE,
}: {
  visibility?: DeviceVisibility;
}) {
  const { data } = useConfigDevices();
  const [phase, setPhase] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const frameIntervalMs = 1000 / BEAM_ANIMATION.TARGET_FPS;

  useEffect(() => {
    const animate = (now: number) => {
      if (now - lastFrameRef.current >= frameIntervalMs) {
        setPhase(
          (now % BEAM_ANIMATION.PULSE_CYCLE_MS) / BEAM_ANIMATION.PULSE_CYCLE_MS,
        );
        lastFrameRef.current = now;
      }
      rafIdRef.current = window.requestAnimationFrame(animate);
    };
    rafIdRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafIdRef.current !== null)
        window.cancelAnimationFrame(rafIdRef.current);
    };
  }, [frameIntervalMs]);

  if (!data?.data) return null;

  const { nanoradares, spotters, camaras } = data.data;

  return (
    <>
      {nanoradares
        .filter((nr) => !visibility.hiddenNanoradares.has(nr.id))
        .map((nr, idx) => {
          const palette = NR_PALETTE[idx % NR_PALETTE.length];
          const colorPrimary = nr.color || palette.primary;
          const colorPulse = nr.color || palette.pulse;
          return (
            <NanoradarDeviceLayer
              key={nr.id}
              nr={nr}
              phase={phase}
              colorPrimary={colorPrimary}
              colorPulse={colorPulse}
            />
          );
        })}

      {spotters
        .filter((s) => !visibility.hiddenSpotters.has(s.id))
        .map((s) => (
          <SpotterDeviceLayer key={s.id} spotter={s} phase={phase} />
        ))}

      {camaras
        .filter((c) => !visibility.hiddenCamaras.has(c.id))
        .map((c) => (
          <CameraDeviceLayers key={c.id} camera={c} />
        ))}
    </>
  );
}
