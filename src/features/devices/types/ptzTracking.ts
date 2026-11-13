export type PtzTrackingState = 'following' | 'waiting' | 'returning_home' | 'home' | 'idle' | 'paused' | 'error' | 'position_unconfirmed';

export interface PtzTrackingSession {
  radar_ip: string;
  ptz_id: number;
  tracking_state: PtzTrackingState;
  signal_grace_seconds: number;
  home_wait_seconds: number;
  target: {
    track_id: string;
    lat: number;
    lon: number;
    zone: string;
    level: number;
    category?: string;
    observed_at: number;
    age_seconds: number;
    signal_state: 'recent' | 'retained';
  } | null;
}

export interface PtzTrackingSnapshot {
  sessions: PtzTrackingSession[];
  server_time: number;
  receivedAt: number;
}

export interface PtzTargetSelection {
  ptzId: number;
  state: PtzTrackingState;
  signalState: 'recent' | 'retained';
  graceSeconds: number;
}
