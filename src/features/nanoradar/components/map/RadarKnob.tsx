import { useRef, useCallback } from "react";

const SIZE = 156;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 70;
const CONTENT_R = 60;
const HANDLE_R = 5.5;

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
  const scaleX = SIZE / rect.width;
  const scaleY = SIZE / rect.height;
  const dx = (clientX - rect.left) * scaleX - CX;
  const dy = (clientY - rect.top) * scaleY - CY;
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle) % 360;
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      isDragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (svgRef.current) {
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

  // Tick marks every 10°
  const ticks: React.ReactNode[] = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const isCardinal = deg % 90 === 0;
    const isMajor = deg % 30 === 0;
    const tickLen = isCardinal ? 9 : isMajor ? 5 : 3;
    const outer = polarToXY(OUTER_R, deg);
    const inner = polarToXY(OUTER_R - tickLen, deg);
    ticks.push(
      <line
        key={deg}
        x1={outer.x.toFixed(2)}
        y1={outer.y.toFixed(2)}
        x2={inner.x.toFixed(2)}
        y2={inner.y.toFixed(2)}
        stroke={isCardinal ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.14)"}
        strokeWidth={isCardinal ? 1.5 : 0.8}
      />,
    );
  }

  const cardinalLabels = [
    { deg: 0, label: "N" },
    { deg: 90, label: "E" },
    { deg: 180, label: "S" },
    { deg: 270, label: "O" },
  ];

  // Scale radio to fit inside content circle
  const radioFrac =
    maxRadio > 0 ? Math.min(Math.max(radio / maxRadio, 0), 1) : 0.5;
  const radioR = Math.max(12, CONTENT_R * radioFrac);

  const sectorD = makeSectorPath(radioR, grado, apertura);
  const lineEnd = polarToXY(radioR, grado);
  const handle = polarToXY(OUTER_R - 8, grado);

  const radioLabel =
    radio >= 1000 ? `${(radio / 1000).toFixed(1)}km` : `${radio}m`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex w-full justify-center px-1 text-[9px] font-semibold uppercase tracking-widest text-text-10">
        <span>Radio</span>
      </div>

      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ userSelect: "none" }}
      >
        <circle
          cx={CX}
          cy={CY}
          r={OUTER_R}
          fill="rgba(0,15,8,0.9)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={0.5}
        />

        {([0.33, 0.66] as const).map((f) => {
          const r = CONTENT_R * f;
          const rangeVal = Math.round(maxRadio * f);
          const lp = polarToXY(r - 5, 135);
          return (
            <g key={f}>
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text
                x={lp.x.toFixed(1)}
                y={lp.y.toFixed(1)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,1)"
                fontSize={5.5}
                fontFamily="monospace"
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
          r={CONTENT_R}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1}
        />

        <path
          d={sectorD}
          fill={accentColor + "22"}
          stroke={accentColor + "55"}
          strokeWidth={1}
        />

        <line
          x1={CX}
          y1={CY}
          x2={lineEnd.x.toFixed(2)}
          y2={lineEnd.y.toFixed(2)}
          stroke={accentColor}
          strokeWidth={1.5}
          strokeOpacity={0.88}
        />

        {ticks}

        {cardinalLabels.map(({ deg, label }) => {
          const pos = polarToXY(OUTER_R - 15, deg);
          return (
            <text
              key={deg}
              x={pos.x.toFixed(2)}
              y={pos.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,1)"
              fontSize={7.5}
              fontFamily="monospace"
            >
              {label}
            </text>
          );
        })}

        <circle
          cx={handle.x.toFixed(2)}
          cy={handle.y.toFixed(2)}
          r={HANDLE_R + 3}
          fill={accentColor + "18"}
        />
        <circle
          cx={handle.x.toFixed(2)}
          cy={handle.y.toFixed(2)}
          r={HANDLE_R}
          fill={accentColor}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={1.2}
        />

        <circle
          cx={CX}
          cy={CY}
          r={18}
          fill="rgba(0,0,0,0.5)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />

        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.92)"
          fontSize={12}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {grado}°
        </text>

        <text
          x={CX}
          y={CY + 30}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={accentColor + "99"}
          fontSize={9.5}
          fontWeight="bold"
        >
          {radioLabel}
        </text>

        <rect
          x={0}
          y={0}
          width={SIZE}
          height={SIZE}
          fill="transparent"
          style={{ cursor: "crosshair", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </svg>

      <p className="text-xs text-text-100/22 italic select-none">
        arrastra para girar · apertura {apertura}°
      </p>
    </div>
  );
}
