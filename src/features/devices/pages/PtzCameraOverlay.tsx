import { memo, useCallback, useState } from "react";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import PtzCamera from "../components/map/cameras/PtzCamera";

const PtzCameraOverlay = memo(function PtzCameraOverlay({
  hiddenPtz,
  onHidePtz,
}: {
  hiddenPtz: Set<number>;
  onHidePtz?: (id: number) => void;
}) {
  const { data } = useConfigDevices();
  const ptzList = data?.data?.ptz;
  const [maximizedIds, setMaximizedIds] = useState<number[]>([]);

  const handleMaximize = useCallback((id: number) => {
    setMaximizedIds((prev) => [...prev, id]);
  }, []);

  const handleMinimize = useCallback((id: number) => {
    setMaximizedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  if (!ptzList || ptzList.length === 0)
    return null;

  return (
    <div className="flex flex-col items-start w-full gap-2 z-100 border-t border-border pt-5">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-100/60 border-b border-border-200 pb-1 w-full">
        PTZ ({ptzList.length})
      </h4>
      {ptzList.filter((ptz) => !hiddenPtz.has(ptz.id)).map((ptz) => {
        const stackIndex = maximizedIds.indexOf(ptz.id);
        return (
          <PtzCamera
            key={ptz.id}
            camera={ptz}
            stackIndex={stackIndex >= 0 ? stackIndex : 0}
            onBecomeMaximized={() => handleMaximize(ptz.id)}
            onBecomeMinimized={() => handleMinimize(ptz.id)}
            onClose={onHidePtz ? () => onHidePtz(ptz.id) : undefined}
          />
        );
      })}
    </div>
  );
});

export default PtzCameraOverlay;
