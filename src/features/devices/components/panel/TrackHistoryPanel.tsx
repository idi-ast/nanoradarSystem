import { useMemo, memo } from "react";
import { IconX, IconRoute, IconClock, IconSpeedboat } from "@tabler/icons-react";
import type { RadarTarget, TrackHistoryPoint } from "../../types";
import { DEVICE_LABEL, DEVICE_COLOR } from "../map/devicesConfig";
import { useTrackHistory } from "../../hooks/useTrackHistory";
import { HistoryRangeBar, type HistoryRange } from "../controls/HistoryRangeBar";

interface Props {
  target: RadarTarget;
  historyRange: HistoryRange;
  onHistoryRangeChange: (range: HistoryRange) => void;
  onClose: () => void;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export const TrackHistoryPanel = memo(function TrackHistoryPanel({
  target,
  historyRange,
  onHistoryRangeChange,
  onClose,
}: Props) {
  const deviceLabel = DEVICE_LABEL[target.deviceType] ?? target.deviceType;
  const deviceColor = DEVICE_COLOR[target.deviceType] ?? "bg-slate-500/20 text-slate-300";
  const rawId = target.id.replace(/^(nanoRadar|magosradar|spotter)_/, "");

  const { data: backendHistory, isLoading } = useTrackHistory({
    trackId: rawId,
    tipoRadar: target.deviceType === "magosradar" ? "magos" : target.deviceType === "nanoRadar" ? "nano" : undefined,
  });

  // Merge in-memory history (reciente) + backend history (antiguo), deduplicando por timestamp
  const mergedHistory = useMemo(() => {
    const inMemoryPoints: TrackHistoryPoint[] = target.history.map(([lat, lon, ts]) => ({
      fecha: new Date(ts).toISOString(),
      lat,
      lon,
      speed: null,
      heading: null,
      snr: null,
      nivel: null,
      track_state: null,
      confidence: null,
      zona: null,
    }));

    const backendPoints = backendHistory?.points ?? [];

    // Usar un Map para deduplicar por timestamp (redondeado al segundo)
    const seen = new Map<string, TrackHistoryPoint>();

    for (const p of backendPoints) {
      const key = `${Math.round(new Date(p.fecha).getTime() / 1000)}`;
      seen.set(key, p);
    }
    for (const p of inMemoryPoints) {
      const key = `${Math.round(new Date(p.fecha).getTime() / 1000)}`;
      if (!seen.has(key)) {
        seen.set(key, p);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );
  }, [target.history, backendHistory]);

  // Slice by history range
  const slicedHistory = useMemo(() => {
    if (mergedHistory.length === 0) return [];
    const startIdx = Math.floor((historyRange.start / 100) * mergedHistory.length);
    const endIdx = Math.ceil((historyRange.end / 100) * mergedHistory.length);
    return mergedHistory.slice(startIdx, endIdx);
  }, [mergedHistory, historyRange]);

  // Límites temporales del historial completo (para mostrar fechas en la barra)
  const historyBounds = useMemo(() => {
    if (mergedHistory.length === 0) return undefined;
    return {
      minTime: new Date(mergedHistory[0].fecha).getTime(),
      maxTime: new Date(
        mergedHistory[mergedHistory.length - 1].fecha,
      ).getTime(),
    };
  }, [mergedHistory]);

  // Stats
  const stats = useMemo(() => {
    if (mergedHistory.length === 0) {
      return { totalPoints: 0, totalDistance: 0, firstTime: null, lastTime: null, duration: 0 };
    }
    let dist = 0;
    for (let i = 1; i < mergedHistory.length; i++) {
      dist += haversineDistance(
        mergedHistory[i - 1].lat,
        mergedHistory[i - 1].lon,
        mergedHistory[i].lat,
        mergedHistory[i].lon,
      );
    }
    const firstTime = new Date(mergedHistory[0].fecha).getTime();
    const lastTime = new Date(mergedHistory[mergedHistory.length - 1].fecha).getTime();
    return {
      totalPoints: mergedHistory.length,
      totalDistance: dist,
      firstTime,
      lastTime,
      duration: lastTime - firstTime,
    };
  }, [mergedHistory]);

  // Export merged history for parent (RadarTargetsLayer)
  // We expose it via a callback or we can store it in a ref
  // For now, we'll use a custom event or just pass it through props

  return (
    <div className="flex col-span-2 flex-col w-full h-full bg-bg-100 text-text-100 border-l border-s-border overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 bg-bg-200/50 border-b border-border-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-100/80">
            Historial del Track
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-300 transition-colors"
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-text-100">
            ID: {rawId.slice(-4)}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${deviceColor}`}>
            {deviceLabel}
          </span>
          <span
            className={`text-[10px] rounded px-2 py-0.5 ${
              target.nivel === 4 ? "bg-brand-100 text-text-100" : "bg-sky-500 text-text-100 font-bold"
            }`}
          >
            LVL {target.nivel}
          </span>
        </div>

        {target.speed != null && (
          <p className="text-[10px] text-text-200">
            Velocidad actual:{" "}
            <span className="text-sky-300 font-bold">{target.speed.toFixed(1)} km/h</span>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="shrink-0 grid grid-cols-2 gap-2 p-3 border-b border-border-200">
        <StatItem
          icon={<IconRoute size={14} />}
          label="Puntos"
          value={isLoading ? "..." : stats.totalPoints.toString()}
        />
        <StatItem
          icon={<IconSpeedboat size={14} />}
          label="Distancia"
          value={isLoading ? "..." : `${stats.totalDistance.toFixed(2)} km`}
        />
        <StatItem
          icon={<IconClock size={14} />}
          label="Primera vez"
          value={stats.firstTime ? formatTimeAgo(Date.now() - stats.firstTime) : "N/A"}
        />
        <StatItem
          icon={<IconClock size={14} />}
          label="Última vez"
          value={stats.lastTime ? formatTimeAgo(Date.now() - stats.lastTime) : "N/A"}
        />
      </div>

      {/* Timeline scrubber */}
      {mergedHistory.length > 1 && (
        <div className="shrink-0 border-b border-border-200">
          <p className="text-[9px] text-text-200 px-3 pt-2 uppercase tracking-wider">
            Línea de tiempo
          </p>
          <HistoryRangeBar
            onChange={onHistoryRangeChange}
            minTime={historyBounds?.minTime}
            maxTime={historyBounds?.maxTime}
          />
        </div>
      )}

      {/* Point list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-text-200 text-xs animate-pulse">Cargando historial...</span>
          </div>
        ) : slicedHistory.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-text-200 text-xs italic">Sin datos históricos en BD</span>
          </div>
        ) : (
          <div className="divide-y divide-border-200">
            {slicedHistory.map((point, i) => (
              <PointRow key={`${point.fecha}-${i}`} point={point} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-text-200">{icon}</span>
      <div className="flex flex-col">
        <span className="text-text-200 uppercase tracking-wider">{label}</span>
        <span className="text-text-100 font-bold">{value}</span>
      </div>
    </div>
  );
}

function PointRow({ point, index }: { point: TrackHistoryPoint; index: number }) {
  return (
    <div className="px-3 py-2 hover:bg-bg-200/30 transition-colors">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-mono text-text-200">
          #{index + 1}
        </span>
        <span className="text-[9px] text-text-200">
          {formatFecha(point.fecha)}
        </span>
      </div>
      <div className="flex gap-3 mt-0.5">
        <span className="text-[10px] text-text-100">
          {point.lat.toFixed(5)}, {point.lon.toFixed(5)}
        </span>
        {point.speed != null && (
          <span className="text-[10px] text-sky-300">
            {point.speed.toFixed(1)} km/h
          </span>
        )}
        {point.heading != null && (
          <span className="text-[10px] text-text-200">
            {point.heading.toFixed(0)}°
          </span>
        )}
      </div>
      {point.zona && (
        <span className="text-[9px] text-emerald-400 mt-0.5 inline-block">
          Zona: {point.zona}
        </span>
      )}
    </div>
  );
}
