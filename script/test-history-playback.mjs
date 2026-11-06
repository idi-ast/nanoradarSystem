// Run with node script/test-history-playback.mjs (no backend or Mapbox token).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {build} from 'esbuild';
const categoryBuild=await build({entryPoints:['src/features/devices/config/behaviorCategories.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const categoryModule={exports:{}};
new Function('module','exports',categoryBuild.outputFiles[0].text)(categoryModule,categoryModule.exports);
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
function load(file,mocks) {
 const require=createRequire(new URL(`../${file}`,import.meta.url));
 const js=ts.transpileModule(readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};
 runInNewContext(js,{exports,require:name=>name in mocks?mocks[name]:require(name),console,window:clock});
 return exports;
}
const intervals=new Map(); let timer=0;
const clock={setInterval(fn){const id=++timer;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);}};
// Preserve hook state/ref slots and run dependency-aware effect cleanup on each render.
function hookHost() {
 const slots=[]; let cursor=0; const pending=[];
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},
  useRef(initial){const i=cursor++;if(!slots[i])slots[i]={current:initial};return slots[i];},
  useMemo(fn){cursor++;return fn();},useCallback(fn){cursor++;return fn;},
  useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
 };
 return {react,render(fn){cursor=0;const value=fn();pending.splice(0).forEach(f=>f());return value;},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
const point=(i,day=2)=>({fecha:`2026-11-0${day}T21:00:${String(i).padStart(2,'0')}-03:00`,lat:-41+i*.0001,lon:-73,speed:2,zona:'modulo'});
const summary=(id,radar,count,day=2)=>({track_id:id,tipo_radar:radar,first_seen:point(0,day).fecha,last_seen:point(count-1,day).fecha,point_count:count,nivel_max:1,zones:['modulo'],behavior_class:'lancha'});
const a=summary('SAME','magos',3),b=summary('SAME','nano',7,3),single=summary('ONE','magos',1);
let fetches=0;
const cache=new Map();
const host=hookHost();
const playbackModule=load('src/features/history/hooks/useTrackPlayback.ts',{
 react:host.react,
 '@tanstack/react-query':{useQueryClient:()=>({fetchQuery(o){const key=JSON.stringify(o.queryKey);if(!cache.has(key))cache.set(key,o.queryFn());return cache.get(key);}})},
 '@/features/devices/services/radarService':{async fetchTrackHistory(id,params){fetches++;const n=id==='ONE'?1:params.tipo_radar==='magos'?3:7;return {points:Array.from({length:n},(_,i)=>point(i,params.tipo_radar==='nano'?3:2))};}},
});
const render=()=>host.render(()=>playbackModule.useTrackPlayback());
let playback=render();
const loadAll=playback.playAll([a,b]);playback=render();await loadAll;playback=render();
assert.equal(playback.tracks.length,2);
assert.equal(playback.activeTrackKey,null);
assert.equal(playback.playbackTracks.length,2);
playback.seekTo(1);playback=render();
playback.selectTrack('nano:SAME');playback=render();
assert.equal(playback.playbackTracks[0].summary.tipo_radar,'nano','Identical IDs on different radars remain selectable');
assert.equal(playback.tracks.length,2,'Selection must retain all visible tracks');
playback.togglePlay();playback=render();
[...intervals.values()][0]();playback=render();
assert.equal(playback.index,2);
assert.equal(playback.trackIndices['magos:SAME'],1,'Other tracks stay parked while the selected track advances');
playback.selectTrack('magos:SAME');playback=render();
assert.equal(playback.isPlaying,false,'Changing selection pauses playback');
assert.equal(playback.index,1);
playback.seekTo(999);playback=render();
assert.equal(playback.index,2,'Seek is clamped to selected track, not longest visible track');
playback.togglePlay();playback=render();
assert.equal(playback.index,0,'Replay restarts the selected track when it is at its end');
[...intervals.values()][0]();playback=render();
assert.equal(playback.index,1);
assert.equal(playback.trackIndices['nano:SAME'],2);
playback.selectTrack('nano:SAME');playback=render();
assert.equal(playback.index,2,'Each track resumes its own progress');
playback.selectTrack(null);playback=render();
assert.equal(playback.playbackTracks.length,2);
assert.equal(playback.index,0);
assert.equal(fetches,2,'Switching playback focus must not download trajectories again');
const loadSingle=playback.toggleTrack(single);playback=render();await loadSingle;playback=render();
assert.equal(playback.activeTrackKey,'magos:ONE');
assert.equal(playback.tracks.length,3);
playback.seekTo(999);playback=render();
assert.equal(playback.index,0);
playback.selectTrack('missing');playback=render();
assert.equal(playback.activeTrackKey,'magos:ONE');
await playback.toggleTrack(single);playback=render();
assert.equal(playback.activeTrackKey,null,'Removing focused track restores group controls');
assert.equal(playback.tracks.length,2);
playback.clearAll();playback=render();
assert.equal(playback.tracks.length,0);assert.equal(intervals.size,0);host.dispose();

// Inspect the real map element tree with inert map primitives, then exercise
// both the line and point event handlers without requiring Mapbox services.
const memoReact={useCallback:fn=>fn,useMemo:fn=>fn(),useEffect(){},useRef:()=>({current:null}),Fragment:React.Fragment};
const MapStub=()=>null,Source=()=>null,Layer=()=>null,Marker=()=>null,Popup=()=>null;
const {TrackPlaybackMap}=load('src/features/history/components/TrackPlaybackMap.tsx',{
 react:memoReact,'react-map-gl':{default:MapStub,Source,Layer,Marker,Popup},
 '@/components/baseMap/libs':{MAPBOX_TOKEN:'',MAP_STYLES:{satellite:''},DEFAULT_CENTER:{latitude:-41,longitude:-73}},
 '@/features/devices/components/map/utils/geoHelpers':{toGeoCoord:v=>v},
 '../hooks/useTrackPlayback':playbackModule,
});
const items=[{summary:a,points:[point(0),point(1),point(2)],loading:false,error:null},{summary:b,points:Array.from({length:7},(_,i)=>point(i,3)),loading:false,error:null}];
function walk(node,fn){if(!node||typeof node!=='object')return;fn(node);React.Children.forEach(node.props?.children,c=>walk(c,fn));}
const selections=[];
const mapProps={tracks:items,playbackIndex:2,trackIndices:{'magos:SAME':1,'nano:SAME':2},activeTrackKey:'nano:SAME',onSelectTrack:k=>selections.push(k),zones:[],loading:false};
const mapTree=TrackPlaybackMap(mapProps);
const nodes=[];walk(mapTree,n=>nodes.push(n));
const map=nodes.find(n=>n.type===MapStub);
assert.equal(map.props.interactiveLayerIds.length,2);
map.props.onClick({features:[{properties:{trackKey:'magos:SAME'}}]});
assert.equal(selections.at(-1),'magos:SAME');
const buttons=nodes.filter(n=>n.type==='button');
const marker=buttons.find(n=>n.props['aria-label']==='Seleccionar track SAME / nano');
marker.props.onClick({stopPropagation(){}});
assert.equal(selections.at(-1),'nano:SAME');
assert.equal(marker.props.style.opacity,1);
assert.equal(buttons.find(n=>n.props['aria-label']==='Seleccionar track SAME / magos').props.style.opacity,.3);
assert.equal(nodes.filter(n=>n.type===Source).length,2,'The dimmed track source stays on the map');
const layers=nodes.filter(n=>n.type===Layer);
assert.ok(layers.find(n=>n.props.id==='history-track-1-played').props.paint['line-opacity']>layers.find(n=>n.props.id==='history-track-0-played').props.paint['line-opacity']);
for(const source of nodes.filter(n=>n.type===Source))for(const feature of source.props.data.features)assert.ok(feature.geometry.coordinates.length>=2,'Never send a one-coordinate LineString to Mapbox');
assert.equal(nodes.find(n=>n.type===Popup).props.latitude,point(2,3).lat);
const oneNodes=[];walk(TrackPlaybackMap({...mapProps,tracks:[{summary:single,points:[point(0)],loading:false,error:null}],activeTrackKey:'magos:ONE'}),n=>oneNodes.push(n));
assert.ok(oneNodes.some(n=>n.type==='button'&&n.props['aria-label']==='Seleccionar track ONE / magos'),'A one-point track must remain clickable');

const {PlaybackControls}=load('src/features/history/components/PlaybackControls.tsx',{'../hooks/useTrackPlayback':playbackModule,'@/features/devices/config/behaviorCategories':categoryModule.exports});
const controlsProps={tracks:[items[0]],totalTracks:2,index:1,isPlaying:false,speed:1,onTogglePlay(){},onSpeedChange(){},onSeek(){},onClose(){},onShowAll(){}};
const html=renderToStaticMarkup(React.createElement(PlaybackControls,controlsProps));
for(const text of ['Track ID:','SAME','Radar:','magos','Reproducir todos (2)','2 / 3','7,2 km/h'])assert.ok(html.includes(text),text);
assert.ok(!html.includes('nano'),'Only selected track information belongs in the player');
const groupHtml=renderToStaticMarkup(React.createElement(PlaybackControls,{...controlsProps,tracks:items}));
assert.ok(groupHtml.includes('24:00:06'),'Group duration must use all trajectory timestamps, not concatenated-array indexes');
console.log('PASS: track selection, independent playback/resume, dimming, line/point clicks, one-point tracks and player metadata');
