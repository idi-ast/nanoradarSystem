import type { Ptz } from "@/features/config-devices/types/ConfigServices.type";

export type CameraMode = "minimized" | "maximized" | "fullscreen";

export interface PtzCameraPosition {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

export interface PtzCameraProps {
  camera: Ptz;
  position?: PtzCameraPosition;
  stackIndex?: number;
  onBecomeMaximized?: () => void;
  onBecomeMinimized?: () => void;
  onClose?: () => void;
}
