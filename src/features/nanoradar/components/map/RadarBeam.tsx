import { useEffect, useMemo, useRef, useState } from "react";
import { Source, Layer } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarConfig } from "../../types";
import { createCircleCoords, getGeoPoint } from "./utils/geoHelpers";

interface Props {
  config: RadarConfig;
}

const TARGET_FPS = 60;
const FRAME_INTERVAL_MS = 100 / TARGET_FPS;
const PULSE_CYCLE_MS = 9000;
const WAVE_COUNT = 7;
const WAVE_STEPS = 8;
const PULSE_LINE_COLOR = "#67e8f9";

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

function buildGradientPolygons(
  lat: number,
  lon: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  steps = 5,
) {
  return Array.from({ length: steps }, (_, i) => {
    const outerP = buildSectorPolygon(
      lat,
      lon,
      startAngle,
      endAngle,
      radius - (radius / steps) * i,
    );

    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [outerP],
      },
      properties: {
        kind: "main-gradient",
        opacity: 0.2 - i * (0.1 / steps), // Fuerte en el centro, se desvanece
      },
    };
  });
}


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

    const fillFeatures = buildGradientPolygons(
      lat,
      lon,
      startAngle,
      endAngle,
      radio,
      6,
    );

    // Feature solo para la línea del borde
    const frameFeature = {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          buildSectorPolygon(lat, lon, startAngle, endAngle, radio),
        ],
      },
      properties: { kind: "main-line" },
    };

    return {
      type: "FeatureCollection" as const,
      features: [...fillFeatures, frameFeature],
    };
  }, [lat, lon, azimut, radio, aperturaGrados]);

  const pulseData = useMemo(() => {
    const pulseFeatures = Array.from({ length: WAVE_COUNT }, (_, i) => {
      const shifted = (phase + i / WAVE_COUNT) % 1;
      const radius = Math.max(1, shifted * radio);
      const opacity = 0.64 * (1 - shifted);
      const width = 4 - shifted * 0.6;

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
      "fill-color": "#1f172a",
      "fill-opacity": 0.3,
      
      
    },
  };
  

  const rangeLimitLayer = {
    id: "radar-range-limits",
    type: "line" as const,
    filter: ["==", ["get", "kind"], "limits"] as unknown as FilterSpecification,
    paint: {
      "line-color": "#2dd4bf",
      "line-width": 1,
      "line-opacity": 0.48,
      "line-dasharray": [2, 6],
    },
  };

  const fillLayer = {
    id: "radar-beam-fill",
    type: "fill" as const,
    filter: [
      "==",
      ["get", "kind"],
      "main-gradient",
    ] as unknown as FilterSpecification,
    paint: {
      "fill-color": "#14b8a6",
      "fill-opacity": ["get", "opacity"] as unknown as number,
    },
  };

  const lineLayer = {
    id: "radar-beam-line",
    type: "line" as const,
    filter: [
      "==",
      ["get", "kind"],
      "main-line",
    ] as unknown as FilterSpecification,
    paint: {
      "line-color": "#5eead4",
      "line-width": 2,
      "line-opacity": 0.92,
    },
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
