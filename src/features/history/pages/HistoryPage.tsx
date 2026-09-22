import { useCallback, useMemo, useState } from "react";
import { useTrackSummaries } from "../hooks/useTrackSummaries";
import { useZones } from "../hooks/useZones";
import { useTrackPlayback } from "../hooks/useTrackPlayback";
import { trackKey } from "../hooks/useTrackPlayback";
import { HistoryListPanel } from "../components/HistoryListPanel";
import { TrackPlaybackMap } from "../components/TrackPlaybackMap";
import { PlaybackControls } from "../components/PlaybackControls";
import type { TrackSummaryFilters } from "../types";
import { TRACKS_PAGE_SIZE } from "../types";

export default function HistoryPage() {
  const [filters, setFilters] = useState<TrackSummaryFilters>({
    minPoints: 2,
  });
  const [page, setPage] = useState(1);
  const [onlyWithZones, setOnlyWithZones] = useState(false);
  const { data: zones = [] } = useZones();
  const hasDateRange = Boolean(filters.from || filters.to);
  const pageSize = hasDateRange ? 20000 : TRACKS_PAGE_SIZE;
  const summaries = useTrackSummaries(
    filters,
    hasDateRange ? 1 : page,
    pageSize,
    onlyWithZones,
  );
  const playback = useTrackPlayback();

  const { tracks, total, pages } = useMemo(
    () => ({
      tracks: summaries.data?.tracks ?? [],
      total: summaries.data?.total ?? 0,
      pages: summaries.data?.pages ?? 1,
    }),
    [summaries.data],
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

  return (
    <div className="w-full h-full grid grid-cols-12 overflow-hidden bg-bg-300 text-text-100">
      <aside className="col-span-3 xl:col-span-2 h-full border-r border-border overflow-hidden">
        <HistoryListPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          tracks={tracks}
          isLoading={summaries.isFetching}
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
