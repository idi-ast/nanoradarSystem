import { memo } from "react";
import { useRadarContext } from "../../../context/useRadarContext";
import { ZoneDrawingPanel } from "../../panel/ZoneDrawingPanel";
import {
  IconCircleX,
  IconHexagonLetterZ,
  IconMapPinX,
} from "@tabler/icons-react";

const ClearTargetsButton = memo(function ClearTargetsButton() {
  const { clearTargets } = useRadarContext();
  return (
    <button
      onClick={clearTargets}
      className="h-8 w-8 flex justify-center items-center   rounded bg-bg-300 text-text-100 hover:bg-brand-100 transition-colors"
    >
      <IconMapPinX size={20} stroke={1.5} />
    </button>
  );
});

export const ZonesPanel = memo(function ZonesPanel() {
  const { isDrawing, startDrawing, cancelDrawing } = useRadarContext();

  return (
    <div className="flex flex-col  overflow-hidden">
      <div className=" border-b border-border flex flex-col gap-1">
        <ClearTargetsButton />
        <button
          onClick={isDrawing ? cancelDrawing : startDrawing}
          className={`h-8 w-8 flex justify-center items-center  rounded  text-white transition-colors ${
            isDrawing
              ? "border border-brand-100 hover:border-red-600"
              : "border border-transparent bg-bg-300 hover:bg-emerald-700"
          }`}
        >
          {isDrawing ? (
            <IconCircleX size={20} stroke={1.5} className={isDrawing ? "text-red-600" : "text-white"} />
          ) : (
            <IconHexagonLetterZ size={20} stroke={1.5} />
          )}
        </button>
      </div>

      {isDrawing && (
        <div className="shrink-0">
          <ZoneDrawingPanel />
        </div>
      )}
    </div>
  );
});
