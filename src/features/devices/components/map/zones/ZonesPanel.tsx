import { memo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { useMapPanel } from "../MapPanelContext";

const ClearTargetsButton = memo(function ClearTargetsButton() {
  const { clearTargets } = useRadarContext();
  return (
    <Tooltip text="Limpiar Tracks">
      <button
        onClick={clearTargets}
        className="h-10 w-10 flex justify-center items-center rounded bg-bg-300 text-text-100 hover:bg-brand-100 transition-colors"
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
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

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
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [isDrawing]);

  return (
    <div className="flex flex-col border-b border-border gap-1 pb-1">
      <ClearTargetsButton />
      <ConfigZones />
      <ConfigRadar />
      <ConfigTargets />
      <Tooltip text={isDrawing ? "Cancelar zona" : "Crear zona"}>
        <button
          ref={triggerRef}
          onClick={handleDrawToggle}
          className={`h-10 w-10 flex justify-center items-center rounded text-white transition-colors ${
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

      {isDrawing &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: panelStyle.top,
              right: panelStyle.right,
            }}
          >
            <ZoneDrawingPanel />
          </div>,
          document.body,
        )}
    </div>
  );
});
