export {
  fetchRadarConfig,
  fetchTiposAlertas,
  fetchRadarZones,
  createRadarZone,
  updateRadarZone,
  deleteRadarZone,
} from "./radarService";

export {
  fetchTrackBehavior,
  labelTrack,
  fetchStaticObjects,
  fetchBehaviorCategories,
} from "./behaviorService";
export type {
  TrackBehavior,
  StaticObject,
  LabelResult,
} from "./behaviorService";
