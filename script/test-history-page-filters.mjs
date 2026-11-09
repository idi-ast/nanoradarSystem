// Component wiring regression: node script/test-history-page-filters.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, AbortController, console, require: name => name in mocks ? mocks[name] : require(name) });
  return exports;
}
const helpers = load('src/features/history/filters.ts');
const track = { track_id: 'T23', tipo_radar: 'magos', behavior_class: 'lancha', point_count: 120, zones: [] };
const playbackTrack = { summary: track, points: [] };
const historyFilters = { search: 'T23', from: '2026-06-01T15:00', to: '2026-06-01T16:00', minPoints: 10, minTrackedMinutes: 200, behaviorClass: 'bolla', tipoRadar: 'nano', zone: 'otra' };
const period = { fromDate: '2026-11-08', toDate: '2026-11-09' };
const settings = { nightStart: 21, nightEnd: 7, timeZone: 'America/Santiago', category: 'lancha', minTrackedMinutes: 0, maxGapSeconds: 120, minApproachPoints: 100, criticalZones: ['otra'] };
const states = [historyFilters, period, 1, true, true, false, true, settings, ''];
let cursor = 0;
const state = { useState: init => {
  const i = cursor++;
  if (!(i in states)) states[i] = typeof init === 'function' ? init() : init;
  return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
}, useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {}, useRef: value => ({ current: value }) };
const calls = {};
const page = load('src/features/history/pages/HistoryPage.tsx', {
  react: state,
  '@/features/devices/config/behaviorCategories': { isBehaviorVisible: () => false },
  '@/features/devices/stores/behaviorVisibilityStore': { useBehaviorVisibilityStore: fn => fn({ visibility: {} }) },
  '../hooks/useTrackSummaries': {
    useTrackSummaries: (...args) => { calls.history = args; return { data: { tracks: [track], total: 1, pages: 1 } }; },
    useFavoriteTrackSummaries: enabled => { calls.favoritesEnabled = enabled; return { data: [] }; },
  },
  '../hooks/useZones': { useZones: () => ({ data: [] }) },
  '../hooks/useTrackPlayback': { trackKey: t => `${t.tipo_radar}:${t.track_id}`, useTrackPlayback: () => ({ tracks: [playbackTrack], playbackTracks: [playbackTrack] }) },
  '../components/HistoryListPanel': { HistoryListPanel: 'history-list' },
  '../components/TrackPlaybackMap': { TrackPlaybackMap: 'playback-map' },
  '../components/PlaybackControls': { PlaybackControls: 'playback-controls' },
  '../components/ReportSettingsDialog': { ReportSettingsDialog: 'report-dialog' },
  '../types': { TRACKS_PAGE_SIZE: 100, analysisTrackKey: t => JSON.stringify([t.tipo_radar,t.track_id,t.first_seen,t.last_seen]) },
  '../api': { fetchReportTrackSummaries: async (...args) => { calls.report = args; return { tracks: [track], total: 1, limited: false }; } },
  '../analysis': { fetchAnalysisPoints: async (...args) => { calls.analysis = args; return { points: [], tracksAnalyzed: 1 }; } },
  '@/features/devices/components/map/utils/geoHelpers': { extractZoneVertices: () => [] },
  sonner: { toast: { success: () => {}, warning: msg => assert.fail(msg), error: msg => assert.fail(msg) } },
  '../reportAnalytics': { DEFAULT_REPORT_SETTINGS: settings, filterReportTracks: tracks => tracks, isValidAnalysisZone: () => true, normalizeZone: s => s },
  '../filters': helpers,
  '../report': {
    resolveReportRange: filters => ({ from: new Date(filters.from), to: new Date(filters.to) }),
    downloadTrackActivityReport: options => { calls.pdf = options; return { from: new Date(options.filters.from), to: new Date(options.filters.to) }; },
  },
  '../captureReportMaps': { captureReportMaps: async () => [] },
  '../reportMapData': { reportMapDetails: () => [], nightMapGroups: (...args) => { calls.night = args; return []; } },
}).default;
function render() { cursor = 0; return page(); }
function find(node, type) {
  if (!node || typeof node !== 'object') return;
  if (node.type === type) return node.props;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = find(child, type);
    if (found) return found;
  }
}
let tree = render();
assert.equal(JSON.stringify(calls.history[0]), JSON.stringify({ minPoints: 1, trackIds: ['T23'] }));
assert.equal(calls.history[3], false, 'zone-only restriction must be bypassed');
assert.equal(calls.favoritesEnabled, false, 'favorites must not replace ID results');
assert.equal(find(tree, 'history-list').tracks[0], track, 'hidden category must not hide ID result');
assert.equal(find(tree, 'playback-map').tracks[0], playbackTrack);
assert.equal(find(tree, 'playback-controls').tracks[0], playbackTrack);
await find(tree, 'report-dialog').onGenerate();
assert.equal(calls.report[0].from, '2026-11-08T03:00:00.000Z');
assert.equal(calls.report[0].to, '2026-11-10T02:59:59.999Z');
assert.equal(calls.report[0].behaviorClass, 'lancha');
assert.equal(calls.report[0].hourStart, 21);
assert.equal(calls.report[0].hourEnd, 7);
assert.equal(calls.report[0].timeZone, 'America/Santiago');
assert.equal(calls.analysis[1].hourStart, 21);
assert.equal(calls.analysis[1].retryAttempts, 1);
assert.equal(calls.analysis[1].priorityTrackKeys.length, 1);
assert.equal(calls.analysis[1].hourEnd, 7);
assert.equal(calls.report[0].minTrackedMinutes, 0);
assert.equal(calls.report[1], false);
assert.equal(calls.analysis[0][0], track, 'report includes category hidden in history');
assert.equal(calls.analysis[1].from, calls.report[0].from);
assert.equal(calls.night[2].toISOString(), calls.report[0].from);
assert.equal(calls.pdf.onlyFavorites, false);
assert.equal(calls.pdf.onlyWithZones, false);
assert.equal(calls.pdf.settings, settings);
// Reopening must preserve zones chosen in the report dialog.
const reopen = find(tree, 'history-list').onGenerateReport;
reopen();
states[7] = { ...settings, criticalZones: ['zona elegida'] };
reopen();
assert.equal(states[7].criticalZones[0], 'zona elegida');
// Clearing the ID restores the original history filters and favorite mode.
find(tree, 'history-list').onFiltersChange({ ...historyFilters, search: '' });
tree = render();
assert.equal(calls.history[0].zone, 'otra');
assert.equal(calls.history[0].minTrackedMinutes, 200);
assert.equal(calls.history[3], true);
assert.equal(calls.favoritesEnabled, true);
assert.equal(find(tree, 'history-list').page, 1);
console.log('PASS: HistoryPage ID bypass, favorite and visibility bypass, independent PDF pipeline and restored history filters');
