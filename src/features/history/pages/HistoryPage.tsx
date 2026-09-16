import { useMemo, useState } from "react";
import { useTrackSummaries } from "../hooks/useTrackSummaries";
import { useZones } from "../hooks/useZones";
import { useTrackPlayback } from "../hooks/useTrackPlayback";
import { HistoryListPanel } from "../components/HistoryListPanel";
import { TrackPlaybackMap } from "../components/TrackPlaybackMap";
import { PlaybackControls } from "../components/PlaybackControls";
import type { TrackSummaryFilters } from "../types";

export default function HistoryPage() {
  const [filters, setFilters] = useState<TrackSummaryFilters>({
    minPoints: 2,
  });
  const [onlyWithZones, setOnlyWithZones] = useState(false);
  const { data: zones = [] } = useZones();
  const { data: tracks = [], isFetching } = useTrackSummaries(filters);
  const playback = useTrackPlayback();

  const filteredTracks = useMemo(
    () => (onlyWithZones ? tracks.filter((t) => t.zones.length > 0) : tracks),
    [tracks, onlyWithZones],
  );

  return (
    <div className="w-full h-full grid grid-cols-12 overflow-hidden bg-bg-300 text-text-100">
      <aside className="col-span-3 xl:col-span-2 h-full border-r border-border overflow-hidden">
        <HistoryListPanel
          filters={filters}
          onFiltersChange={setFilters}
          tracks={filteredTracks}
          isLoading={isFetching}
          selectedTrackId={playback.selectedTrack?.track_id ?? null}
          onSelectTrack={playback.selectTrack}
          zones={zones}
          onlyWithZones={onlyWithZones}
          onOnlyWithZonesChange={setOnlyWithZones}
        />
      </aside>
      <div className="col-span-9 xl:col-span-10 h-full relative overflow-hidden">
        <TrackPlaybackMap
          track={playback.selectedTrack}
          points={playback.points}
          playbackIndex={playback.index}
          zones={zones}
          loading={playback.loading}
        />
        <PlaybackControls
          track={playback.selectedTrack}
          points={playback.points}
          index={playback.index}
          isPlaying={playback.isPlaying}
          speed={playback.speed}
          onTogglePlay={playback.togglePlay}
          onSpeedChange={playback.changeSpeed}
          onSeek={playback.seekTo}
          onClose={playback.close}
        />
      </div>
    </div>
  );
}
