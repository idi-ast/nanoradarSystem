import { useCallback, useMemo, useState } from "react";
import {
  useTrackSummaries,
  useFavoriteTrackSummaries,
} from "../hooks/useTrackSummaries";
import { useZones } from "../hooks/useZones";
import { useTrackPlayback } from "../hooks/useTrackPlayback";
import { trackKey } from "../hooks/useTrackPlayback";
import { HistoryListPanel } from "../components/HistoryListPanel";
import { TrackPlaybackMap } from "../components/TrackPlaybackMap";
import { PlaybackControls } from "../components/PlaybackControls";
import type { TrackSummaryFilters } from "../types";
import { TRACKS_PAGE_SIZE } from "../types";

function getDefaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1); // Hace 24 horas
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function HistoryPage() {
  const [filters, setFilters] = useState<TrackSummaryFilters>({
    minPoints: 2,
    from: getDefaultFromDate(),
  });
  const [page, setPage] = useState(1);
  const [onlyWithZones, setOnlyWithZones] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { data: zones = [] } = useZones();
  const hasDateRange = Boolean(filters.from || filters.to);
  const pageSize = hasDateRange ? 20000 : TRACKS_PAGE_SIZE;

  const summaries = useTrackSummaries(
    filters,
    hasDateRange ? 1 : page,
    pageSize,
    onlyWithZones,
  );

  // Cuando "Solo favoritos" está activo, traemos los resúmenes completos
  // de todos los favoritos (ignora filtros de fecha/búsqueda).
  const favoritesSummaries = useFavoriteTrackSummaries(onlyFavorites);

  const playback = useTrackPlayback();

  const mergedTracks = useMemo(
    () => {
      const main = summaries.data?.tracks ?? [];
      const favs = favoritesSummaries.data ?? [];
      return onlyFavorites ? favs : main;
    },
    [summaries.data, favoritesSummaries.data, onlyFavorites],
  );

  const { tracks, total, pages } = useMemo(
    () => ({
      tracks: mergedTracks,
      total: summaries.data?.total ?? 0,
      pages: summaries.data?.pages ?? 1,
    }),
    [summaries.data, mergedTracks],
  );

  const selectedKeys = useMemo(
    () => new Set(playback.tracks.map((it) => trackKey(it.summary))),
    [playback.tracks],
  );

  const handleFiltersChange = useCallback((f: TrackSummaryFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  const handleOnlyWithZonesChange = useCallback((v: boolean) => {
    setOnlyWithZones(v);
    setPage(1);
  }, []);

  const handleOnlyFavoritesChange = useCallback((v: boolean) => {
    setOnlyFavorites(v);
    setPage(1);
  }, []);

  return (
    <div className="w-full h-full grid grid-cols-12 overflow-hidden bg-bg-300 text-text-100">
      <aside className="col-span-3 xl:col-span-2 h-full border-r border-border overflow-hidden">
        <HistoryListPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          tracks={tracks}
          isLoading={summaries.isFetching || (onlyFavorites && favoritesSummaries.isFetching)}
          total={total}
          page={hasDateRange ? 1 : page}
          pages={hasDateRange ? 1 : pages}
          onPageChange={setPage}
          selectedKeys={selectedKeys}
          onToggleTrack={playback.toggleTrack}
          onPlayAll={playback.playAll}
          zones={zones}
          onlyWithZones={onlyWithZones}
          onOnlyWithZonesChange={handleOnlyWithZonesChange}
          onlyFavorites={onlyFavorites}
          onOnlyFavoritesChange={handleOnlyFavoritesChange}
        />
      </aside>
      <div className="col-span-9 xl:col-span-10 h-full relative overflow-hidden">
        <TrackPlaybackMap
          tracks={playback.tracks}
          playbackIndex={playback.index}
          zones={zones}
          loading={playback.loading}
        />
        <PlaybackControls
          tracks={playback.tracks}
          index={playback.index}
          isPlaying={playback.isPlaying}
          speed={playback.speed}
          onTogglePlay={playback.togglePlay}
          onSpeedChange={playback.changeSpeed}
          onSeek={playback.seekTo}
          onClose={playback.clearAll}
        />
      </div>
    </div>
  );
}
