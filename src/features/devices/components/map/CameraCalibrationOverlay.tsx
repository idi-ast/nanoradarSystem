import { memo, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import { useCameraCalibrationStore } from "../../stores/cameraCalibrationStore";
import { getGeoPoint } from "./utils/geoHelpers";
import { DEVICES_BELOW_LAYER_ID } from "./devicesConfig";

export interface CameraCalibrationOverlayProps {
  /** Posición de la cámara en calibración */
  cameraLat: number;
  cameraLon: number;
  /** Azimut (punto 0) actual de la cámara — referencia FIJA */
  currentBearing: number;
  /** Bearing hacia donde mira la cámara AHORA (visión en vivo) */
  liveBearing?: number | null;
  /** Radio de cobertura actual */
  rangeM: number;
  /** Color de la cámara */
  color?: string;
}

/**
 * Overlay de calibración que se superpone sobre una cámara en modo calibración.
 *
 * Muestra:
 * - Una línea amarilla tenue = dirección del PUNTO 0 (azimut), la referencia
 *   a partir de la cual se calcula el giro.
 * - Una línea cian = visión ACTUAL de la cámara (rota al girar la cámara).
 * - Un marcador en el punto clickeado (referencia a guardar).
 */
export const CameraCalibrationOverlay = memo(
  function CameraCalibrationOverlay({
    cameraLat,
    cameraLon,
    currentBearing,
    liveBearing,
    rangeM,
    color = "#ebbe35",
  }: CameraCalibrationOverlayProps) {
    const clickPoint = useCameraCalibrationStore((s) => s.clickPoint);

    const calibColor = color || "#ebbe35"; // Amarillo SpotterRF (punto 0)
    const liveColor = "#00d4ff"; // Cian (visión actual)
    const effectiveRange = rangeM > 0 ? rangeM : 200;

    // Extremo de la línea del punto 0
    const boresightEnd = useMemo(
      () => getGeoPoint(cameraLat, cameraLon, currentBearing, effectiveRange),
      [cameraLat, cameraLon, currentBearing, effectiveRange],
    );

    // Extremo de la línea de visión actual
    const liveEnd = useMemo(
      () =>
        liveBearing !== null && liveBearing !== undefined
          ? getGeoPoint(cameraLat, cameraLon, liveBearing, effectiveRange)
          : null,
      [cameraLat, cameraLon, liveBearing, effectiveRange],
    );

    // Datos GeoJSON de la línea de calibración
    const geoData = useMemo(() => {
      const features: Record<string, unknown>[] = [];

      // ── Línea del PUNTO 0 (referencia fija, línea gruesa amarilla) ──
      features.push({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [cameraLon, cameraLat],
            boresightEnd,
          ],
        },
        properties: { kind: "calib-boresight" },
      });

      // ── Línea de visión ACTUAL (cian) ──
      if (liveEnd) {
        features.push({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [cameraLon, cameraLat],
              liveEnd,
            ],
          },
          properties: { kind: "calib-live" },
        });
      }

      return {
        type: "FeatureCollection" as const,
        features,
      };
    }, [cameraLat, cameraLon, currentBearing, liveEnd, effectiveRange]);

    const sourceId = `calib-overlay`;

    return (
      <>
        <Source id={sourceId} type="geojson" data={geoData}>
          {/* Línea del PUNTO 0 (referencia fija) */}
          <Layer
            id={`${sourceId}-boresight`}
            type="line"
            beforeId={DEVICES_BELOW_LAYER_ID}
            filter={
              ["==", ["get", "kind"], "calib-boresight"] as unknown as FilterSpecification
            }
            paint={{
              "line-color": calibColor,
              "line-width": 1.5,
              "line-opacity": 0.4,
              "line-dasharray": [4, 3],
            }}
          />

          {/* Línea de visión actual (cian) */}
          {liveEnd && (
            <Layer
              id={`${sourceId}-live`}
              type="line"
              beforeId={DEVICES_BELOW_LAYER_ID}
              filter={
                ["==", ["get", "kind"], "calib-live"] as unknown as FilterSpecification
              }
              paint={{
                "line-color": liveColor,
                "line-width": 4,
                "line-opacity": 1,
                "line-dasharray": [2, 2],
              }}
            />
          )}
        </Source>

        {/* Indicador del punto 0 (extremo de la línea del punto 0) — fijo */}
        <Marker
          longitude={boresightEnd[0]}
          latitude={boresightEnd[1]}
          anchor="center"
          style={{ zIndex: 30, pointerEvents: "none" }}
        >
          <div
            className="w-2 h-2 rounded-full border"
            style={{
              backgroundColor: calibColor,
              borderColor: "#fff",
              boxShadow: "0 0 6px rgba(235, 190, 53, 0.5)",
            }}
            title="Punto 0 de la cámara (referencia fija)"
          />
        </Marker>

        {/* Indicador de la visión actual (cián) */}
        {liveEnd && (
          <Marker
            longitude={liveEnd[0]}
            latitude={liveEnd[1]}
            anchor="center"
            style={{ zIndex: 30, pointerEvents: "none" }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border-2"
              style={{
                backgroundColor: liveColor,
                borderColor: "#fff",
                boxShadow: "0 0 10px rgba(0, 212, 255, 0.9)",
              }}
              title="Visión actual de la cámara"
            />
          </Marker>
        )}

        {/* Marker en el punto clickeado (solo visual, no bloquea el ratón) */}
        {clickPoint && (
          <Marker
            longitude={clickPoint.lon}
            latitude={clickPoint.lat}
            anchor="center"
            style={{ zIndex: 20, pointerEvents: "none" }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 animate-pulse"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#000",
                boxShadow: "0 0 12px rgba(255, 255, 255, 0.7)",
              }}
            />
          </Marker>
        )}
      </>
    );
  },
);
