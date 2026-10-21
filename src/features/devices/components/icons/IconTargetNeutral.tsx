import type { ComponentType } from "react";

export interface IconTargetNeutralProps {
  size?: number;
  stroke?: number;
  className?: string;
  color?: string;
}

/**
 * Icono táctico neutro para contactos de radar no clasificados o genéricos (C2 Radar Blip).
 * Diseño geométrico limpio con círculo exterior concéntrico, punto central sólido
 * y guías tácticas de mira de radar, sin sugerir ninguna forma física (barco, persona, etc.).
 */
export const IconTargetNeutral: ComponentType<IconTargetNeutralProps> = ({
  size = 20,
  stroke = 2,
  className = "",
  color = "currentColor",
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Círculo exterior semitransparente */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth={stroke}
        strokeOpacity="0.8"
      />
      {/* Punto central sólido */}
      <circle cx="12" cy="12" r="3.5" fill={color} />
      {/* Guías tácticas de mira de radar (STANAG / C2 standard) */}
      <line
        x1="12"
        y1="1.5"
        x2="12"
        y2="4"
        stroke={color}
        strokeWidth={Math.max(1.2, stroke * 0.75)}
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <line
        x1="12"
        y1="20"
        x2="12"
        y2="22.5"
        stroke={color}
        strokeWidth={Math.max(1.2, stroke * 0.75)}
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <line
        x1="1.5"
        y1="12"
        x2="4"
        y2="12"
        stroke={color}
        strokeWidth={Math.max(1.2, stroke * 0.75)}
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <line
        x1="20"
        y1="12"
        x2="22.5"
        y2="12"
        stroke={color}
        strokeWidth={Math.max(1.2, stroke * 0.75)}
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
    </svg>
  );
};

export default IconTargetNeutral;
