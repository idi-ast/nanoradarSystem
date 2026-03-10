import { useEffect, useMemo, useRef, useState } from "react";
import { Source, Layer } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarConfig } from "../../types";
import { createCircleCoords, getGeoPoint } from "./utils/geoHelpers";

interface Props {
  config: RadarConfig;
}

const TARGET_FPS = 60;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const PULSE_CYCLE_MS = 3200;
const WAVE_COUNT = 6;
const WAVE_STEPS = 32;
const PULSE_LINE_COLOR = "#ffffff";

function buildSectorPolygon(
  lat: number,
  lon: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  step = 0.5,
): [number, number][] {
  const coords: [number, number][] = [[lon, lat]];
  for (let angle = startAngle; angle <= endAngle; angle += step) {
    coords.push(getGeoPoint(lat, lon, angle, radius));
  }
  coords.push([lon, lat]);
  return coords;
}

/**
 * Haz de detección del radar como polígono GeoJSON en Mapbox.
 * El sector angular se calcula a partir del azimut, radio y apertura.
 */
export function RadarBeam({ config }: Props) {
  const [phase, setPhase] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);

  const lat = Number(config.latitud);
  const lon = Number(config.longitud);
  const azimut = Number(config.azimut);
  const radio = Number(config.radio);
  const apertura = Number(config.apertura);

  useEffect(() => {
    const animate = (now: number) => {
      if (now - lastFrameTimeRef.current >= FRAME_INTERVAL_MS) {
        setPhase((now % PULSE_CYCLE_MS) / PULSE_CYCLE_MS);
        lastFrameTimeRef.current = now;
      }

      rafIdRef.current = window.requestAnimationFrame(animate);
    };

    rafIdRef.current = window.requestAnimationFrame((now) => {
      lastFrameTimeRef.current = now;
      setPhase((now % PULSE_CYCLE_MS) / PULSE_CYCLE_MS);
      rafIdRef.current = window.requestAnimationFrame(animate);
    });

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const aperturaGrados = useMemo(
    () => 2 * Math.atan(apertura / 2 / radio) * (180 / Math.PI),
    [apertura, radio],
  );

  const beamData = useMemo(() => {
    const startAngle = azimut - aperturaGrados / 2;
    const endAngle = azimut + aperturaGrados / 2;

    const beamData = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              buildSectorPolygon(lat, lon, startAngle, endAngle, radio),
            ],
          },
          properties: { kind: "main" },
        },
      ],
    };

    return beamData;
  }, [lat, lon, azimut, radio, aperturaGrados]);

  const pulseData = useMemo(() => {
    const pulseFeatures = Array.from({ length: WAVE_COUNT }, (_, i) => {
      const shifted = (phase + i / WAVE_COUNT) % 1;
      const radius = Math.max(1, shifted * radio);
      const opacity = 0.34 * (1 - shifted);
      const width = 2 - shifted * 0.8;

      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: createCircleCoords(lat, lon, radius, WAVE_STEPS),
        },
        properties: {
          opacity,
          width,
        },
      };
    });

    return {
      type: "FeatureCollection" as const,
      features: pulseFeatures,
    };
  }, [lat, lon, radio, phase]);

  const rangeData = useMemo(() => {
    const rangeCircle = createCircleCoords(lat, lon, radio);
    const aperturaGrados =
      2 * Math.atan(apertura / 2 / radio) * (180 / Math.PI);
    const startAngle = azimut - aperturaGrados / 2;
    const endAngle = azimut + aperturaGrados / 2;

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [rangeCircle],
          },
          properties: { kind: "range" },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [lon, lat],
              getGeoPoint(lat, lon, startAngle, radio),
              [lon, lat],
              getGeoPoint(lat, lon, endAngle, radio),
            ],
          },
          properties: { kind: "limits" },
        },
      ],
    };
  }, [lat, lon, azimut, radio, apertura]);

  const rangeFillLayer = {
    id: "radar-range-fill",
    type: "fill" as const,
    filter: ["==", ["get", "kind"], "range"] as unknown as FilterSpecification,
    paint: {
      "fill-color": "#065f46",
      "fill-opacity": 0.09,
    },
  };

  const rangeLimitLayer = {
    id: "radar-range-limits",
    type: "line" as const,
    filter: ["==", ["get", "kind"], "limits"] as unknown as FilterSpecification,
    paint: {
      "line-color": "#34d399",
      "line-width": 1.2,
      "line-opacity": 0.35,
      "line-dasharray": [2, 8],
    },
  };

  const fillLayer = {
    id: "radar-beam-fill",
    type: "fill" as const,
    filter: ["==", ["get", "kind"], "main"] as unknown as FilterSpecification,
    paint: { "fill-color": "#10b981", "fill-opacity": 0.32 },
  };

  const lineLayer = {
    id: "radar-beam-line",
    type: "line" as const,
    filter: ["==", ["get", "kind"], "main"] as unknown as FilterSpecification,
    paint: { "line-color": "#34d399", "line-width": 1, "line-opacity": 1 },
  };

  const pulseLayer = {
    id: "radar-pulse-line",
    type: "line" as const,
    paint: {
      "line-color": PULSE_LINE_COLOR,
      "line-width": ["get", "width"] as unknown as number,
      "line-opacity": ["get", "opacity"] as unknown as number,
      "line-blur": 1,
    },
  };

  return (
    <>
      <Source id="radar-range" type="geojson" data={rangeData}>
        <Layer {...rangeFillLayer} />
        <Layer {...rangeLimitLayer} />
      </Source>

      <Source id="radar-beam" type="geojson" data={beamData}>
        <Layer {...fillLayer} />
        <Layer {...lineLayer} />
      </Source>

      <Source id="radar-pulse" type="geojson" data={pulseData}>
        <Layer {...pulseLayer} />
      </Source>
    </>
  );
}
