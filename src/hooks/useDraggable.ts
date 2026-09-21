import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface DragDelta {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  /** Si false el arrastre queda deshabilitado */
  enabled?: boolean;
  /** Mantener el elemento dentro del viewport (requiere containerRef) */
  clampToViewport?: boolean;
  /** Mínimo de píxeles que debe quedar visible al clampear */
  clampMargin?: number;
  /** Referencia al elemento que se desplaza, para clampearlo al viewport */
  containerRef?: RefObject<HTMLElement | null>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, [role='button'], [data-no-drag]";

/**
 * Arrastre genérico para paneles/menús flotantes usando Pointer Events
 * (funciona con mouse, dedo y stylus).
 *
 * El panel conserva su anclaje (top/right/left/bottom) original y se desplaza
 * aplicando `transform: translate(delta.x, delta.y)`.
 */
export function useDraggable(options: UseDraggableOptions = {}) {
  const {
    enabled = true,
    clampToViewport = true,
    clampMargin = 12,
    containerRef,
    onDragStart,
    onDragEnd,
  } = options;

  const [delta, setDelta] = useState<DragDelta>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handlersRef = useRef({ onDragStart, onDragEnd });
  useEffect(() => {
    handlersRef.current = { onDragStart, onDragEnd };
  }, [onDragStart, onDragEnd]);

  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    rect: DOMRect | null;
  } | null>(null);

  const reset = useCallback(() => setDelta({ x: 0, y: 0 }), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // No arrastrar cuando se interactúa con un control del panel
      const target = e.target as HTMLElement;
      if (target.closest(INTERACTIVE_SELECTOR)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const base = { x: delta.x, y: delta.y };
      dragRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        baseX: base.x,
        baseY: base.y,
        rect: containerRef?.current?.getBoundingClientRect() ?? null,
      };
      setIsDragging(true);
      handlersRef.current.onDragStart?.();
    },
    [enabled, containerRef, delta],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s?.active) return;
      if (s.pointerId !== e.pointerId) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      let nx = s.baseX + dx;
      let ny = s.baseY + dy;

      if (clampToViewport && s.rect) {
        const margin = clampMargin;
        const anchorLeft = s.rect.left - s.baseX;
        const anchorTop = s.rect.top - s.baseY;
        const minX = margin - anchorLeft;
        const maxX = window.innerWidth - margin - s.rect.width - anchorLeft;
        const minY = margin - anchorTop;
        const maxY = window.innerHeight - margin - s.rect.height - anchorTop;
        nx = Math.min(maxX, Math.max(minX, nx));
        ny = Math.min(maxY, Math.max(minY, ny));
      }

      setDelta({ x: nx, y: ny });
    };

    const onUp = (e: PointerEvent) => {
      if (dragRef.current && dragRef.current.pointerId !== e.pointerId) return;
      dragRef.current = null;
      setIsDragging(false);
      handlersRef.current.onDragEnd?.();
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, clampToViewport, clampMargin]);

  return {
    delta,
    isDragging,
    setDelta,
    reset,
    dragHandleProps: { onPointerDown },
  };
}

/** Aplica el delta como transform de desplazamiento sobre el anclaje original */
export function dragTransform(delta: DragDelta): React.CSSProperties {
  return {
    transform: `translate(${delta.x}px, ${delta.y}px)`,
    willChange: delta.x !== 0 || delta.y !== 0 ? "transform" : undefined,
  };
}