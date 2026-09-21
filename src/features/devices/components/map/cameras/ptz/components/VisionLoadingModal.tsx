import { useEffect, useRef, useState } from "react";
import { IconSparkles, IconLoader2, IconCheck } from "@tabler/icons-react";
import { fetchVisionDetections } from "@/features/devices/services/visionService";

interface VisionLoadingModalProps {
  name: string;
  ptzId: number;
  mode: "start" | "stop";
  onComplete: () => void;
}

const START_STEPS = [
  "Iniciando clasificación...",
  "Conectando con PTZ...",
  "Iniciando librería YOLO...",
];

const SAFETY_TIMEOUT_MS = 15000;

/**
 * Pantalla de carga que se muestra DENTRO del cuadro de la cámara mientras se
 * activa/desactiva la detección IA.
 *
 * Al iniciar, recorre las fases del pipeline (clasificación → conexión → librería)
 * y consulta el estado real del worker en el backend hasta alcanzar "online"
 * (conexión exitosa). Si la conexión falla o tarda demasiado, se cierra sola.
 */
export function VisionLoadingModal({
  name,
  ptzId,
  mode,
  onComplete,
}: VisionLoadingModalProps) {
  const [phase, setPhase] = useState(0);

  const phaseRef = useRef(0);
  phaseRef.current = phase;

  useEffect(() => {
    if (mode === "stop") {
      const t = window.setTimeout(onComplete, 700);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    let successTimer: number | undefined;
    const finish = () => {
      if (!cancelled) onComplete();
    };

    const timers = [
      window.setTimeout(() => setPhase(1), 1200),
      window.setTimeout(() => setPhase(2), 2600),
    ];

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetchVisionDetections(ptzId);
        if (!cancelled && res.state === "online") {
          setPhase(3);
          successTimer = window.setTimeout(finish, 900);
          return;
        }
      } catch {
        // worker aún no activo (404) o de error: seguir esperando
      }
      if (!cancelled) pollTimer = window.setTimeout(poll, 900);
    };
    void poll();

    const safety = window.setTimeout(finish, SAFETY_TIMEOUT_MS);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      if (pollTimer) window.clearTimeout(pollTimer);
      if (successTimer) window.clearTimeout(successTimer);
      window.clearTimeout(safety);
    };
  }, [ptzId, mode, onComplete]);

  const isSuccess = phase >= START_STEPS.length;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm rounded-xl">
      <div className="bg-bg-100 border border-border rounded-xl shadow-2xl w-full max-w-xs mx-3 max-h-[calc(100%-0.75rem)] overflow-y-auto p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="min-w-0">
            <h3 className="text-[12px] font-semibold text-text-100">
              Detección IA
            </h3>
            <p className="text-[10px] text-text-200 truncate">{name}</p>
          </div>
        </div>

        {mode === "stop" ? (
          <div className="flex items-center gap-2 text-[11px] text-text-100">
            <IconLoader2
              size={14}
              className="animate-spin text-emerald-400 shrink-0"
            />
            Deteniendo detección IA...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {START_STEPS.map((label, i) => {
              const done = phase > i;
              const active = phase === i;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 text-[11px] transition-colors ${
                    done
                      ? "text-emerald-400"
                      : active
                        ? "text-text-100"
                        : "text-text-100/30"
                  }`}
                >
                  {done ? (
                    <IconCheck size={14} className="shrink-0" />
                  ) : active ? (
                    <IconLoader2
                      size={14}
                      className="animate-spin text-emerald-400 shrink-0"
                    />
                  ) : (
                    <span className="w-[14px] shrink-0 flex justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-bg-400" />
                    </span>
                  )}
                  {label}
                </div>
              );
            })}

            {isSuccess && (
              <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
                <IconCheck size={14} className="shrink-0" />
                Conexión exitosa
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
