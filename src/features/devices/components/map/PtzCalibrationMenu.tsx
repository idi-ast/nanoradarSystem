import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconDeviceGamepad3, IconTarget, IconX } from "@tabler/icons-react";
import { Tooltip } from "@/components/ui";
import { useConfigDevices } from "@/features/config-devices/hooks/useConfigDevices";
import { useMapPanel } from "./MapPanelContext";
import { useCameraCalibrationStore } from "../../stores/cameraCalibrationStore";
import { CalibrationPanel } from "./cameras/ptz/components/CalibrationPanel";
import { PtzDpad } from "./cameras/ptz/components/PtzDpad";

/**
 * Opción "Calibración PTZ" del menú del mapa.
 *
 * Abre un panel donde se elige la cámara PTZ a calibrar y se muestra el
 * panel de calibración (Paso 1: dirección PAN, Paso 2: calibrar, Paso 3:
 * corregir offset y Verificar). Al elegir una cámara se activa el modo de
 * calibración en el mapa (clic = marcar punto de referencia / girar).
 */
export const PtzCalibrationMenu = memo(function PtzCalibrationMenu() {
    const { isOpen, openPanel, closePanel } = useMapPanel();
    const open = isOpen("ptz-calibration");

    const triggerRef = useRef<HTMLButtonElement>(null);
    const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({
        top: 0,
        right: 0,
    });

    const { data } = useConfigDevices();
    const ptzList = data?.data?.ptz ?? [];

    const calibratingCameraId = useCameraCalibrationStore(
        (s) => s.calibratingCameraId,
    );
    const lastResult = useCameraCalibrationStore((s) => s.lastResult);
    const calibrationMode = useCameraCalibrationStore((s) => s.mode);
    const startCalibrating = useCameraCalibrationStore(
        (s) => s.startCalibrating,
    );
    const stopCalibrating = useCameraCalibrationStore((s) => s.stopCalibrating);
    const setCalibrationMode = useCameraCalibrationStore((s) => s.setMode);

    const activePtz = ptzList.find((p) => p.id === calibratingCameraId) ?? null;

    // Posiciona el panel a la derecha del botón del menú lateral.
    useEffect(() => {
        if (!open || !triggerRef.current) return;
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
    }, [open]);

    const handleSelectPtz = (ptzId: number) => {
        if (ptzId === calibratingCameraId) return;
        stopCalibrating();
        startCalibrating(ptzId, true);
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
                    ref={triggerRef}
                    onClick={() => (open ? handleClose() : openPanel("ptz-calibration"))}
                    className={`h-10 w-10 flex justify-center items-center rounded transition-colors ${open || calibratingCameraId !== null
                        ? "bg-orange-500 text-white border border-orange-400"
                        : "bg-bg-300 border border-transparent hover:bg-orange-600/60 text-text-100"
                        }`}
                >
                    <IconDeviceGamepad3 size={20} stroke={1.8} />
                </button>
            </Tooltip>

            {open &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            top: panelStyle.top,
                            right: panelStyle.right,
                            zIndex: 9999,
                        }}
                    >
                        <div className="w-140 max-h-[85vh] bg-bg-100/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl">
                            {/* Cabecera */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                                <div className="flex items-center gap-1.5">
                                    <IconTarget
                                        size={14}
                                        className="text-amber-400"
                                        stroke={1.8}
                                    />
                                    <h4 className="text-xs text-text-100 font-bold uppercase tracking-wide">
                                        Calibración PTZ
                                    </h4>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="text-text-200 hover:text-text-100 transition-colors text-[10px]"
                                    aria-label="Cerrar"
                                >
                                    <IconX size={14} />
                                </button>
                            </div>

                            <div className="p-2 space-y-2">
                                {/* Selector de cámara PTZ */}
                                {ptzList.length === 0 ? (
                                    <p className="text-[11px] text-text-200">
                                        No hay cámaras PTZ configuradas.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {ptzList.map((p) => {
                                            const active = p.id === calibratingCameraId;
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleSelectPtz(p.id)}
                                                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${active
                                                        ? "bg-amber-600 text-white"
                                                        : "bg-bg-300 text-text-200 hover:bg-amber-600/40 hover:text-text-100"
                                                        }`}
                                                >
                                                    {p.nombre}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {activePtz ? (
                                    <>
                                        {/* Control de flechas para apuntar la cámara */}
                                        <div className="absolute -left-34 -translate-x-6 border border-border bg-bg-100 px-3 py-2">
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
                                    </>
                                ) : (
                                    <p className="text-[11px] text-text-200 leading-snug">
                                        Selecciona una cámara PTZ para comenzar la calibración. El
                                        mapa entrará en modo calibración: haz clic sobre el punto de
                                        referencia.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
});

export default PtzCalibrationMenu;
