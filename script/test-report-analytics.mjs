import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {build} from 'esbuild';
const built = await build({entryPoints:['src/features/history/reportAnalytics.ts'], bundle:true, platform:'node', format:'cjs', write:false});
const exports = {}, mod = {exports};
new Function('module', 'exports', built.outputFiles[0].text)(mod, exports);
const {computeOperationalAnalysis, distanceToZoneM, localParts, isNight, DEFAULT_REPORT_SETTINGS, normalizeZone, filterReportApproaches, filterReportTracks, normalizeReportCategory} = mod.exports;
function load(file, mocks) {
 const require = createRequire(new URL(`../${file}`, import.meta.url));
 const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports = {};
 runInNewContext(source,{exports,require: name=>name in mocks ? mocks[name] : require(name),console});
 return exports;
}
const types = load('src/features/history/types.ts',{});
const zone = {nombre:'módulo',vertices:[[0,0],[0,.001],[.001,.001],[.001,0]]};
assert.equal(normalizeZone(' MÓDULO '),'modulo');
assert.equal(distanceToZoneM(.0005,.0005,zone.vertices),0);
assert.ok(Math.abs(distanceToZoneM(.0005,.002,zone.vertices)-111.32)<.1);
assert.equal(distanceToZoneM(0,0,zone.vertices),0);
assert.equal(isNight(21,DEFAULT_REPORT_SETTINGS),true);
assert.equal(isNight(6,DEFAULT_REPORT_SETTINGS),true);
assert.equal(isNight(7,DEFAULT_REPORT_SETTINGS),false);
assert.equal(isNight(20,DEFAULT_REPORT_SETTINGS),false);
assert.equal(localParts('2026-11-03T00:30:00Z').hour,21);
const from = new Date('2026-11-02T00:00:00-03:00'), to = new Date('2026-11-03T00:00:00-03:00');
const track = {track_id:'T1',tipo_radar:'magos',first_seen:'2026-11-02T21:00:00-03:00',last_seen:'2026-11-02T21:20:00-03:00',point_count:100,nivel_max:5,zones:['modulo'],behavior_class:'lancha'};
const key = types.analysisTrackKey(track);
const points = ['21:00:00','21:01:00','21:02:00','21:20:00'].map(t=>({trackKey:key,fecha:`2026-11-02T${t}-03:00`,lat:.0005,lon:.0005,zona:null}));
const analysis = computeOperationalAnalysis({tracks:[track,track],points:[...points,points[0],{...points[0],trackKey:'other'}],zones:[zone],from,to});
assert.equal(analysis.tracks.length,1);
assert.equal(analysis.points.length,4);
assert.equal(analysis.hourly[21].present,1,'Sampling rate must not inflate unique track presence');
assert.equal(analysis.nightBoats,1);
assert.equal(analysis.nearNightTracks,1);
assert.equal(analysis.approaches[0].observedSeconds,120,'Do not bridge the 18-minute gap');
assert.equal(analysis.approaches[0].episodes,2);
assert.equal(analysis.approaches[0].priority,'Alta');
assert.equal(analysis.rejectedPoints,1);
assert.equal(analysis.days.length,1);
assert.equal(analysis.hourly.reduce((sum,h)=>sum+h.exposureHours,0),24);
const noZone = computeOperationalAnalysis({tracks:[track],points,zones:[],from,to});
assert.equal(noZone.approaches.length,0);
assert.equal(noZone.nearTracks,0);
const noPoints = computeOperationalAnalysis({tracks:[track],points:[],zones:[zone],from,to});
assert.equal(noPoints.nightTracks,0,'Summary activity must not be passed off as spatial observations');
assert.equal(noPoints.hourly[21].starts,1);
assert.throws(()=>computeOperationalAnalysis({tracks:[],points:[],zones:[],from:to,to:from}));
// Chilean DST spring-forward calendar day has 23 hours.
const dst = computeOperationalAnalysis({tracks:[],points:[],zones:[],from:new Date('2026-09-06T04:00:00Z'),to:new Date('2026-09-07T03:00:00Z')});
assert.equal(dst.hourly.reduce((sum,h)=>sum+h.exposureHours,0),23);
assert.equal(dst.hourly[0].exposureHours,0);

// Report rankings use recorded point_count, even when only a few positions
// were sampled. General traffic indicators must retain the smaller tracks.
const rankingTracks = [99, 100, 200].map(count => ({ ...track, track_id: `REPORT-${count}`, point_count: count }));
const rankingPoints = rankingTracks.flatMap(t => points.map(p => ({ ...p, trackKey: types.analysisTrackKey(t) })));
const rankingAnalysis = computeOperationalAnalysis({ tracks: rankingTracks, points: rankingPoints, zones: [zone], from, to });
assert.equal(DEFAULT_REPORT_SETTINGS.minApproachPoints, 100);
assert.deepEqual(filterReportApproaches(rankingAnalysis.approaches).map(a => a.track.point_count).sort((a,b) => a-b), [100, 200]);
assert.equal(filterReportApproaches(rankingAnalysis.approaches, 200).length, 1);
assert.equal(filterReportApproaches(rankingAnalysis.approaches, 201).length, 0);
assert.equal(filterReportApproaches(rankingAnalysis.approaches, 1).length, 3);
for (const invalid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => filterReportApproaches(rankingAnalysis.approaches, invalid));
const reportCharts = load('src/features/history/reportCharts.ts', { './reportAnalytics': mod.exports });
const movementModule = load('src/features/history/reportMovement.ts', { './types': types });
const report = load('src/features/history/report.ts', {
 './reportAnalytics': mod.exports, './reportCharts': reportCharts,
 './types': types,
 './reportMovement': movementModule,
 'pdfmake/build/pdfmake': {}, 'pdfmake/build/vfs_fonts': {},
});
const options = { tracks: rankingTracks, points: rankingPoints, zones: [zone], total: 3, filters: { minPoints: 2, from: from.toISOString(), to: to.toISOString() } };
const document = report.buildTrackActivityReport(options).docDefinition;
const movementText = doc => JSON.stringify(doc.content.find(item => item.table?.body?.[0]?.[0]?.text === 'Horario'));
const documentText = movementText(document);
assert.ok(!documentText.includes('REPORT-99'), 'Excluded track must not leak into PDF rankings, executive highlights or review cases');
assert.ok(documentText.includes('REPORT-100'));
assert.ok(documentText.includes('REPORT-200'));
assert.ok(documentText.includes('Puntos'));
const trackCard = document.content.find(item => item.columns?.[0]?.stack?.[1]?.text === 'Tracks del período');
assert.equal(trackCard.columns[0].stack[0].text, '3', 'The approach threshold must not remove tracks from general indicators');
const customText = movementText(report.buildTrackActivityReport({ ...options, settings: { minApproachPoints: 200 } }).docDefinition);
assert.ok(!customText.includes('REPORT-100'));
assert.ok(customText.includes('REPORT-200'));
const emptyText = movementText(report.buildTrackActivityReport({ ...options, settings: { minApproachPoints: 201 } }).docDefinition);
assert.ok(emptyText.includes('Sin registros disponibles'));
assert.ok(!emptyText.includes('REPORT-200'));

// Category selection applies before computing all metrics and maps; missing
// classifications are selectable, and aliases shown by the app stay together.
assert.equal(DEFAULT_REPORT_SETTINGS.category, 'lancha');
assert.equal(DEFAULT_REPORT_SETTINGS.showHeatmap, false);
assert.equal(DEFAULT_REPORT_SETTINGS.movementSort, 'distance');
const categoryTracks = [
 { ...track, track_id: 'ONLY-LANCHA', behavior_class: ' LANCHA ' },
 { ...track, track_id: 'ONLY-PERSONA', behavior_class: 'persona' },
 { ...track, track_id: 'NO-CATEGORY', behavior_class: null },
 { ...track, track_id: 'NO-CATEGORY-ALIAS', behavior_class: 'unclassified' },
 { ...track, track_id: 'ONLY-PAJARO', behavior_class: 'Pájaro' },
];
const categoryPoints = categoryTracks.flatMap((t, i) => points.map(p => ({ ...p, lat: p.lat + i * .01, trackKey: types.analysisTrackKey(t) })));
assert.equal(filterReportTracks(categoryTracks).length, 5);
assert.equal(filterReportTracks(categoryTracks, 'lancha').length, 1);
assert.equal(filterReportTracks(categoryTracks, 'sin_clasificar').length, 2);
assert.equal(filterReportTracks(categoryTracks, 'pajaro').length, 1);
assert.equal(filterReportTracks(categoryTracks, 'custom_without_tracks').length, 0);
assert.equal(normalizeReportCategory('UNKNOWN'), 'desconocido');
const categoryOptions = { ...options, tracks: categoryTracks, points: categoryPoints, total: 5 };
const allCategories = report.buildTrackActivityReport({...categoryOptions, settings: {category: ''}}).docDefinition;
assert.equal(allCategories.content.find(item => item.columns?.[0]?.stack?.[1]?.text === 'Tracks del período').columns[0].stack[0].text, '5');
const chartInputs = {};
const scopedReport = load('src/features/history/report.ts', {
 './reportAnalytics': mod.exports, './types': types,
 './reportMovement': movementModule,
 './reportCharts': { ...reportCharts, hourlyChart: (hourly) => { chartInputs.hourly = hourly; return '<svg/>'; }, spatialChart: (positions) => { chartInputs.points = positions; return '<svg/>'; } },
 'pdfmake/build/pdfmake': {}, 'pdfmake/build/vfs_fonts': {},
});
const onlyLancha = scopedReport.buildTrackActivityReport({ ...categoryOptions, settings: { category: 'lancha' } }).docDefinition;
const onlyLanchaText = JSON.stringify(onlyLancha.content);
assert.ok(onlyLanchaText.includes('ONLY-LANCHA'));
assert.ok(!onlyLanchaText.includes('ONLY-PERSONA'));
assert.ok(!onlyLanchaText.includes('NO-CATEGORY'));
assert.ok(!onlyLanchaText.includes('ONLY-PAJARO'));
assert.ok(onlyLanchaText.includes('Categoría de actividad: Lancha'));
assert.equal(onlyLancha.content.find(item => item.columns?.[0]?.stack?.[1]?.text === 'Tracks del período').columns[0].stack[0].text, '1');
assert.equal(chartInputs.hourly[21].starts, 1);
assert.equal(chartInputs.hourly[21].present, 1);
assert.equal(chartInputs.points.length, points.length);
assert.ok(chartInputs.points.every(p => p.trackKey === types.analysisTrackKey(categoryTracks[0])));
const combined = movementText(report.buildTrackActivityReport({ ...categoryOptions, settings: { category: 'lancha', minApproachPoints: 101 } }).docDefinition);
assert.ok(!combined.includes('ONLY-LANCHA'), 'Category and minimum recorded point filters must both apply to ranking rows');

const { computeTrackMovements, rankTrackMovements } = movementModule;
const loopTrack = { ...track, track_id: 'LOOP', first_seen: from.toISOString(), last_seen: new Date(from.getTime() + 910000).toISOString() };
const loopPoints = [[0,1,1], [10,1,1.001], [20,1.001,1.001], [30,1.001,1], [40,1,1], [900,20,20], [910,20,20]].map(([sec,lat,lon]) => ({trackKey: types.analysisTrackKey(loopTrack), fecha:new Date(from.getTime()+sec*1000).toISOString(),lat,lon,zona:null}));
const loop = computeTrackMovements([loopTrack], loopPoints, from, to, 120)[0];
assert.ok(loop.distanceM > 440 && loop.distanceM < 450);
assert.equal(loop.trackedSeconds, 50);
assert.equal(loop.elapsedSeconds, 910);
assert.equal(loop.gapCount, 1);
const fullLoop = {trackKey:loop.key,distanceM:loop.distanceM,trackedSeconds:50,segmentCount:5,gapCount:1,maxGapSeconds:120};
const sampledLoop = computeTrackMovements([loopTrack], [loopPoints[0], loopPoints.at(-1)], from, to, 120, [fullLoop])[0];
assert.equal(sampledLoop.source, 'full');
assert.equal(sampledLoop.distanceM, loop.distanceM, 'Full-history metrics must survive extreme spatial sampling');
const stationary = {...loop, key:'STILL', track:{...track,track_id:'STILL'},distanceM:0,elapsedSeconds:0};
assert.equal(rankTrackMovements([stationary, loop], 'distance').length, 1);
assert.equal(rankTrackMovements([stationary, loop], 'duration').length, 1);
assert.equal(rankTrackMovements([{...loop,track:{...track,point_count:99}}]).length, 0);
assert.equal(computeTrackMovements([loopTrack], [], from, to, 120)[0].distanceM, null);
assert.equal(computeTrackMovements([loopTrack], [loopPoints[0]], from, to, 120)[0].distanceM, null);
assert.equal(computeTrackMovements([loopTrack], [], from, to, 60, [fullLoop])[0].source, 'unavailable', 'Metrics with a different gap threshold must not be reused');
const movementOptions = {...options,tracks:[loopTrack],points:loopPoints,quality:{movements:[fullLoop]},settings:{minApproachPoints:100}};
const detailedMovement = report.buildTrackActivityReport(movementOptions).docDefinition;
assert.ok(JSON.stringify(detailedMovement.content).includes('Distancia recorrida y tiempo de trackeo'));
assert.ok(JSON.stringify(detailedMovement.content).includes('Historial completo'));
const summaryMovement = report.buildTrackActivityReport({...movementOptions,settings:{...movementOptions.settings,format:'summary'}}).docDefinition;
const summaryText = JSON.stringify(summaryMovement.content);
assert.ok(summaryText.includes('Actividad durante la noche'));
assert.ok(summaryText.includes('LOOP'));
assert.ok(summaryText.includes('Lectura ejecutiva'));
assert.ok(!summaryText.includes('Registros prioritarios y evidencia'));
assert.ok(summaryMovement.content.filter(item=>item.pageBreak==='before').length >= 3);

// Report structure, optional density maps and observed time across midnight.
const reportHeadings = document.content.filter(item => item.fontSize === 23).map(item => item.text);
assert.equal(reportHeadings[0], 'Actividad durante la noche');
assert.ok(reportHeadings.indexOf('Distancia recorrida y tiempo de trackeo') < reportHeadings.indexOf('Calendario de actividad observada'));
assert.ok(!reportHeadings.includes('Dónde se concentran las detecciones'));
for (const removed of ['¿A qué hora aumenta la actividad?', 'Registros prioritarios y evidencia', 'Composición y calidad de los datos', 'Detalle de actividad próxima a zonas críticas']) assert.ok(!JSON.stringify(document.content).includes(removed));
const withHeatmap = report.buildTrackActivityReport({...options, settings: {showHeatmap: true}}).docDefinition;
assert.equal(withHeatmap.content.filter(item => item.fontSize === 23).at(-1).text, 'Dónde se concentran las detecciones');
const boundaryTrack = {...track, first_seen: '2026-11-02T23:59:30-03:00', last_seen: '2026-11-03T00:00:30-03:00'};
const boundaryPoints = [boundaryTrack.first_seen, boundaryTrack.last_seen].map(fecha => ({trackKey: types.analysisTrackKey(boundaryTrack), fecha, lat: 1, lon: 1, zona: null}));
const boundary = computeOperationalAnalysis({tracks:[boundaryTrack],points:boundaryPoints,zones:[],from,to:new Date('2026-11-03T01:00:00-03:00')});
assert.equal(boundary.days[0].trackingSeconds[23], 30);
assert.equal(boundary.days[1].trackingSeconds[0], 30);
assert.equal(analysis.days[0].trackingSeconds[21], 120, 'Deduplicate points and never bridge long gaps');
const noInterval = computeOperationalAnalysis({tracks:[track],points:[points[0]],zones:[],from,to});
assert.equal(noInterval.days[0].trackingSeconds[21], 0, 'An isolated point has no observed duration');
const missingMovement = report.buildTrackActivityReport({...options, points:[]}).docDefinition;
assert.ok(movementText(missingMovement).includes('N/D'), 'Keep eligible tracks with no trajectory');
assert.ok(reportCharts.activityMatrix(boundary.days, DEFAULT_REPORT_SETTINGS).includes('min/celda'));
const noGapLine = reportCharts.spatialChart([points[0],points.at(-1)], [], DEFAULT_REPORT_SETTINGS, false, true);
assert.ok(!noGapLine.includes('stroke-width="1.3"'), 'Do not connect trajectories across long gaps');

// Repeated/skipped Chilean clock hours preserve elapsed tracking time.
for (const [start, end, expected] of [
 ['2026-04-05T02:59:30Z', '2026-04-05T03:00:30Z', [['2026-04-04', 23, 60]]],
 ['2026-09-06T03:59:30Z', '2026-09-06T04:00:30Z', [['2026-09-05', 23, 30], ['2026-09-06', 1, 30]]],
]) {
 const t = {...track, first_seen:start, last_seen:end};
 const positions = [start, end].map(fecha => ({trackKey:types.analysisTrackKey(t), fecha, lat:1, lon:1, zona:null}));
 const result = computeOperationalAnalysis({tracks:[t],points:positions,zones:[],from:new Date(start),to:new Date(end)});
 for (const [day, hour, seconds] of expected) assert.equal(result.days.find(d => d.day === day).trackingSeconds[hour], seconds);
}
for (const invalid of [0, -1, NaN, 1.5]) assert.throws(() => report.buildTrackActivityReport({...options, settings:{minApproachPoints:invalid}}));

// Test fetching: full-interval query, identity propagation, invalid records and failures.
const requests = [];
const fetchModule = load('src/features/history/analysis.ts',{
 './types':types,
 '@/features/devices/services/radarService':{fetchTrackHistory:async(id,params)=>{
  requests.push(params);
  if(id==='bad') throw Error('network');
  return {total_points:500,sampled:true,points:[{fecha:track.first_seen,lat:.0005,lon:.0005,speed:2,zona:null},{fecha:track.first_seen,lat:NaN,lon:.0005,zona:null},{fecha:'1990-01-01',lat:1,lon:1,zona:null}]};
 }},
});
const result = await fetchModule.fetchAnalysisPoints([track,{...track,track_id:'bad'}],{from:from.toISOString(),to:to.toISOString(),includeMovement:true,maxGapSeconds:90});
assert.equal(result.points.length,1);
assert.equal(result.points[0].trackKey,key);
assert.equal(result.failedTracks,1);
assert.equal(result.invalidPoints,2);
assert.equal(result.pointsLimited,true);
assert.equal(requests[0].sample,true);
assert.equal(requests[0].include_metrics,true);
assert.equal(requests[0].max_gap_seconds,90);
assert.equal(requests[0].session_ref,undefined,'Explicit from/to must not be overridden by a ±12h session window');
assert.equal(requests[0].from,new Date(track.first_seen).toISOString());
console.log('PASS: timezone/DST, per-track counts, distance to polygon, episode gaps, coverage and fetching');
