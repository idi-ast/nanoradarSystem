import { memo, type ReactNode, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  text: string;
  children: ReactNode;
  side?: "left" | "right" | "top" | "bottom";
}

function getTooltipStyle(
  rect: DOMRect,
  side: NonNullable<TooltipProps["side"]>,
): React.CSSProperties {
  const gap = 8;
  switch (side) {
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: "translateY(-50%)",
      };
    case "top":
      return {
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      };
  }
}

export const Tooltip = memo(function Tooltip({ text, children, side = "left" }: TooltipProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});

  function handleMouseEnter() {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setStyle(getTooltipStyle(rect, side));
    setVisible(true);
  }

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            style={{ position: "fixed", zIndex: 99999, ...style }}
            className="pointer-events-none whitespace-nowrap rounded-md bg-bg-400 border border-border px-2 py-1 text-[10px] font-medium text-text-400 shadow-lg"
          >
            {text}
          </div>,
          document.body,
        )}
    </div>
  );
});
