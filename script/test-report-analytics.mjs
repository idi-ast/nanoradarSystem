import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {build} from 'esbuild';
const built = await build({entryPoints:['src/features/history/reportAnalytics.ts'], bundle:true, platform:'node', format:'cjs', write:false});
const exports = {}, mod = {exports};
new Function('module', 'exports', built.outputFiles[0].text)(mod, exports);
const {computeOperationalAnalysis, distanceToZoneM, localParts, isNight, DEFAULT_REPORT_SETTINGS, normalizeZone} = mod.exports;
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
const result = await fetchModule.fetchAnalysisPoints([track,{...track,track_id:'bad'}],{from:from.toISOString(),to:to.toISOString()});
assert.equal(result.points.length,1);
assert.equal(result.points[0].trackKey,key);
assert.equal(result.failedTracks,1);
assert.equal(result.invalidPoints,2);
assert.equal(result.pointsLimited,true);
assert.equal(requests[0].sample,true);
assert.equal(requests[0].session_ref,undefined,'Explicit from/to must not be overridden by a ±12h session window');
assert.equal(requests[0].from,new Date(track.first_seen).toISOString());
console.log('PASS: timezone/DST, per-track counts, distance to polygon, episode gaps, coverage and fetching');
