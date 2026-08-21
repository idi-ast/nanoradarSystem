import { apiSystem } from "@/apis/apiSystem";

export interface VisionDetection {
  cls_id: number;
  name: string;
  conf: number;
  box: [number, number, number, number];
}

export interface VisionSessionStats {
  ptzId: number;
  state: "starting" | "connecting" | "online" | "error" | "stopped";
  lastError: string | null;
  uptimeSec: number;
  framesProcessed: number;
  detectionsTotal: number;
  actualFps: number;
  targetFps: number;
  confidence: number;
  classes: string[] | null;
  lastDetections: VisionDetection[];
  urlStreamIa: string;
}

export interface VisionStartResponse {
  status: "started" | "already_running";
  message: string;
  [key: string]: unknown;
}

export interface VisionClass {
  id: number;
  name: string;
}

export interface VisionConfigPayload {
  confidence?: number;
  classes?: string[] | null;
  targetFps?: number;
  maxWidth?: number;
  bitrate?: number;
  imgsz?: number;
}

export interface VisionDefaults {
  confidence: number;
  targetFps: number;
  maxWidth: number;
  bitrate: number;
  imgsz: number;
  classes: string[] | null;
  device: string;
  model: string;
}

/** Activa la detección IA sobre el stream de una PTZ (publica ptz_{id}_ai). */
export async function startVision(
  ptzId: number,
  payload?: VisionConfigPayload,
): Promise<VisionStartResponse> {
  const res = await apiSystem.post<VisionStartResponse>(
    `/vision/${ptzId}/start`,
    payload ?? {},
  );
  return res.data;
}

/** Desactiva la detección IA de una PTZ. */
export async function stopVision(ptzId: number): Promise<void> {
  await apiSystem.post(`/vision/${ptzId}/stop`);
}

/** Estado de todos los workers de visión. */
export async function fetchVisionStatus(): Promise<VisionSessionStats[]> {
  const res = await apiSystem.get<{ sessions: VisionSessionStats[] }>(
    "/vision/status",
  );
  return res.data.sessions;
}

/** Últimas detecciones de una PTZ (para correlación con radar). */
export async function fetchVisionDetections(ptzId: number): Promise<{
  ptzId: number;
  state: string;
  detections: VisionDetection[];
  actualFps: number;
}> {
  const res = await apiSystem.get<{
    ptzId: number;
    state: string;
    detections: VisionDetection[];
    actualFps: number;
  }>(`/vision/${ptzId}/detections`);
  return res.data;
}

/** Valores por defecto de la detección (para el menú de configuración). */
export async function fetchVisionDefaults(): Promise<VisionDefaults> {
  const res = await apiSystem.get<VisionDefaults>("/vision/defaults");
  return res.data;
}

/** Clases disponibles para la detección. */
export async function fetchVisionClasses(): Promise<VisionClass[]> {
  const res = await apiSystem.get<{ classes: VisionClass[] }>("/vision/classes");
  return res.data.classes;
}

// ── Fusión radar ↔ visión ──────────────────────────────────────────────────

export interface VisionFusionAssociation {
  trackId: string | number;
  name: string;
  conf: number;
  box: [number, number, number, number];
  errPx: number;
  isLocked: boolean;
}

export interface VisionFusionStatus {
  enabled: boolean;
  hasData: boolean;
  visualLock?: boolean;
  associations?: VisionFusionAssociation[];
  offset?: { dBearing: number; DElev: number } | null;
  ageSec?: number;
  calibration?: { samples: number; meanErrorDeg: number | null };
}

/** Estado de la fusión radar↔visión de una PTZ. */
export async function fetchVisionFusion(
  ptzId: number,
): Promise<VisionFusionStatus> {
  const res = await apiSystem.get<VisionFusionStatus>(
    `/vision/${ptzId}/fusion`,
  );
  return res.data;
}

/** Configura la fusión radar↔visión de una PTZ en caliente. */
export async function configureVisionFusion(
  ptzId: number,
  payload: { enabled?: boolean; gateFrac?: number; servoGain?: number },
): Promise<VisionFusionStatus> {
  const res = await apiSystem.post<VisionFusionStatus>(
    `/vision/${ptzId}/fusion/config`,
    payload,
  );
  return res.data;
}
