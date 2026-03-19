import React, { useCallback } from "react";
import { IconPlus, IconMinus } from "@tabler/icons-react";
import type { CustomZoomControlProps } from "../types";
import LineGradientWhite from "@/components/ui/LineGradientWhite";

const CustomZoomControl: React.FC<CustomZoomControlProps> = React.memo(
  ({ mapRef }) => {
    const handleZoomIn = useCallback(() => {
      mapRef.current?.zoomIn();
    }, [mapRef]);

    const handleZoomOut = useCallback(() => {
      mapRef.current?.zoomOut();
    }, [mapRef]);

    return (
      <div className="flex gap-1">
        <div className="relative">
          <LineGradientWhite top="-0.01rem" height="0.5rem" color={"white"} />
          <button
            onClick={handleZoomIn}
            className="relative text-text-400 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-400 to-bg-450 rounded-lg  shadow shadow-bg-400 h-8 w-8 flex justify-center items-center transition-all"
            title="Acercar"
          >
            <IconPlus size={20} />
          </button>
        </div>
        <div className="relative">
          <LineGradientWhite top="-0.01rem" height="0.5rem" color={"white"} />
          <button
            onClick={handleZoomOut}
            className="relative text-text-400 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-400 to-bg-450 rounded-lg  shadow shadow-bg-400 h-8 w-8 flex justify-center items-center transition-all"
            title="Alejar"
          >
            <IconMinus size={20} />
          </button>
        </div>
      </div>
    );
  },
);

CustomZoomControl.displayName = "CustomZoomControl";

export default CustomZoomControl;
