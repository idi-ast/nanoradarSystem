import { useEffect, useMemo, useRef, useState } from "react";
import { Source, Layer } from "react-map-gl";
import type { FilterSpecification } from "mapbox-gl";
import type { RadarConfig } from "../../types";
import { createCircleCoords, getGeoPoint } from "./utils/geoHelpers";
import { useRadarContext } from "../../context/useRadarContext";

interface Props {
  config: RadarConfig;
}

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
  const { instanceConfig } = useRadarContext();
  const { beam, colors } = instanceConfig;
  const id = instanceConfig.id;
  const frameIntervalMs = 1000 / beam.TARGET_FPS;

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
      if (now - lastFrameTimeRef.current >= frameIntervalMs) {
        setPhase((now % beam.PULSE_CYCLE_MS) / beam.PULSE_CYCLE_MS);
        lastFrameTimeRef.current = now;
      }
      rafIdRef.current = window.requestAnimationFrame(animate);
    };

    rafIdRef.current = window.requestAnimationFrame((now) => {
      lastFrameTimeRef.current = now;
      setPhase((now % beam.PULSE_CYCLE_MS) / beam.PULSE_CYCLE_MS);
      rafIdRef.current = window.requestAnimationFrame(animate);
    });

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [beam.PULSE_CYCLE_MS, frameIntervalMs]);

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
      beam.GRADIENT_STEPS,
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
  }, [lat, lon, azimut, radio, aperturaGrados, beam.GRADIENT_STEPS]);

  const pulseData = useMemo(() => {
    const pulseFeatures = Array.from({ length: beam.WAVE_COUNT }, (_, i) => {
      const shifted = (phase + i / beam.WAVE_COUNT) % 1;
      const radius = Math.max(1, shifted * radio);
      const opacity = 0.64 * (1 - shifted);
      const width = 4 - shifted * 0.6;

      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: createCircleCoords(lat, lon, radius, beam.WAVE_STEPS),
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
  }, [lat, lon, radio, phase, beam.WAVE_COUNT, beam.WAVE_STEPS]);

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
    id: `radar-range-fill-${id}`,
    type: "fill" as const,
    filter: ["==", ["get", "kind"], "range"] as unknown as FilterSpecification,
    paint: {
      "fill-color": colors.rangeFill,
      "fill-opacity": colors.rangeFillOpacity,
    },
  };

  const rangeLimitLayer = {
    id: `radar-range-limits-${id}`,
    type: "line" as const,
    filter: ["==", ["get", "kind"], "limits"] as unknown as FilterSpecification,
    paint: {
      "line-color": colors.rangeLimits,
      "line-width": 1,
      "line-opacity": 0.48,
      "line-dasharray": [2, 6],
    },
  };

  const fillLayer = {
    id: `radar-beam-fill-${id}`,
    type: "fill" as const,
    filter: [
      "==",
      ["get", "kind"],
      "main-gradient",
    ] as unknown as FilterSpecification,
    paint: {
      "fill-color": colors.primary,
      "fill-opacity": ["get", "opacity"] as unknown as number,
    },
  };

  const lineLayer = {
    id: `radar-beam-line-${id}`,
    type: "line" as const,
    filter: [
      "==",
      ["get", "kind"],
      "main-line",
    ] as unknown as FilterSpecification,
    paint: {
      "line-color": colors.primary,
      "line-width": 2,
      "line-opacity": colors.beamOpacity,
    },
  };

  const pulseLayer = {
    id: `radar-pulse-line-${id}`,
    type: "line" as const,
    paint: {
      "line-color": colors.pulse,
      "line-width": ["get", "width"] as unknown as number,
      "line-opacity": ["get", "opacity"] as unknown as number,
      "line-blur": 1,
    },
  };

  return (
    <>
      <Source id={`radar-range-${id}`} type="geojson" data={rangeData}>
        <Layer {...rangeFillLayer} />
        <Layer {...rangeLimitLayer} />
      </Source>

      <Source id={`radar-beam-${id}`} type="geojson" data={beamData}>
        <Layer {...fillLayer} />
        <Layer {...lineLayer} />
      </Source>

      <Source id={`radar-pulse-${id}`} type="geojson" data={pulseData}>
        <Layer {...pulseLayer} />
      </Source>
    </>
  );
}

