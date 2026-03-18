import React, { memo, useCallback } from "react";
import {
  Icon3dCubeSphere,
  IconCompass,
  IconRefresh,
  IconMapMinus,
} from "@tabler/icons-react";
import type { ViewControlsProps } from "../types";
import LineGradientWhite from "@/components/ui/LineGradientWhite";

const ViewControls: React.FC<ViewControlsProps> = memo(function ViewControls({
  mapRef,
  initialCenter,
  initialZoom,
}) {
  const setTopView = useCallback(() => {
    mapRef.current?.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });
  }, [mapRef]);

  const set3DView = useCallback(() => {
    mapRef.current?.easeTo({
      pitch: 60,
      duration: 1000,
    });
  }, [mapRef]);

  const resetNorth = useCallback(() => {
    mapRef.current?.easeTo({
      bearing: 0,
      duration: 800,
    });
  }, [mapRef]);

  const resetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialZoom,
      pitch: 0,
      bearing: 0,
      duration: 1500,
    });
  }, [mapRef, initialCenter, initialZoom]);

  return (
    <div className="flex gap-1">
      <div className="relative ">
        <LineGradientWhite top="-0.01rem" height="0.5rem" color={"white"} />
        <button
          onClick={setTopView}
          className="relative text-text-400 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-400 to-bg-450  rounded-lg shadow shadow-bg-400 h-8 w-8 flex justify-center items-center transition-all"
          title="Vista superior (2D)"
        >
          <IconMapMinus size={20} />
        </button>
      </div>
      <div className="relative ">
        <LineGradientWhite top="-0.01rem" height="0.5rem" color={"white"} />
        <button
          onClick={set3DView}
          className="relative text-text-400 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-400 to-bg-450  rounded-lg shadow shadow-bg-400 h-8 w-8 flex justify-center items-center transition-all"
          title="Vista 3D"
        >
          <Icon3dCubeSphere size={20} />
        </button>
      </div>
      <div className="relative ">
        <LineGradientWhite top="-0.01rem" height="0.5rem" color={"white"} />
        <button
          onClick={resetNorth}
          className="relative text-text-400 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-400 to-bg-450  rounded-lg shadow shadow-bg-400 h-8 w-8 flex justify-center items-center transition-all"
          title="Orientar al norte"
        >
          <IconCompass size={20} />
        </button>
      </div>
      <div className="relative ">
        <LineGradientWhite top="-0.01rem" height="0.5rem" color={"white"} />
        <button
          onClick={resetView}
          className="relative text-text-400 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-400 to-bg-450  rounded-lg shadow shadow-bg-400 h-8 w-8 flex justify-center items-center transition-all"
          title="Resetear vista"
        >
          <IconRefresh size={20} />
        </button>
      </div>
    </div>
  );
});

export default ViewControls;
