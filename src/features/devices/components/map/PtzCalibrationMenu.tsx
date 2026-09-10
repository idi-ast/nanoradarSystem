import { memo } from "react";
import { IconDeviceGamepad3, IconTarget } from "@tabler/icons-react";
import { Tooltip } from "@/components/ui";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { useMapPanel } from "./MapPanelContext";
import { useCameraCalibrationStore } from "../../stores/cameraCalibrationStore";
import { CalibrationPanel } from "./cameras/ptz/components/CalibrationPanel";
import { PtzDpad } from "./cameras/ptz/components/PtzDpad";
import { MapPanelPortal, PanelShell } from "./MapPanelsHost";

/**
 * Opción "Calibración PTZ" del menú del mapa.
 *
 * Se abre dentro del espacio del rightbar. Al elegir una cámara se despliega
 * el panel de calibración como submenú (con botón "volver"), y desde ahí se
 * activa el modo de calibración en el mapa (clic = marcar punto / girar).
 */
export const PtzCalibrationMenu = memo(function PtzCalibrationMenu() {
  const { isOpen, openPanel, closePanel } = useMapPanel();
  const open = isOpen("ptz-calibration");

  const { data } = useConfigDevices();
  const ptzList = data?.data?.ptz ?? [];

  const calibratingCameraId = useCameraCalibrationStore(
    (s) => s.calibratingCameraId,
  );
  const lastResult = useCameraCalibrationStore((s) => s.lastResult);
  const calibrationMode = useCameraCalibrationStore((s) => s.mode);
  const startCalibrating = useCameraCalibrationStore((s) => s.startCalibrating);
  const stopCalibrating = useCameraCalibrationStore((s) => s.stopCalibrating);
  const setCalibrationMode = useCameraCalibrationStore((s) => s.setMode);

  const activePtz = ptzList.find((p) => p.id === calibratingCameraId) ?? null;

  const handleSelectPtz = (ptzId: number) => {
    if (ptzId === calibratingCameraId) return;
    stopCalibrating();
    startCalibrating(ptzId, true);
  };

  // Volver desde la calibración al listado de cámaras (sin cerrar el panel)
  const handleBackToList = () => {
    stopCalibrating();
  };

  const handleClose = () => {
    stopCalibrating();
    closePanel("ptz-calibration");
  };

  const toggleMode = () =>
    setCalibrationMode(calibrationMode === "save" ? "goto" : "save");

  return (
    <>
      <Tooltip text="Calibración PTZ">
        <button
          onClick={() => (open ? handleClose() : openPanel("ptz-calibration"))}
          className={`h-10 w-10 flex justify-center items-center rounded transition-colors ${
            open || calibratingCameraId !== null
              ? "bg-blue-500 text-white border border-blue-600"
              : "bg-bg-300 border border-transparent hover:bg-blue-600 text-text-100"
          }`}
        >
          <IconDeviceGamepad3 size={20} stroke={1.8} />
        </button>
      </Tooltip>

      {open && (
        <MapPanelPortal>
          {activePtz ? (
            <PanelShell
              title="Calibración PTZ"
              icon={
                <IconTarget size={14} className="text-amber-400" stroke={1.8} />
              }
              onBack={handleBackToList}
              onClose={handleClose}
            >
              <div className="p-3 space-y-3">
                <div className="rounded-lg border border-border bg-bg-200/40 p-2">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-text-100/50 mb-1.5 text-center">
                    Control de la cámara
                  </div>
                  <div className="flex justify-center">
                    <PtzDpad ptz_id={activePtz.id} />
                  </div>
                </div>
                <CalibrationPanel
                  cameraId={activePtz.id}
                  cameraName={activePtz.nombre}
                  result={lastResult}
                  mode={calibrationMode}
                  onToggleMode={toggleMode}
                  onCancel={handleClose}
                  azimut={Number(activePtz.azimut) || 0}
                  panOffset={activePtz.panOffset}
                  panInvertido={activePtz.panInvertido}
                />
              </div>
            </PanelShell>
          ) : (
            <PanelShell
              title="Calibración PTZ"
              icon={
                <IconTarget size={14} className="text-amber-400" stroke={1.8} />
              }
              onClose={handleClose}
            >
              <div className="p-3 space-y-3">
                {ptzList.length === 0 ? (
                  <p className="text-[11px] text-text-200">
                    No hay cámaras PTZ configuradas.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {ptzList.map((p) => {
                      const active = p.id === calibratingCameraId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPtz(p.id)}
                          className={`px-2 py-1.5 rounded-md shadow text-xs font-bold transition-colors ${
                            active
                              ? "bg-blue-700 text-white"
                              : "bg-bg-300 text-text-100 hover:bg-blue-600 hover:text-white"
                          }`}
                        >
                          {p.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] max-w-md text-balance text-center text-text-200 leading-snug">
                  Selecciona una cámara PTZ para comenzar la calibración. El
                  mapa entrará en modo calibración: haz clic sobre el punto de
                  referencia.
                </p>
              </div>
            </PanelShell>
          )}
        </MapPanelPortal>
      )}
    </>
  );
});

export default PtzCalibrationMenu;