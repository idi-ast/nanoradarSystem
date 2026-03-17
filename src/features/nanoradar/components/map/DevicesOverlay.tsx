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

import React, { memo } from "react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { NR_PALETTE, ALL_VISIBLE } from "./devicesConfig";
import {
  NanoradarDeviceLayer,
  NanoradarPulseLayer,
  SpotterDeviceLayer,
  SpotterPulseLayer,
  CameraDeviceLayers,
} from "./devices";

export interface DeviceVisibility {
  hiddenNanoradares: Set<number>;
  hiddenSpotters: Set<number>;
  hiddenCamaras: Set<number>;
}

export const DevicesOverlay = memo(function DevicesOverlay({
  visibility = ALL_VISIBLE,
}: {
  visibility?: DeviceVisibility;
}) {
  const { data } = useConfigDevices();

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
          const lat = Number(nr.latitud);
          const lon = Number(nr.longitud);
          const sid = `dev-nr-${nr.id}`;
          return (
            <React.Fragment key={nr.id}>
              {/* Capa estática: solo re-renderiza si cambia la config del dispositivo */}
              <NanoradarDeviceLayer
                nr={nr}
                colorPrimary={colorPrimary}
                colorPulse={colorPulse}
              />
              {/* Capa de pulso: recibe phase y re-renderiza a 30fps */}
              <NanoradarPulseLayer
                sid={sid}
                lat={lat}
                lon={lon}
                radio={nr.radio}
                startAngle={nr.grado - nr.apertura / 2}
                endAngle={nr.grado + nr.apertura / 2}
                colorPulse={colorPulse}
              />
            </React.Fragment>
          );
        })}

      {spotters
        .filter((s) => !visibility.hiddenSpotters.has(s.id))
        .map((s) => {
          const lat = Number(s.latitude);
          const lon = Number(s.longitude);
          const color = s.color || "#a855f7";
          const sid = `dev-sp-${s.id}`;
          return (
            <React.Fragment key={s.id}>
              {/* Capa estática: solo re-renderiza si cambia la config del dispositivo */}
              <SpotterDeviceLayer spotter={s} />
              {/* Capa de pulso: recibe phase y re-renderiza a 30fps */}
              <SpotterPulseLayer
                sid={sid}
                lat={lat}
                lon={lon}
                radio={s.radio}
                startAngle={Number(s.azimut) - s.apertura / 2}
                endAngle={Number(s.azimut) + s.apertura / 2}
                color={color}
              />
            </React.Fragment>
          );
        })}

      {camaras
        .filter((c) => !visibility.hiddenCamaras.has(c.id))
        .map((c) => (
          <CameraDeviceLayers key={c.id} camera={c} />
        ))}
    </>
  );
});
