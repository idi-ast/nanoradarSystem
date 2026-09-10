import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDraggable, dragTransform } from "@/hooks/useDraggable";
import { useRadarContext } from "../../../context/useRadarContext";
import { ZoneDrawingPanel } from "../../panel/ZoneDrawingPanel";
import {
  IconCircleX,
  IconHexagonLetterZ,
  IconMapPinX,
} from "@tabler/icons-react";
import { Tooltip } from "@/components/ui";
import ConfigZones from "./ConfigZones";
import ConfigRadar from "./ConfigRadar";
import ConfigTargets from "./ConfigTargets";
import PtzCalibrationMenu from "../PtzCalibrationMenu";
import { useMapPanel } from "../MapPanelContext";
import { useRole } from "@/context/role/hooks/useRole";
import { useBreakpoint } from "@/hooks/useBreakpoints";

const ClearTargetsButton = memo(function ClearTargetsButton() {
  const { clearTargets } = useRadarContext();
  return (
    <Tooltip text="Limpiar Tracks">
      <button
        onClick={clearTargets}
        className="h-10 w-10 flex justify-center items-center rounded bg-brand-100 text-text-100 hover:bg-brand-100 transition-colors"
      >
        <IconMapPinX size={20} stroke={2} />
      </button>
    </Tooltip>
  );
});

export const ZonesPanel = memo(function ZonesPanel() {
  const { isDrawing, startDrawing, cancelDrawing } = useRadarContext();
  const { activePanel, openPanel, closePanel } = useMapPanel();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const {
    delta,
    reset: resetDrag,
    dragHandleProps,
  } = useDraggable({ enabled: isDrawing, containerRef: panelRef });

  // When another panel opens, cancel drawing automatically
  useEffect(() => {
    if (isDrawing && activePanel !== "drawing") {
      cancelDrawing();
    }
  }, [activePanel, isDrawing, cancelDrawing]);

  const handleDrawToggle = () => {
    if (isDrawing) {
      cancelDrawing();
      closePanel("drawing");
    } else {
      startDrawing();
      openPanel("drawing");
    }
  };

  useEffect(() => {
    if (!isDrawing || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPanelStyle({
        top: rect.top,
        right: window.innerWidth - rect.left + 10,
      });
      resetDrag();
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [isDrawing, resetDrag]);
  const { isSuperAdmin, isAdmin } = useRole();
  const { isDesktop } = useBreakpoint();

  return (
    <div className="flex flex-col border-b border-border gap-1 pb-1">
      {(isSuperAdmin || isAdmin) && <ClearTargetsButton />}
      <ConfigZones />
      {(isDesktop && isAdmin) || isSuperAdmin || isAdmin ? (
        <PtzCalibrationMenu />
      ) : null}

      <ConfigRadar />
      <ConfigTargets />
      {(isSuperAdmin || isAdmin) && (
        <Tooltip text={isDrawing ? "Cancelar zona" : "Crear zona"}>
          <button
            ref={triggerRef}
            onClick={handleDrawToggle}
            className={`h-10 w-10 flex justify-center items-center rounded text-text-100 transition-colors ${
              isDrawing
                ? "border border-brand-100 hover:border-red-600"
                : "border border-transparent bg-bg-300 hover:bg-emerald-700"
            }`}
          >
            {isDrawing ? (
              <IconCircleX size={20} stroke={2} className="text-red-600" />
            ) : (
              <IconHexagonLetterZ size={20} stroke={2} />
            )}
          </button>
        </Tooltip>
      )}

      {isDrawing &&
        createPortal(
          <div
            ref={panelRef}
            {...dragHandleProps}
            style={{
              position: "fixed",
              top: panelStyle.top,
              right: panelStyle.right,
              ...dragTransform(delta),
              touchAction: "none",
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <ZoneDrawingPanel />
          </div>,
          document.body,
        )}
    </div>
  );
});
