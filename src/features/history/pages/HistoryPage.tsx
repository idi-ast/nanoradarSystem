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
import { fetchAllTrackSummaries } from "../api";
import { fetchAnalysisPoints, type AnalysisFetchResult, type AnalysisZone } from "../analysis";
import { extractZoneVertices } from "@/features/devices/components/map/utils/geoHelpers";
import { toast } from "sonner";

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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { data: zones = [] } = useZones();
  const pageSize = TRACKS_PAGE_SIZE;

  const summaries = useTrackSummaries(
    filters,
    page,
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

  // Informe PDF del período completo (no solo la página visible).
  const handleGenerateReport = useCallback(async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const reportTracks = onlyFavorites
        ? (favoritesSummaries.data ?? [])
        : await fetchAllTrackSummaries(filters, onlyWithZones);

      if (reportTracks.length === 0) {
        toast.warning("No hay tracks para el período y filtros seleccionados.");
        return;
      }

      const analysisZones: AnalysisZone[] = zones
        .map((z) => ({
          nombre: z.nombre,
          vertices: extractZoneVertices(z.poligono?.vertices),
          color: z.poligono?.color,
        }))
        .filter((z) => z.vertices.length >= 3);

      let analysis: AnalysisFetchResult = {
        points: [],
        tracksAnalyzed: 0,
        tracksTotal: reportTracks.length,
        pointsLimited: false,
      };
      try {
        analysis = await fetchAnalysisPoints(reportTracks);
      } catch (error) {
        console.error("No se pudieron cargar las posiciones para el informe", error);
      }

      // PDF y fuentes se cargan solo al generar un informe.
      const { downloadTrackActivityReport } = await import("../report");
      const range = downloadTrackActivityReport({
        tracks: reportTracks,
        total,
        filters,
        onlyWithZones,
        onlyFavorites,
        limited: false,
        points: analysis.points,
        zones: analysisZones,
        tracksAnalyzed: analysis.tracksAnalyzed,
        pointsLimited: analysis.pointsLimited,
      });

      const pointsNote = analysis.points.length > 0
        ? ` · ${analysis.points.length.toLocaleString("es-CL")} posiciones analizadas`
        : "";
      toast.success(
        `Informe generado con ${reportTracks.length} tracks${pointsNote} (${range.from.toLocaleDateString("es-CL")} – ${range.to.toLocaleDateString("es-CL")}).`,
      );
    } catch (error) {
      console.error("Error al generar el informe PDF", error);
      toast.error("No se pudo generar el informe PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [
    filters,
    onlyWithZones,
    onlyFavorites,
    favoritesSummaries.data,
    total,
    zones,
    isGeneratingReport,
  ]);

  return (
    <div className="w-full h-full grid grid-cols-12 overflow-hidden bg-bg-300 text-text-100">
      <aside className="col-span-3 xl:col-span-2 h-full border-r border-border overflow-hidden">
        <HistoryListPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          tracks={tracks}
          isLoading={summaries.isFetching || (onlyFavorites && favoritesSummaries.isFetching)}
          total={total}
          page={page}
          pages={pages}
          onPageChange={setPage}
          selectedKeys={selectedKeys}
          onToggleTrack={playback.toggleTrack}
          onPlayAll={playback.playAll}
          zones={zones}
          onlyWithZones={onlyWithZones}
          onOnlyWithZonesChange={handleOnlyWithZonesChange}
          onlyFavorites={onlyFavorites}
          onOnlyFavoritesChange={handleOnlyFavoritesChange}
          onGenerateReport={handleGenerateReport}
          isGeneratingReport={isGeneratingReport}
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
