import { useRef, useCallback, useEffect } from "react";


const SIZE = 174;
const CX = SIZE / 2;
const CY = SIZE / 2;

export const KNOB_CONFIG = {
  size: SIZE,
  outerRadius: 48,
  contentRadius: 32,
  handleRadius: 9.5,
  centerDragRadius: 25, // Radio central donde se arrastra el mapa en lugar del knob
  centerHubRadius: 20,

  colors: {
    bgDial: "rgba(0, 0, 0, 0.66)", // Fondo principal del radar
    bgDialBorder: "#00c2fdff", // Borde exterior

    // Grilla
    gridDashed: "rgba(207, 255, 164, 1)", // Anillos punteados
    gridText: "rgba(255, 255, 255, 1)", // Texto de distancia

    // Marcas de grados (Ticks)
    tickMajor: "rgba(0, 208, 255, 1)",
    tickMinor: "rgba(0, 221, 255, 1)",
    cardinalText: "rgba(255, 255, 255, 0.95)",

    // Centro (Hub)
    hubBorder: "rgba(255, 255, 255, 0.2)",
    hubText: "rgba(255, 255, 255, 0.95)",
    hubDot: "rgba(255, 255, 255, 0.4)",
  },

  // Grosores
  strokeWidths: {
    dialBorder: 1,
    tickMajor: 2.5,
    tickMinor: 1,
  }
};


function polarToXY(r: number, azimutDeg: number) {
  const rad = ((azimutDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function makeSectorPath(r: number, azimut: number, apertura: number): string {
  const ap = Math.max(1, Math.min(apertura, 359.9));
  if (ap >= 359) {
    return `M ${CX} ${(CY - r).toFixed(2)} A ${r} ${r} 0 1 1 ${(CX - 0.01).toFixed(2)} ${(CY - r).toFixed(2)} Z`;
  }
  const halfAp = ap / 2;
  const p1 = polarToXY(r, azimut - halfAp);
  const p2 = polarToXY(r, azimut + halfAp);
  const largeArc = ap > 180 ? 1 : 0;
  return [
    `M ${CX} ${CY}`,
    `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function getAngleFromPointer(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number,
): number {
  const rect = svgEl.getBoundingClientRect();
  const scaleX = KNOB_CONFIG.size / rect.width;
  const scaleY = KNOB_CONFIG.size / rect.height;
  const dx = (clientX - rect.left) * scaleX - CX;
  const dy = (clientY - rect.top) * scaleY - CY;
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle) % 360;
}

function getDistanceFromPointer(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number,
): number {
  const rect = svgEl.getBoundingClientRect();
  const scaleX = KNOB_CONFIG.size / rect.width;
  const scaleY = KNOB_CONFIG.size / rect.height;
  const dx = (clientX - rect.left) * scaleX - CX;
  const dy = (clientY - rect.top) * scaleY - CY;
  return Math.sqrt(dx * dx + dy * dy);
}


interface RadarKnobProps {
  grado: number;
  apertura: number;
  radio: number;
  maxRadio?: number;
  accentColor?: string;
  onGradoChange: (v: number) => void;
}

export function RadarKnob({
  grado,
  apertura,
  radio,
  maxRadio = 10000,
  accentColor = "#22c55e",
  onGradoChange,
}: RadarKnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    // Detenemos la propagación de eventos NATIVOS en los bordes para ocultar el click a Mapbox.
    const stopMapDragOnEdge = (e: MouseEvent | TouchEvent) => {
      const isTouch = e.type === "touchstart";
      const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const distance = getDistanceFromPointer(el, clientX, clientY);

      if (distance >= KNOB_CONFIG.centerDragRadius) {
        // Bloqueamos la propagación nativa. Mapbox no detectará este click.
        e.stopPropagation();
      }
    };

    el.addEventListener("mousedown", stopMapDragOnEdge);
    el.addEventListener("touchstart", stopMapDragOnEdge, { passive: false });

    return () => {
      el.removeEventListener("mousedown", stopMapDragOnEdge);
      el.removeEventListener("touchstart", stopMapDragOnEdge);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (svgRef.current) {
        const distance = getDistanceFromPointer(svgRef.current, e.clientX, e.clientY);

        // Zona muerta central (drag del marker en el mapa, ignora rotación)
        if (distance < KNOB_CONFIG.centerDragRadius) {
          return;
        }

        isDragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onGradoChange(
          getAngleFromPointer(svgRef.current, e.clientX, e.clientY),
        );
      }
    },
    [onGradoChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!isDragging.current || !svgRef.current) return;
      onGradoChange(getAngleFromPointer(svgRef.current, e.clientX, e.clientY));
    },
    [onGradoChange],
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const ticks: React.ReactNode[] = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const isCardinal = deg % 90 === 0;
    const isMajor = deg % 30 === 0;
    const tickLen = isCardinal ? 10 : isMajor ? 6 : 4;
    const outer = polarToXY(KNOB_CONFIG.outerRadius, deg);
    const inner = polarToXY(KNOB_CONFIG.outerRadius - tickLen, deg);
    ticks.push(
      <line
        key={deg}
        x1={outer.x.toFixed(2)}
        y1={outer.y.toFixed(2)}
        x2={inner.x.toFixed(2)}
        y2={inner.y.toFixed(2)}
        stroke={isCardinal ? KNOB_CONFIG.colors.tickMajor : KNOB_CONFIG.colors.tickMinor}
        strokeWidth={isCardinal ? KNOB_CONFIG.strokeWidths.tickMajor : KNOB_CONFIG.strokeWidths.tickMinor}
        strokeLinecap="round"
      />,
    );
  }

  const cardinalLabels = [
    { deg: 0, label: "N" },
    { deg: 90, label: "E" },
    { deg: 180, label: "S" },
    { deg: 270, label: "O" },
  ];

  const radioFrac =
    maxRadio > 0 ? Math.min(Math.max(radio / maxRadio, 0), 1) : 0.5;
  const radioR = Math.max(14, KNOB_CONFIG.contentRadius * radioFrac);

  const sectorD = makeSectorPath(radioR, grado, apertura);
  const lineEnd = polarToXY(radioR, grado);
  const handle = polarToXY(KNOB_CONFIG.outerRadius - 8, grado);

  const radioLabel =
    radio >= 1000 ? `${(radio / 1000).toFixed(1)}km` : `${radio}m`;

  return (
    <div className="flex flex-col items-center gap-2 drop-shadow-2xl">
      {/* Etiqueta superior */}
      <div className="flex w-full justify-center px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/50 bg-black/40 rounded-full py-0.5 max-w-max backdrop-blur-md border border-white/5 mx-auto">
        <span className="px-2">Orientación Y Cobertura</span>
      </div>

      <svg
        ref={svgRef}
        width={KNOB_CONFIG.size}
        height={KNOB_CONFIG.size}
        viewBox={`0 0 ${KNOB_CONFIG.size} ${KNOB_CONFIG.size}`}
        style={{ userSelect: "none" }}
        className="overflow-visible"
      >
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(30, 40, 45, 0.9)" />
            <stop offset="80%" stopColor="rgba(15, 20, 25, 0.95)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 1)" />
          </radialGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={KNOB_CONFIG.outerRadius}
          fill={KNOB_CONFIG.colors.bgDial}
          stroke={KNOB_CONFIG.colors.bgDialBorder}
          strokeWidth={KNOB_CONFIG.strokeWidths.dialBorder}
          style={{ backdropFilter: "blur(4px)" }} // Efecto glassmorphism
        />

        {([0.33, 0.66] as const).map((f) => {
          const r = KNOB_CONFIG.contentRadius * f;
          const rangeVal = Math.round(maxRadio * f);
          const lp = polarToXY(r - 5, 135);
          return (
            <g key={f}>
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={KNOB_CONFIG.colors.gridDashed}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              <text
                x={lp.x.toFixed(1)}
                y={lp.y.toFixed(1)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={KNOB_CONFIG.colors.gridText}
                fontSize={5.5}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                className="opacity-80"
              >
                {rangeVal >= 1000
                  ? `${(rangeVal / 1000).toFixed(1)}k`
                  : rangeVal}
              </text>
            </g>
          );
        })}

        <circle
          cx={CX}
          cy={CY}
          r={KNOB_CONFIG.contentRadius}
          fill="none"
          stroke={KNOB_CONFIG.colors.gridDashed}
          strokeWidth={1}
        />

        <path
          d={sectorD}
          fill={accentColor + "2A"} // Fill transparente
          stroke={accentColor + "80"} // Borde ligeramente opaco
          strokeWidth={1.2}
          strokeLinejoin="round"
        />

        <line
          x1={CX}
          y1={CY}
          x2={lineEnd.x.toFixed(2)}
          y2={lineEnd.y.toFixed(2)}
          stroke={accentColor}
          strokeWidth={2}
          strokeOpacity={0.9}
        />

        {ticks}

        {cardinalLabels.map(({ deg, label }) => {
          const pos = polarToXY(KNOB_CONFIG.outerRadius + 10, deg);
          return (
            <text
              key={deg}
              x={pos.x.toFixed(2)}
              y={pos.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={KNOB_CONFIG.colors.cardinalText}
              fontSize={17}
              fontWeight="semibold"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label}
            </text>
          );
        })}

        <g filter="url(#neonGlow)">
          <circle
            cx={handle.x.toFixed(2)}
            cy={handle.y.toFixed(2)}
            r={KNOB_CONFIG.handleRadius + 3}
            fill={accentColor + "18"}
          />
          <circle
            cx={handle.x.toFixed(2)}
            cy={handle.y.toFixed(2)}
            r={KNOB_CONFIG.handleRadius}
            fill={accentColor}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1.5}
          />
        </g>

        <g style={{ cursor: "grab" }}>
          <circle
            cx={CX}
            cy={CY}
            r={KNOB_CONFIG.centerHubRadius}
            fill="url(#hubGradient)"
            stroke={KNOB_CONFIG.colors.hubBorder}
            strokeWidth={1.5}
          />
          {/* Anillo de detalle interno */}
          <circle
            cx={CX}
            cy={CY}
            r={KNOB_CONFIG.centerHubRadius - 4}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            strokeDasharray="1 2"
          />
          {/* Punto exacto del centro */}
          <circle
            cx={CX}
            cy={CY}
            r={1.5}
            fill={KNOB_CONFIG.colors.hubDot}
          />

          {/* Texto Central: Grados */}
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={KNOB_CONFIG.colors.hubText}
            fontSize={12}
            fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
            fontWeight="bold"
            letterSpacing="0.05em"
          >
            {grado}°
          </text>
        </g>

        {/* Texto Inferior: Distancia actual (flotante) */}
        <text
          x={CX}
          y={CY + 29}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={"white"}
          fontSize={12}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
        >
          {radioLabel}
        </text>

        <rect
          x={0}
          y={0}
          width={KNOB_CONFIG.size}
          height={KNOB_CONFIG.size}
          fill="transparent"
          style={{ cursor: "crosshair", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </svg>

      <div className="flex bg-black/40 px-2.5 py-1 rounded-md border border-white/5 backdrop-blur-sm shadow-xl">
        <p className="text-[10px] text-white/40 tracking-wide select-none">
          Borde: <strong className="text-white/60">Girar</strong> · Centro: <strong className="text-white/60">Arrastrar</strong>
        </p>
      </div>
    </div>
  );
}
