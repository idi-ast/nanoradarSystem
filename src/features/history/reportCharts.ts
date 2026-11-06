import type { AnalysisPoint, AnalysisZone } from "./analysis";
import type { DayStats, HourStats, ReportSettings } from "./reportAnalytics";
import { isNight, normalizeZone } from "./reportAnalytics";

export const escapeXml = (text: unknown) => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
const text = (x: number, y: number, value: unknown, size = 8, color = '#475569', anchor = 'start') => `<text x="${x}" y="${y}" font-family="Roboto" font-size="${size}" fill="${color}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
const svg = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="white"/>${body}</svg>`;
const rect = (x: number, y: number, w: number, h: number, color: string) => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${color}"/>`;
export function hourlyChart(hours: HourStats[], settings: ReportSettings, mode: 'starts' | 'near' = 'starts') {
  const W = 515, H = 230, x0 = 38, y0 = 30, pw = 464, ph = 142;
  const maxValue = Math.max(1, ...hours.map(h => mode === 'starts' ? h.starts : isNight(h.hour, settings) ? h.near : 0));
  const step = Math.max(1, Math.ceil(maxValue / 4));
  const max = step * 4;
  let body = text(x0, 13, mode === 'starts' ? 'Tracks cuyo primer registro ocurre en esa hora' : 'Tracks distintos próximos a zonas críticas en horario nocturno', 9, '#0f172a');
  hours.forEach((h, i) => { if (isNight(h.hour, settings)) body += rect(x0 + i * pw / 24, y0, pw / 24, ph, '#f1f5f9'); });
  for (let i = 0; i <= 4; i++) {
    const y = y0 + ph - i * ph / 4;
    body += `<line x1="${x0}" y1="${y}" x2="${x0 + pw}" y2="${y}" stroke="#cbd5e1" stroke-width="0.5"/>`;
    body += text(x0 - 7, y + 3, i * step, 8, '#475569', 'end');
  }
  hours.forEach((h, i) => {
    const x = x0 + i * pw / 24 + 2, width = pw / 24 - 4;
    const count = mode === 'starts' ? h.starts : isNight(h.hour, settings) ? h.near : 0, height = count / max * ph;
    body += rect(x, y0 + ph - height, mode === 'starts' ? width * .58 : width, height, mode === 'starts' ? '#0284c7' : '#d97706');
    if (mode === 'starts') body += rect(x + width * .62, y0 + ph - h.boatStarts / max * ph, width * .38, h.boatStarts / max * ph, '#0d9488');
    if (count) body += text(x + width / 2, y0 + ph - height - 4, count, 6.5, '#0f172a', 'middle');
    body += text(x + width / 2, y0 + ph + 13, String(h.hour).padStart(2, '0'), 7, '#475569', 'middle');
  });
  body += text(x0 + pw / 2, 202, `Hora local - ${settings.timeZone}`, 8, '#475569', 'middle');
  body += rect(38, 215, 8, 8, mode === 'starts' ? '#0284c7' : '#d97706') + text(51, 222, mode === 'starts' ? 'Todos los tracks' : 'Proximidad nocturna observada', 8);
  if (mode === 'starts') body += rect(177, 215, 8, 8, '#0d9488') + text(190, 222, 'Clasificados como embarcación', 8);
  body += text(502, 222, 'Fondo gris: franja nocturna', 7, '#64748b', 'end');
  return svg(W, H, body);
}

export function activityMatrix(days: DayStats[], settings: ReportSettings) {
  const W = 515, x0 = 67, y0 = 28, cw = 18, rh = 16, H = y0 + days.length * rh + 44;
  const max = Math.max(1, ...days.flatMap(d => d.trackingSeconds.map(s => s / 60)));
  let body = text(0, 10, 'Tiempo de trackeo observado por día y hora (minutos, muestra)', 9, '#0f172a');
  for (let h = 0; h < 24; h++) body += text(x0 + h * cw + cw / 2, 23, String(h).padStart(2, '0'), 7, isNight(h, settings) ? '#b45309' : '#64748b', 'middle');
  days.forEach((day, i) => {
    body += text(0, y0 + i * rh + 11, day.day, 7.5);
    day.trackingSeconds.forEach((seconds, h) => {
      const count = seconds / 60;
      const ratio = count / max;
      const color = !count ? '#f1f5f9' : ratio <= .5 ? `rgb(${Math.round(34 + 440 * ratio)},${Math.round(197 + 4 * ratio)},${Math.round(94 - 146 * ratio)})` : `rgb(${Math.round(254 - 68 * (ratio - .5))},${Math.round(199 - 322 * (ratio - .5))},${Math.round(21 + 34 * (ratio - .5))})`;
      body += rect(x0 + h * cw, y0 + i * rh, cw - 1, rh - 1, color);
      if (count) body += text(x0 + h * cw + (cw - 1) / 2, y0 + i * rh + 10.5, count < .1 ? '<0,1' : count.toLocaleString('es-CL', { maximumFractionDigits: 1 }), 6, count / max > .6 ? '#ffffff' : '#0f172a', 'middle');
    });
  });
  body += text(0, H - 17, `Escala: 0 a ${max.toLocaleString('es-CL', { maximumFractionDigits: 1 })} min/celda. Verde: menor tiempo; rojo: mayor tiempo.`, 7);
  body += text(0, H - 5, 'Cero indica ausencia de posiciones en la muestra; no acredita disponibilidad continua del radar.', 7);
  return svg(W, H, body);
}

export function spatialChart(points: AnalysisPoint[], zones: AnalysisZone[], settings: ReportSettings, focus = false, trajectories = false) {
  const W = 515, H = 264, x0 = 42, y0 = 17, pw = 459, ph = 200;
  const critical = zones.filter(z => settings.criticalZones.map(normalizeZone).includes(normalizeZone(z.nombre)));
  const displayedZones = focus ? critical : zones;
  const vertices = displayedZones.flatMap(z => z.vertices);
  const zoneBounds = critical.map(z => {
    const lats = z.vertices.map(v => v[0]), lons = z.vertices.map(v => v[1]);
    const margin = Math.max(settings.proximityM * 3, 300) / 111320;
    const lonMargin = margin / Math.max(.1, Math.cos(lats[0] * Math.PI / 180));
    return { minLat: Math.min(...lats) - margin, maxLat: Math.max(...lats) + margin, minLon: Math.min(...lons) - lonMargin, maxLon: Math.max(...lons) + lonMargin };
  });
  const samples = focus && critical.length ? points.filter(p => zoneBounds.some(b => p.lat >= b.minLat && p.lat <= b.maxLat && p.lon >= b.minLon && p.lon <= b.maxLon)) : points;
  const coords = [...vertices, ...samples.map(p => [p.lat, p.lon])];
  if (!coords.length) return svg(W, H, text(30, 80, 'Sin posiciones o polígonos válidos para representar.', 10));
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lat, lon] of coords) { minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); }
  const cos = Math.max(.1, Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
  const wM = Math.max((maxLon - minLon) * 111320 * cos, focus ? settings.proximityM * 4 : 200), hM = Math.max((maxLat - minLat) * 111320, focus ? settings.proximityM * 4 : 200);
  const scale = Math.min(pw / (wM * 1.15), ph / (hM * 1.15));
  const cx = (minLon + maxLon) / 2, cy = (minLat + maxLat) / 2;
  const x = (lon: number) => x0 + pw / 2 + (lon - cx) * 111320 * cos * scale;
  const y = (lat: number) => y0 + ph / 2 - (lat - cy) * 111320 * scale;
  const cols = 42, rows = 20, cells = new Uint32Array(cols * rows);
  for (const p of samples) {
    const col = Math.floor((x(p.lon) - x0) / pw * cols), row = Math.floor((y(p.lat) - y0) / ph * rows);
    if (col >= 0 && col < cols && row >= 0 && row < rows) cells[row * cols + col]++;
  }
  const max = Math.max(1, ...cells);
  let body = rect(x0, y0, pw, ph, '#f8fafc');
  if (!trajectories) cells.forEach((n, i) => {
    if (!n) return;
    const r = Math.log1p(n) / Math.log1p(max);
    body += rect(x0 + i % cols * pw / cols, y0 + Math.floor(i / cols) * ph / rows, pw / cols, ph / rows, r > .75 ? '#dc2626' : r > .5 ? '#f97316' : r > .25 ? '#facc15' : '#bae6fd');
  });
  let trajectoryLabels = '';
  let trajectoryTrackCount = 0;
  if (trajectories) {
    const tracks = new Map<string, AnalysisPoint[]>();
    for (const p of samples) {
      if (!p.trackKey) continue;
      if (!tracks.has(p.trackKey)) tracks.set(p.trackKey, []);
      tracks.get(p.trackKey)!.push(p);
    }
    trajectoryTrackCount = tracks.size;
    const colors = ['#0369a1', '#be123c', '#15803d', '#7e22ce', '#c2410c', '#0f766e', '#a16207', '#475569'];
    [...tracks.values()].forEach((series, i) => {
      series.sort((a, b) => Date.parse(a.fecha!) - Date.parse(b.fecha!));
      const color = colors[i % colors.length];
      for (let n = 0; n < series.length; n++) {
        const p = series[n], prev = series[n - 1];
        if (prev && Date.parse(p.fecha!) - Date.parse(prev.fecha!) <= settings.maxGapSeconds * 1000) body += `<line x1="${x(prev.lon)}" y1="${y(prev.lat)}" x2="${x(p.lon)}" y2="${y(p.lat)}" stroke="${color}" stroke-width="1.3"/>`;
        body += `<circle cx="${x(p.lon)}" cy="${y(p.lat)}" r="1.3" fill="${color}"/>`;
      }
      const end = series[series.length - 1];
      if (i >= 8) return;
      const labelX = x0 + pw - 95, labelY = y0 + 16 + i * 20;
      trajectoryLabels += `<line x1="${x(end.lon)}" y1="${y(end.lat)}" x2="${labelX - 5}" y2="${labelY - 3}" stroke="${color}" stroke-width="0.5" stroke-dasharray="2 2"/>`;
      trajectoryLabels += rect(labelX - 3, labelY - 11, 95, 15, '#ffffff') + text(labelX, labelY, end.trackId ?? end.trackKey, 7, color);
    });
  }
  displayedZones.forEach((z, i) => {
    const isCritical = critical.includes(z), color = isCritical ? '#be123c' : '#334155';
    body += `<polygon points="${z.vertices.map(([lat, lon]) => `${x(lon)},${y(lat)}`).join(' ')}" fill="none" stroke="white" stroke-width="3.5"/><polygon points="${z.vertices.map(([lat, lon]) => `${x(lon)},${y(lat)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${isCritical ? 1.8 : 1}"/>`;
    const lat = z.vertices.reduce((a, v) => a + v[0], 0) / z.vertices.length, lon = z.vertices.reduce((a, v) => a + v[1], 0) / z.vertices.length;
    body += rect(x(lon) - 7, y(lat) - 15, 14, 14, '#ffffff') + text(x(lon), y(lat) - 4, `${i + 1}`, 9, color, 'middle');
  });
  body += trajectoryLabels;
  body += `<path d="M 488 42 L 488 24 L 484 31 M 488 24 L 492 31" stroke="#0f172a" fill="none"/>` + text(488, 19, 'N', 8, '#0f172a', 'middle');
  const barM = Math.max(10, Math.pow(10, Math.floor(Math.log10(80 / scale))));
  body += rect(x0 + 9, y0 + ph - 12, barM * scale, 2, '#0f172a') + text(x0 + 9, y0 + ph - 16, `${barM} m`, 7, '#0f172a');
  body += text(0, 12, 'Latitud', 7) + text(0, y0 + 8, (cy + ph / 2 / scale / 111320).toFixed(4), 6.5) + text(0, y0 + ph, (cy - ph / 2 / scale / 111320).toFixed(4), 6.5);
  body += text(x0, 229, (cx - pw / 2 / scale / 111320 / cos).toFixed(4), 7) + text(x0 + pw, 229, (cx + pw / 2 / scale / 111320 / cos).toFixed(4), 7, '#475569', 'end');
  body += text(x0 + pw / 2, 229, 'Longitud', 7, '#475569', 'middle');
  if (!trajectories) ['#bae6fd', '#facc15', '#f97316', '#dc2626'].forEach((c, i) => { body += rect(x0 + i * 14, 241, 14, 7, c); });
  body += text(trajectories ? x0 : 106, 247, trajectories ? trajectoryTrackCount > 8 ? 'Hasta 8 etiquetas visibles. Selecciona un track en la tabla para aislarlo.' : 'Trazados por track · Etiquetas unidas al último punto observado' : `1 - ${max} posiciones/celda · escala logarítmica`, 7);
  body += text(x0, 260, trajectories ? 'Esquema geográfico. Los trazados respetan el hueco máximo configurado.' : 'Esquema geográfico sin imagen satelital. Densidad de posiciones, no de embarcaciones únicas.', 7);
  return svg(W, H, body);
}

export function weekdayChart(days: DayStats[]) {
  const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const rows = names.map(label => ({ label, count: 0, boats: 0, dates: 0 }));
  for (const day of days) {
    const row = rows[new Date(`${day.day}T12:00:00Z`).getUTCDay()];
    row.count += day.starts; row.boats += day.boatStarts; row.dates++;
  }
  const max = Math.max(1, ...rows.map(r => r.count)), x0 = 113, plotW = 282;
  let body = text(0, 13, 'Inicios por día de la semana y fechas incluidas', 9, '#0f172a');
  rows.forEach((r, i) => {
    const y = 32 + i * 25;
    body += text(0, y + 10, r.label, 8);
    body += text(62, y + 10, `${r.dates} día(s)`, 7, '#64748b');
    body += rect(x0, y, plotW, 14, '#f1f5f9');
    body += rect(x0, y, plotW * r.count / max, 14, '#0284c7');
    body += text(x0 + plotW + 8, y + 10, r.dates ? `${r.count} (${r.boats} embarc.)` : 'Sin fecha en rango', 7);
  });
  body += text(0, 223, 'Conteos totales, sin normalización semanal. Comparar junto con las fechas incluidas y su duración.', 7);
  return svg(515, 232, body);
}
