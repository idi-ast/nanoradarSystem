import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router';

const alias = { '@': `${process.cwd()}/src` };
const pure = await build({ alias, entryPoints: ['src/features/analysis/analyticsData.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
const pureModule = { exports: {} };
new Function('module', 'exports', pure.outputFiles[0].text)(pureModule, pureModule.exports);
const helpers = pureModule.exports;
const { parseChileDateTime, validateAnalysisFilters, dateTimeInput, aggregateHeatCells } = helpers;
const filters = { from: '2026-11-02T00:00', to: '2026-11-03T00:00', radar: '', minPoints: 2, proximityM: 100 };
assert.equal(parseChileDateTime(filters.from), '2026-11-02T03:00:00.000Z');
assert.equal(parseChileDateTime('2026-07-02T00:00'), '2026-07-02T04:00:00.000Z');
assert.equal(dateTimeInput(new Date('2026-11-03T02:00:00Z')), '2026-11-02T23:00');
assert.throws(() => parseChileDateTime('2026-02-30T10:00'));
assert.throws(() => parseChileDateTime('2026-09-06T00:30'), /no existe/);
assert.equal(Date.parse(parseChileDateTime('2026-04-04T23:30', 'end')) - Date.parse(parseChileDateTime('2026-04-04T23:30', 'start')), 3600000);
assert.throws(() => validateAnalysisFilters({ ...filters, from: filters.to }));
assert.throws(() => validateAnalysisFilters({ ...filters, minPoints: 0 }));
assert.throws(() => validateAnalysisFilters({ ...filters, proximityM: 0 }));
const settings = { timeZone: 'America/Santiago', nightStart: 21, nightEnd: 7, criticalZones: ['modulo'], proximityM: 100, maxGapSeconds: 120 };
const raw = Array.from({ length: 20000 }, (_, i) => ({ lat: -41.5 + i % 200 * .0001, lon: -73 + Math.floor(i / 200) * .0001, fecha: i % 2 ? '2026-11-03T00:30:00Z' : '2026-11-02T23:30:00Z', zona: null, trackKey: String(i % 100) }));
const grid = aggregateHeatCells(raw, settings, false, 40);
assert.ok(grid.cells.length <= 40);
assert.equal(grid.cells.reduce((n, c) => n + c.positions, 0), raw.length, 'Aggregation must retain every position');
assert.equal(aggregateHeatCells(raw, settings, true).positionCount, raw.length / 2);
assert.equal(aggregateHeatCells([], settings).cells.length, 0);
assert.equal(aggregateHeatCells([{ ...raw[0], lat: NaN }], settings).positionCount, 0);
const crossing = aggregateHeatCells([{ ...raw[0], lat: -1, lon: -1 }, { ...raw[0], lat: 1, lon: 1 }], settings, false, 1);
assert.equal(crossing.cells.length, 1);
assert.equal(crossing.cells[0].tracks, 1);

// Trajectory geometry separates gaps, radars and invalid or duplicate observations.
const geometryBuild = await build({alias, entryPoints:['src/features/analysis/trackTrajectories.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const geometry = {exports:{}};
new Function('module','exports',geometryBuild.outputFiles[0].text)(geometry,geometry.exports);
const position = (key, seconds, lat = -41) => ({trackKey:key,trackId:'T1',radar:key,fecha:new Date(Date.parse('2026-11-02T03:00:00Z')+seconds*1000).toISOString(),lat,lon:-73,zona:null});
const trajectories = geometry.exports.buildTrackTrajectories([position('magos',0),position('magos',60),position('magos',60),position('magos',600),position('magos',660),position('nano',0),position('nano',60),position('invalid',0,NaN)],120);
assert.equal(trajectories.lines.features.length,2);
assert.equal(trajectories.lines.features[0].geometry.coordinates.length,2,'Never join the long gap');
assert.equal(trajectories.markers.features.length,6,'Skip invalid and duplicate positions');
assert.notEqual(trajectories.lines.features[0].properties.trackKey,trajectories.lines.features[1].properties.trackKey);
assert.equal(geometry.exports.buildTrackTrajectories([position('single',0)],120).lines.features.length,0);

// Execute the real query function against controlled services, including cancellation.
const code = readFileSync('src/features/analysis/hooks/useActivityAnalysis.ts', 'utf8');
const js = (await import('typescript')).default.transpileModule(code, { compilerOptions: { module: 1, target: 9 } }).outputText;
const calls = [];
const context = { exports: {}, require(name) {
 if (name === '@tanstack/react-query') return { useQuery: options => options };
 if (name === '../analyticsData') return helpers;
 if (name === '../activityApi') return { fetchActivityAnalysis: async (...args) => { calls.push(['activity', args]); return { range: args[0], listing: { tracks: [], total: 0, limited: false }, spatial: { points: [], tracksAnalyzed: 0, tracksTotal: 0, pointsLimited: false } }; } };
 throw Error(name);
}, Date };
runInNewContext(js, context);
const options = context.exports.useActivityAnalysis(filters);
assert.equal(options.gcTime, 0);
assert.equal(options.structuralSharing, false);
assert.equal(options.refetchOnWindowFocus, false);
assert.deepEqual(Array.from(options.queryKey), Array.from(context.exports.useActivityAnalysis({ ...filters, proximityM: 300 }).queryKey));
const abort = new AbortController();
const data = await options.queryFn({ signal: abort.signal });
assert.equal(calls.length, 1);
assert.equal(data.range.from, '2026-11-02T03:00:00.000Z');
assert.equal(calls[0][1][3], abort.signal);
const stopped = new AbortController(); stopped.abort();
await assert.rejects(options.queryFn({ signal: stopped.signal }));
assert.equal(calls.length, 1, 'An aborted load must not start the analytical request');

// Exercise the real batch adapter: identical IDs from different radars must
// retain separate identities, and malformed/duplicate positions stay excluded.
const apiCode = (await import('typescript')).default.transpileModule(readFileSync('src/features/analysis/activityApi.ts', 'utf8'), { compilerOptions: { module: 1, target: 9 } }).outputText;
const batchTracks = ['magos', 'nano'].map(tipo_radar => ({ track_id: 'T1', tipo_radar, first_seen: '2026-11-02T03:00:00Z', last_seen: '2026-11-03T03:00:00Z', point_count: 3, nivel_max: 1, zones: [] }));
const batchPoint = { lat: -41, lon: -73, fecha: '2026-11-02T04:00:00Z', zona: null };
const apiCalls = [];
const apiContext = { exports: {}, require(name) {
 if (name === '@/features/history/types') return { analysisTrackKey: t => JSON.stringify([t.tipo_radar, t.track_id, t.first_seen, t.last_seen]) };
 if (name === '@/apis/apiSystem') return { apiSystem: { get: async (...args) => { apiCalls.push(args); return { data: { listing: { tracks: batchTracks, total: 2, limited: false }, spatial: { points: [{ ...batchPoint, trackIndex: 0 }, { ...batchPoint, trackIndex: 0 }, { ...batchPoint, trackIndex: 1 }, { ...batchPoint, trackIndex: 5 }, { ...batchPoint, trackIndex: 0, lat: 91 }, { ...batchPoint, trackIndex: 0, fecha: '2026-11-01T00:00:00Z' }], tracksAnalyzed: 2, tracksTotal: 2, pointsLimited: false }, timings: { totalMs: 10 } } }; } } };
 throw Error(name);
}, Date, Set };
runInNewContext(apiCode, apiContext);
const batched = await apiContext.exports.fetchActivityAnalysis(data.range, 'magos', 2, abort.signal);
assert.equal(apiCalls.length, 1);
assert.equal(apiCalls[0][0], '/analysis/activity');
assert.equal(apiCalls[0][1].tipo_radar, 'magos');
assert.equal(apiCalls[0][2].signal, abort.signal);
assert.equal(batched.spatial.points.length, 2);
assert.equal(batched.spatial.invalidPoints, 3);
assert.notEqual(batched.spatial.points[0].trackKey, batched.spatial.points[1].trackKey);
await assert.rejects(apiContext.exports.fetchActivityAnalysis(data.range, '', 2, stopped.signal));
assert.equal(apiCalls.length, 1);

// Render the actual page with isolated query fixtures; no credentials or backend.
mkdirSync('tmp/analysis', { recursive: true });
const output = 'tmp/analysis/page.cjs';
await build({ alias, entryPoints: {page:'src/features/analysis/ActivityAnalysisPage.tsx',explorer:'src/features/analysis/components/TrackExplorer.tsx'}, outdir:'tmp/analysis', outExtension:{'.js':'.cjs'}, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react-dom/server', 'react-router', 'recharts', 'react-map-gl', '@tanstack/react-query'], plugins: [{ name: 'controlled-page-queries', setup(b) {
 b.onResolve({ filter: /hooks\/useActivityAnalysis$|hooks\/useZones$|components\/baseMap\/libs$|services\/radarService$|^react-map-gl$/ }, args => ({ path: args.path, namespace: 'analysis-fixtures' }));
 b.onLoad({ filter: /.*/, namespace: 'analysis-fixtures' }, args => ({ contents: args.path === 'react-map-gl' ? 'import {createElement} from "react"; const Container=({children})=>createElement("div",null,children); export default Container; export {Container as Source}; export const Layer=()=>null; export const Marker=Container; export const Popup=Container; export const NavigationControl=()=>null; export const useMap=()=>({current:null});' : args.path.endsWith('radarService') ? 'export async function fetchTrackHistory(){return {points:[],total_points:0,sampled:false};}' : args.path.endsWith('useActivityAnalysis') ? 'export function useActivityAnalysis(){return globalThis.__activityPageFixture.result;}' : args.path.endsWith('useZones') ? 'export function useZones(){return globalThis.__activityPageFixture.zones;}' : 'export const MAPBOX_TOKEN=""; export const MAP_STYLES={satellite:""};', loader: 'js' }));
} }] });
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const Page = require(`../${output}`).default;
const track = { track_id: 'T-DEMO', tipo_radar: 'magos', first_seen: '2026-11-02T21:00:00-03:00', last_seen: '2026-11-02T21:02:00-03:00', point_count: 3, nivel_max: 5, zones: ['modulo'], behavior_class: 'lancha' };
const trackKey = JSON.stringify([track.tipo_radar, track.track_id, track.first_seen, track.last_seen]);
const point = { lat: -41.4995, lon: -73.0005, fecha: track.first_seen, trackKey, zona: 'modulo' };
const fixture = { result: { isPending: false, isFetching: false, isError: false, refetch() {}, data: { listing: { tracks: [track], total: 1, limited: false }, spatial: { points: [point], tracksAnalyzed: 1, tracksTotal: 1, pointsLimited: false, uniformSampling: true }, range: validateAnalysisFilters(filters), loadedAt: '2026-11-03T03:00:00Z' } }, zones: { data: [{ nombre: 'modulo', poligono: { color: '#ef4444', vertices: [[-41.5, -73.001], [-41.5, -73], [-41.499, -73], [-41.499, -73.001]] } }], isError: false } };
globalThis.__activityPageFixture = fixture;
const render = () => renderToStaticMarkup(createElement(QueryClientProvider, {client:new QueryClient()}, createElement(MemoryRouter, null, createElement(Page))));
const html = render();
for (const text of ['Análisis de actividad', 'Actividad por hora', 'Recorridos de tracks', 'Distancia recorrida y tiempo de trackeo', 'Tiempo enlazado', 'Calendario de actividad', 'T-DEMO', 'Ver en mapa', 'America/Santiago']) assert.ok(html.includes(text), text);
const loadedFixture = fixture.result;
fixture.result = { ...loadedFixture, data: { ...loadedFixture.data, listing: { tracks: [], total: 0, limited: false }, spatial: { points: [], tracksAnalyzed: 0, tracksTotal: 0, pointsLimited: false } } };
assert.ok(render().includes('No hay tracks para esta selección'));
fixture.result = { ...loadedFixture, data: undefined, isPending: true, isFetching: true };
assert.ok(render().includes('Generando reporte'));
fixture.result = { ...fixture.result, isPending: false, isFetching: false, isError: true };
assert.ok(render().includes('No se pudo cargar el análisis'));
// Render a selected track against an already-loaded detail query. This verifies
// its own route metrics, coordinates and proximity instead of overview totals.
const {TrackExplorer} = require('../tmp/analysis/explorer.cjs');
const client = new QueryClient();
const detailPoints = [point, {...point,fecha:track.last_seen,lat:point.lat+.0001}];
const detailData = {...loadedFixture.data.spatial,points:detailPoints};
client.setQueryData(['analysis-track-detail',trackKey,loadedFixture.data.range.from,loadedFixture.data.range.to,120],detailData);
const explorerHtml = renderToStaticMarkup(createElement(QueryClientProvider,{client},createElement(TrackExplorer,{
 analysis:{tracks:[track],points:[point],settings:{...settings,minApproachPoints:100,category:'lancha',format:'detailed',movementSort:'distance',showHeatmap:false}},
 zones:[{nombre:'modulo',vertices:[[-41.5,-73.001],[-41.5,-73],[-41.499,-73],[-41.499,-73.001]]}],
 spatial:loadedFixture.data.spatial,range:loadedFixture.data.range,selectedKey:trackKey,onSelect(){},focus:null,mode:'scheme',onModeChange(){},
})));
for (const text of ['Detalle del track','Tiempo enlazado acumulado','Primera detección','Velocidad máxima','Proximidad a zonas críticas','Últimas 2 posiciones observadas','Ver todos los recorridos']) assert.ok(explorerHtml.includes(text),text);
assert.ok(explorerHtml.includes('2 min'),'The selected track must use the expanded positions');
client.clear();
delete globalThis.__activityPageFixture;
console.log('PASS: Chile/DST dates, filter validation, bounded heat grid, query/cancellation and page render states');
