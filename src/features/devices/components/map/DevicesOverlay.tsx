import React, { memo } from "react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { NR_PALETTE, MG_PALETTE, ALL_VISIBLE } from "./devicesConfig";
import type { DeviceFilter } from "../../types";
import {
  NanoradarDeviceLayer,
  NanoradarPulseLayer,
  MagosradarDeviceLayer,
  MagosradarPulseLayer,
  SpotterDeviceLayer,
  SpotterPulseLayer,
  CameraDeviceLayers,
} from "./devices";
import { useCameraCalibrationStore } from "../../stores/cameraCalibrationStore";
import { CameraCalibrationOverlay } from "./CameraCalibrationOverlay";

export interface DeviceVisibility {
  hiddenNanoradares: Set<number>;
  hiddenMagosradares: Set<number>;
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
  const calibratingCameraId = useCameraCalibrationStore(
    (s) => s.calibratingCameraId,
  );
  const lastResult = useCameraCalibrationStore((s) => s.lastResult);
  const liveBearing = useCameraCalibrationStore((s) => s.previewBearing);

  if (!data?.data) return null;

  const { nanoradares, magosradares, spotters, camaras, ptz } = data.data;

  const showNanoradares = deviceFilter !== "spotter" && deviceFilter !== "magosradar";
  const showMagosradares = deviceFilter !== "spotter" && deviceFilter !== "nanoRadar";
  const showSpotters = deviceFilter !== "nanoRadar" && deviceFilter !== "magosradar";

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

      {showMagosradares && magosradares
        .filter((mg) => !visibility.hiddenMagosradares.has(mg.id))
        .map((mg, idx) => {
          const palette = MG_PALETTE[idx % MG_PALETTE.length];
          const colorPrimary = mg.color || palette.primary;
          const colorPulse = mg.color || palette.pulse;
          const lat = Number(mg.latitud);
          const lon = Number(mg.longitud);
          const sid = `dev-mg-${mg.id}`;
          return (
            <React.Fragment key={mg.id}>
              <MagosradarDeviceLayer
                mg={mg}
                colorPrimary={colorPrimary}
                colorPulse={colorPulse}
              />
              <MagosradarPulseLayer
                sid={sid}
                lat={lat}
                lon={lon}
                radio={mg.radio}
                startAngle={mg.grado - mg.apertura / 2}
                endAngle={mg.grado + mg.apertura / 2}
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
          <React.Fragment key={`ptz-${p.id}`}>
            <CameraDeviceLayers camera={p} />
            {calibratingCameraId === p.id && (
              <CameraCalibrationOverlay
                cameraLat={Number(p.ubicacion.lat)}
                cameraLon={Number(p.ubicacion.lng)}
                currentBearing={Number(p.azimut || p.grado || 0)}
                liveBearing={liveBearing}
                rangeM={p.radio > 0 ? p.radio : 200}
                color={p.color || "#8207d5"}
                result={lastResult}
              />
            )}
          </React.Fragment>
        ))}

      {/* Calibración para cámaras fijas */}
      {camaras
        .filter((c) => !visibility.hiddenCamaras.has(c.id))
        .map((c) => (
          <React.Fragment key={`cam-${c.id}`}>
            <CameraDeviceLayers camera={c} />
            {calibratingCameraId === c.id && (
              <CameraCalibrationOverlay
                cameraLat={Number(c.ubicacion.lat)}
                cameraLon={Number(c.ubicacion.lng)}
                currentBearing={Number(c.azimut || c.grado || 0)}
                liveBearing={liveBearing}
                rangeM={c.radio > 0 ? c.radio : 200}
                color={c.color || "#f59e0b"}
                result={lastResult}
              />
            )}
          </React.Fragment>
        ))}
    </>
  );
});
