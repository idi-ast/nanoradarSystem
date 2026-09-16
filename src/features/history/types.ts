export interface TrackSummary {
  track_id: string;
  tipo_radar: string;
  first_seen: string | null;
  last_seen: string | null;
  point_count: number;
  nivel_max: number | null;
  zones: string[];
}

export interface TrackSummaryFilters {
  tipoRadar?: string;
  from?: string;
  to?: string;
  search?: string;
  minPoints: number;
  zone?: string;
}

export interface TrackListResponse {
  data: TrackSummary[];
  message: string;
}