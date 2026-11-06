import { isBehaviorVisible } from "@/features/devices/config/behaviorCategories";
import { useBehaviorVisibilityStore } from "@/features/devices/stores/behaviorVisibilityStore";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
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
import type { TrackSummaryFilters, TrackSummary } from "../types";
import { TRACKS_PAGE_SIZE } from "../types";
import { fetchReportTrackSummaries } from "../api";
import { fetchAnalysisPoints, type AnalysisFetchResult, type AnalysisZone } from "../analysis";
import { extractZoneVertices } from "@/features/devices/components/map/utils/geoHelpers";
import { toast } from "sonner";
import { DEFAULT_REPORT_SETTINGS, filterReportTracks, isValidAnalysisZone, normalizeZone, type ReportSettings } from "../reportAnalytics";
import { ReportSettingsDialog } from "../components/ReportSettingsDialog";

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
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportSettings, setReportSettings] = useState<ReportSettings>(DEFAULT_REPORT_SETTINGS);
  const [reportProgress, setReportProgress] = useState("");
  const reportController = useRef<AbortController | null>(null);
  useEffect(() => () => reportController.current?.abort(), []);
  const analysisZones = useMemo<AnalysisZone[]>(() => zones.map(z => ({
    nombre: z.nombre, vertices: extractZoneVertices(z.poligono?.vertices), color: z.poligono?.color,
  })).filter(isValidAnalysisZone), [zones]);
  const openReportSettings = useCallback(() => {
    setReportSettings(current => ({ ...current, criticalZones: analysisZones.filter(z => normalizeZone(z.nombre) === 'modulo').map(z => z.nombre) }));
    setReportDialogOpen(true);
  }, [analysisZones]);
  const pageSize = TRACKS_PAGE_SIZE;

  const summaries = useTrackSummaries(
    filters,
    page,
    pageSize,
    onlyWithZones,
  );

  // Cuando "Solo favoritos" está activo, traemos los resúmenes completos
  // de todos los favoritos (ignora filtros de fecha/búsqueda).
  const favoritesSummaries = useFavoriteTrackSummaries(onlyFavorites, filters.minTrackedMinutes ?? 0);

  const playback = useTrackPlayback();
  const visibility = useBehaviorVisibilityStore(s => s.visibility);
  const visiblePlaybackTracks = useMemo(() => playback.tracks.filter(t => isBehaviorVisible(t.summary.behavior_class, visibility)), [playback.tracks, visibility]);
  const { activeTrackKey, selectTrack } = playback;
  useEffect(() => {
    if (activeTrackKey && !visiblePlaybackTracks.some(t => trackKey(t.summary) === activeTrackKey)) selectTrack(null);
  }, [activeTrackKey, selectTrack, visiblePlaybackTracks]);

  const mergedTracks = useMemo(
    () => {
      const main = summaries.data?.tracks ?? [];
      const favs = favoritesSummaries.data ?? [];
      return onlyFavorites ? filterReportTracks(favs, filters.behaviorClass) : main;
    },
    [summaries.data, favoritesSummaries.data, onlyFavorites, filters.behaviorClass],
  );

  const { tracks, total, pages } = useMemo(
    () => ({
      tracks: mergedTracks.filter(t => isBehaviorVisible(t.behavior_class, visibility)),
      total: onlyFavorites ? mergedTracks.length : summaries.data?.total ?? 0,
      pages: onlyFavorites ? 1 : summaries.data?.pages ?? 1,
    }),
    [summaries.data, mergedTracks, visibility, onlyFavorites],
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
    const controller = new AbortController();
    reportController.current = controller;
    setIsGeneratingReport(true);
    setReportDialogOpen(false);
    setReportProgress("Preparando período del informe...");
    try {
      const { resolveReportRange, downloadTrackActivityReport } = await import("../report");
      controller.signal.throwIfAborted();
      const effectiveRange = resolveReportRange(filters);
      const reportFilters = { ...filters, minTrackedMinutes: Math.max(filters.minTrackedMinutes ?? 0, reportSettings.minTrackedMinutes), from: effectiveRange.from.toISOString(), to: effectiveRange.to.toISOString() };
      let listing: { tracks: TrackSummary[]; total: number; limited: boolean };
      if (onlyFavorites) {
        // Reconsultar los favoritos con el rango exacto: sus resúmenes de la
        // pantalla pueden abarcar fechas distintas y tener métricas globales.
        const byRadar = new Map<string, string[]>();
        for (const track of favoritesSummaries.data ?? []) {
          if (reportFilters.tipoRadar && reportFilters.tipoRadar !== track.tipo_radar) continue;
          const ids = byRadar.get(track.tipo_radar) ?? [];
          ids.push(track.track_id);
          byRadar.set(track.tipo_radar, ids);
        }
        listing = { tracks: [], total: 0, limited: false };
        for (const [radar, trackIds] of byRadar) {
          controller.signal.throwIfAborted();
          const result = await fetchReportTrackSummaries({ ...reportFilters, tipoRadar: radar, trackIds }, onlyWithZones,
            (page, count) => setReportProgress(`Cargando favoritos (${radar}): página ${page} de ${count}`), controller.signal);
          listing.tracks.push(...result.tracks);
          listing.total += result.total;
          listing.limited ||= result.limited;
        }
      } else {
        listing = await fetchReportTrackSummaries(reportFilters, onlyWithZones,
          (page, count) => setReportProgress(`Cargando resúmenes: página ${page} de ${count}`), controller.signal);
      }
      const reportTracks = filterReportTracks(listing.tracks.filter(t => isBehaviorVisible(t.behavior_class, visibility)), reportSettings.category);

      if (reportTracks.length === 0) {
        toast.warning(listing.limited && reportSettings.category
          ? "No hay tracks de esa categoría entre los resúmenes cargados. El listado está recortado; prueba un período más corto."
          : "No hay tracks para la categoría, el período y los filtros seleccionados.");
        return;
      }

      let analysis: AnalysisFetchResult = {
        points: [],
        tracksAnalyzed: 0,
        tracksTotal: reportTracks.length,
        pointsLimited: false,
      };
      try {
        analysis = await fetchAnalysisPoints(reportTracks, {
          from: reportFilters.from, to: reportFilters.to, signal: controller.signal,
          includeMovement: true, maxGapSeconds: reportSettings.maxGapSeconds,
          onProgress: (done, count) => setReportProgress(`Analizando trayectorias: ${done} de ${count}`),
        });
      } catch (error) {
        if (controller.signal.aborted) throw error;
        console.error("No se pudieron cargar las posiciones para el informe", error);
      }

      controller.signal.throwIfAborted();
      setReportProgress("Cargando mapa satelital para el PDF...");
      const { captureReportMaps } = await import('../captureReportMaps');
      const { nightMapGroups } = await import('../reportMapData');
      const groups = nightMapGroups(reportTracks, analysis.points, effectiveRange.from, effectiveRange.to, reportSettings);
      const mapCaptures = await captureReportMaps(groups, analysisZones, reportSettings, controller.signal,
        (done, count) => setReportProgress(`Capturando mapa satelital: ${done} de ${count}`));
      controller.signal.throwIfAborted();
      setReportProgress("Construyendo gráficos y PDF...");
      const range = downloadTrackActivityReport({
        tracks: reportTracks,
        mapCaptures,
        total: listing.total,
        filters: reportFilters,
        onlyWithZones,
        onlyFavorites,
        limited: listing.limited,
        settings: reportSettings,
        quality: analysis,
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
      if (controller.signal.aborted) return;
      console.error("Error al generar el informe PDF", error);
      toast.error(error instanceof Error ? error.message : "No se pudo generar el informe PDF.");
    } finally {
      setIsGeneratingReport(false);
      setReportProgress("");
      reportController.current = null;
    }
  }, [
    visibility,
    filters,
    onlyWithZones,
    onlyFavorites,
    favoritesSummaries.data,
    analysisZones,
    reportSettings,
    isGeneratingReport,
  ]);

  return (
    <div className="w-full h-full grid grid-cols-12 overflow-hidden bg-bg-300 text-text-100">
      {reportDialogOpen && <ReportSettingsDialog settings={reportSettings} zones={analysisZones} categories={mergedTracks.map(t => t.behavior_class ?? 'sin_clasificar')} onChange={setReportSettings} onClose={() => setReportDialogOpen(false)} onGenerate={handleGenerateReport} />}
      {isGeneratingReport && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-99999 rounded-lg border border-border bg-bg-100 px-5 py-3 text-sm text-text-100 shadow-xl">{reportProgress}<button type="button" className="ml-4 underline" onClick={() => { reportController.current?.abort(); setReportProgress("Cancelando..."); }}>Cancelar</button></div>}
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
          onGenerateReport={openReportSettings}
          isGeneratingReport={isGeneratingReport}
        />
      </aside>
      <div className="col-span-9 xl:col-span-10 h-full relative overflow-hidden">
        <TrackPlaybackMap
          tracks={visiblePlaybackTracks}
          playbackIndex={playback.index}
          activeTrackKey={playback.activeTrackKey}
          trackIndices={playback.trackIndices}
          onSelectTrack={playback.selectTrack}
          zones={zones}
          loading={playback.loading}
        />
        <PlaybackControls
          tracks={playback.playbackTracks.filter(t => isBehaviorVisible(t.summary.behavior_class, visibility))}
          totalTracks={visiblePlaybackTracks.length}
          onShowAll={() => playback.selectTrack(null)}
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
