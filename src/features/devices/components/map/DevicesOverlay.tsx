import React, { memo } from "react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { NR_PALETTE, ALL_VISIBLE } from "./devicesConfig";
import type { DeviceFilter } from "../../types";
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
  hiddenPtz: Set<number>;
}

export const DevicesOverlay = memo(function DevicesOverlay({
  visibility = ALL_VISIBLE,
  deviceFilter = "all",
}: {
  visibility?: DeviceVisibility;
  deviceFilter?: DeviceFilter;
}) {
  const { data } = useConfigDevices();

  if (!data?.data) return null;

  const { nanoradares, spotters, camaras, ptz } = data.data;

  const showNanoradares = deviceFilter !== "spotter";
  const showSpotters = deviceFilter !== "nanoRadar";

  return (
    <>
      {showNanoradares && nanoradares
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
              <NanoradarDeviceLayer
                nr={nr}
                colorPrimary={colorPrimary}
                colorPulse={colorPulse}
              />
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

      {showSpotters && spotters
        .filter((s) => !visibility.hiddenSpotters.has(s.id))
        .map((s) => {
          const lat = Number(s.latitude);
          const lon = Number(s.longitude);
          const color = s.color || "#a855f7";
          const sid = `dev-sp-${s.id}`;
          return (
            <React.Fragment key={s.id}>
              <SpotterDeviceLayer spotter={s} />
              <SpotterPulseLayer
                sid={sid}
                lat={lat}
                lon={lon}
                radio={s.radio}
                startAngle={s.grado - s.apertura / 2}
                endAngle={s.grado + s.apertura / 2}
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

      {(ptz ?? [])
        .filter((p) => !visibility.hiddenPtz.has(p.id))
        .map((p) => (
          <CameraDeviceLayers key={`ptz-${p.id}`} camera={p} />
        ))}
    </>
  );
});
