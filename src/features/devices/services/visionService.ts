import { apiSystem } from "@/apis";

export interface VisionConfigPayload {
  confidence?: number;
  classes?: string[] | null;
  targetFps?: number;
  maxWidth?: number;
  bitrate?: number;
  imgsz?: number;
}

export interface VisionDefaults
  extends Required<Omit<VisionConfigPayload, "classes">> {
  classes: string[] | null;
  device: string;
  model: string;
}

export interface VisionClass {
  id: number;
  name: string;
}

export interface VisionDetection {
  className?: string;
  name?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface VisionDetectionsResponse {
  ptzId: number;
  state: string;
  actualFps: number;
  detections: VisionDetection[];
}

export async function startVision(
  ptzId: number,
  config: VisionConfigPayload,
) {
  return apiSystem.post(`/vision/${ptzId}/start`, config);
}

export async function stopVision(ptzId: number) {
  return apiSystem.post(`/vision/${ptzId}/stop`);
}

export async function fetchVisionDefaults() {
  const response = await apiSystem.get<VisionDefaults>("/vision/defaults");
  return response.data;
}

export async function fetchVisionClasses() {
  const response = await apiSystem.get<{ classes: VisionClass[] }>(
    "/vision/classes",
  );
  return response.data.classes;
}

export async function fetchVisionDetections(ptzId: number) {
  const response = await apiSystem.get<VisionDetectionsResponse>(
    `/vision/${ptzId}/detections`,
  );
  return response.data;
}