import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function pure(file) {
  const result = await build({entryPoints:[file],alias:{'@':`${process.cwd()}/src`},bundle:true,platform:'node',format:'cjs',write:false});
  const module={exports:{}}; new Function('module','exports',result.outputFiles[0].text)(module,module.exports); return module.exports;
}
const data = await pure('src/features/history/reportMapData.ts');
const analytics = await pure('src/features/history/reportAnalytics.ts');
const types = await pure('src/features/history/types.ts');
const geometry = await pure('src/features/analysis/trackTrajectories.ts');
const settings={...analytics.DEFAULT_REPORT_SETTINGS};
const from=new Date('2026-11-06T00:00:00-03:00'),to=new Date('2026-11-07T00:00:00-03:00');
const tracks=Array.from({length:9},(_,i)=>({track_id:`T${i}`,tipo_radar:'magos',first_seen:from.toISOString(),last_seen:to.toISOString(),point_count:100,zones:[],nivel_max:0}));
const points=tracks.flatMap(t=>[0,60].map(seconds=>({trackKey:types.analysisTrackKey(t),lat:-42,lon:-73+seconds*.000001,fecha:new Date(+from+seconds*1000).toISOString(),zona:null})));
const groups=data.nightMapGroups(tracks,[...points,points[0],{...points[0],fecha:'2026-11-06T15:00:00-03:00'},{...points[0],trackKey:'unrelated'},{...points[0],lat:NaN}],from,to,settings);
assert.equal(groups.length,1);assert.equal(groups[0].trackKeys.length,9);
assert.equal(new Set(Object.values(groups[0].colors)).size,9);
assert.ok(Object.values(groups[0].colors).every(color=>/^#[0-9a-f]{6}$/i.test(color)),'All overview colors must work in PDFMake and Mapbox');
assert.equal(data.reportMapDetails(groups).length,9);
assert.equal(groups.flatMap(g=>g.points).length,18);
assert.ok(groups[0].points.every(p=>p.trackId && p.radar==='magos'));
let mode='ok', containers=0;const instances=[];
class MapMock {
 constructor(options){this.options=options;this.handlers=new Map();this.sources=new Map();this.layers=[];instances.push(this);queueMicrotask(()=>this.emit(mode==='error'?'error':'load'));}
 on(event,fn){if(!this.handlers.has(event))this.handlers.set(event,new Set());this.handlers.get(event).add(fn);return this;}
 off(event,fn){this.handlers.get(event)?.delete(fn);return this;}
 emit(event){for(const fn of [...(this.handlers.get(event)??[])])fn();}
 addSource(id,source){this.sources.set(id,{...source,updates:[],setData(data){this.data=data;this.updates.push(data);}});}
 getSource(id){return this.sources.get(id);}
 addLayer(layer){this.layers.push(layer);}
 fitBounds(){}
 triggerRepaint(){queueMicrotask(()=>this.emit('idle'));}
 areTilesLoaded(){return mode!=='missing-tiles';}
 getCanvas(){return {};}
 remove(){this.removed=true;}
}
class Bounds {extend(){return this;}}
const context={font:'',fillStyle:'',drawImage(){},measureText(text){return {width:text.length*10};},fillRect(){},fillText(){}};
const document={body:{appendChild(){containers++;}},createElement(kind){return kind==='canvas'?{getContext:()=>context,toDataURL:()=> 'data:image/png;base64,TEST_IMAGE'}:{style:{},setAttribute(){},remove(){containers--;},querySelector(){return {textContent:'© Mapbox © OpenStreetMap'};}};}};
const exports={};
const source=ts.transpileModule(readFileSync('src/features/history/captureReportMaps.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
runInNewContext(source,{exports,document,setTimeout,clearTimeout,DOMException,require:name=>{
 if(name==='mapbox-gl')return {default:{Map:MapMock,LngLatBounds:Bounds}};
 if(name==='@/components/baseMap/libs')return {MAPBOX_TOKEN:'test-token',MAP_STYLES:{satellite:'test-style'}};
 if(name==='@/features/analysis/trackTrajectories')return geometry;
 if(name==='./reportAnalytics')return analytics;
 return require(name);
}});
const captures=await exports.captureReportMaps(groups,[],settings);
assert.equal(captures.length,1);assert.equal(captures[0].width,1600);assert.equal(captures[0].height,1000);
assert.equal(instances[0].options.preserveDrawingBuffer,true);
assert.ok(instances[0].layers.some(l=>l.id==='report-track-label'));
assert.equal(instances[0].removed,true);assert.equal(containers,0);
assert.equal(instances[0].layers.find(l=>l.id==='report-tracks').paint['line-dasharray'],undefined);
for (let i=0;i<groups.length;i++) {
 const markers=instances[0].sources.get('report-markers').updates[i].features;
 assert.equal(markers.length,groups[i].trackKeys.length*2,'Only two markers per track in satellite captures');
 assert.ok(markers.every(f=>['start','end'].includes(f.properties.endpoint)));
}
const splitPoints=[0,60,120,600,660,720,1200,1260,1320].map(seconds=>({...points[0],fecha:new Date(+from+seconds*1000).toISOString(),lon:-73+seconds*.000001}));
const reportGeometry=geometry.buildTrackTrajectories(splitPoints,120,{markers:'track-ends'});
assert.equal(reportGeometry.lines.features[0].geometry.coordinates.length,3,'Preserve three observed segments');
assert.equal(reportGeometry.lines.features[0].geometry.coordinates.flat().length,9,'Preserve every coordinate, not just endpoints');
assert.equal(reportGeometry.markers.features.length,2);
assert.ok(reportGeometry.markers.features[0].properties.label.endsWith('Inicio'));
assert.ok(reportGeometry.markers.features[1].properties.label.endsWith('Fin'));
assert.equal(geometry.buildTrackTrajectories([splitPoints[0]],120,{markers:'track-ends'}).markers.features.length,1);
assert.equal(geometry.buildTrackTrajectories(splitPoints,120).markers.features.length,6,'Keep the existing analysis dashboard marker behavior');
mode='error';await assert.rejects(exports.captureReportMaps(groups,[],settings),/No se pudo cargar/);
assert.equal(instances.at(-1).removed,true);assert.equal(containers,0);
mode='missing-tiles';await assert.rejects(exports.captureReportMaps(groups,[],settings),/no terminó de cargar/);assert.equal(containers,0);
const abort=new AbortController();abort.abort();await assert.rejects(exports.captureReportMaps(groups,[],settings,abort.signal));
console.log('PASS: nightly report grouping, real-map capture lifecycle, image output, errors and cleanup');
