import { apiSystem } from "@/apis/apiSystem";

/** Clasificación de comportamiento de un track (devuelta por el backend) */
export interface TrackBehavior {
  track_id: string;
  category: string;
  confidence: number;
  label_source: string;
  manual_category?: string | null;
  features?: Record<string, number>;
}

export interface StaticObject {
  lat: number;
  lon: number;
  radius_m: number;
  rcs_mu: number;
  rcs_std: number;
  snr_mu: number;
  snr_std: number;
  samples: number;
  first_seen: number;
  last_seen: number;
}

export interface LabelResult {
  track_id: string;
  category: string;
  confidence: number;
  label_source: string;
  samples: number;
}

/**
 * Obtiene la clasificación y firma de comportamiento de un track vivo.
 */
export async function fetchTrackBehavior(trackId: string): Promise<TrackBehavior> {
  try {
    const res = await apiSystem.get<TrackBehavior>(
      `/tracks/${encodeURIComponent(trackId)}/behavior`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.data;
  } catch (err) {
    console.error("[behaviorService] fetchTrackBehavior:", err);
    throw err;
  }
}

/**
 * Etiqueta manualmente un track. El backend fusiona la firma con el
 * prototipo de la categoría y el sistema aprende solo.
 */
export async function labelTrack(
  trackId: string,
  category: string,
): Promise<LabelResult> {
  try {
    const res = await apiSystem.post<{ data: LabelResult; message: string }>(
      `/tracks/${encodeURIComponent(trackId)}/label`,
      { category },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.data.data;
  } catch (err) {
    console.error("[behaviorService] labelTrack:", err);
    throw err;
  }
}

/**
 * Lista los objetos estáticos aprendidos (boyas/bollas) para la capa del mapa.
 */
export async function fetchStaticObjects(): Promise<StaticObject[]> {
  try {
    const res = await apiSystem.get<{ data: StaticObject[]; total: number }>(
      "/static-objects",
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.data.data;
  } catch (err) {
    console.error("[behaviorService] fetchStaticObjects:", err);
    throw err;
  }
}

/**
 * Categorías disponibles para el selector de etiquetado.
 */
export async function fetchBehaviorCategories(): Promise<string[]> {
  try {
    const res = await apiSystem.get<{ data: string[] }>("/behavior-categories");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.data.data;
  } catch (err) {
    console.error("[behaviorService] fetchBehaviorCategories:", err);
    throw err;
  }
}
