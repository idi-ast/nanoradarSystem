// node script/test-zones-page.mjs — controlled data, no backend writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const bundle=await build({entryPoints:['src/features/zones/zoneGeometry.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const mod={exports:{}};new Function('module','exports',bundle.outputFiles[0].text)(mod,mod.exports);
const geometry=mod.exports;
const templates=JSON.parse(readFileSync('src/features/zones/zoneExportTemplate.json','utf8'));
const template=templates.exterior;
const vertices=[[-42.53345998646898,-73.77182999290409],[-42.534170015657324,-73.77159002452642],[-42.53380999031326,-73.7690599864814],[-42.53311909347473,-73.76926289317214]];
const zone={id:37,nombre:'Módulo norte',descripcion:'Área vigilada',idTipoAlerta:7,sonido:null,poligono:{color:'#123456',vertices}};
const exported=geometry.buildZoneExport(zone);
assert.deepEqual(Object.keys(exported),['MG-37']);
const body=exported['MG-37'];
assert.deepEqual(Object.keys(body),['vertices','id','name','type','ui','enabled','actions','active']);
assert.equal(body.id,'MG-37');assert.equal(body.name,zone.nombre);
assert.equal(body.vertices.length,5);assert.deepEqual(body.vertices[0],body.vertices.at(-1));
assert.deepEqual(body.vertices[0],{latitude:vertices[0][0],longitude:vertices[0][1],altitude:0});
const {vertices:ignored,id,name,...fixed}=body;
assert.deepEqual(fixed,template,'No zone configuration may override the fixed export fields');
assert.equal(fixed.ui.fill.color,'#fbff1f');assert.equal(fixed.active,false);assert.equal(fixed.enabled,true);
const actions={
 '08d46e96-27b5-4ed1-7a4d-b1e5cfdc1216':{boats:1},
 '556201f4-b4de-4571-6a53-a6b898fd6143':{boats:1},
 '9a6692b6-f7df-4ad3-6159-82f0c3a38a49':{'46a3baae-c6b0-4372-9be6-f0b2318a81eb':1,boats:1},
 'b4a30af9-4740-46e5-6d87-aee6403f6a0f':{boats:1},
};
assert.deepEqual(Object.keys(body.actions),Object.keys(actions));
for(const [key,filterMacros] of Object.entries(actions))assert.deepEqual(body.actions[key],{filterMacros,default:{filters:[]},matchAny:key!=='9a6692b6-f7df-4ad3-6159-82f0c3a38a49'});
assert.deepEqual(JSON.parse(geometry.zoneExportJson(zone)),{result:{alert:exported}});
assert.equal(geometry.buildZoneExport({...zone,poligono:{...zone.poligono,vertices:[...vertices,vertices[0]]}})['MG-37'].vertices.length,5,'Never append a duplicate closing vertex');
const indexed={point4:vertices[3],point2:vertices[1],point1:vertices[0],point3:vertices[2]};
assert.deepEqual(geometry.buildZoneExport({...zone,poligono:{...zone.poligono,vertices:indexed}}),exported);
assert.deepEqual(geometry.buildZoneExport({...zone,poligono:{...zone.poligono,vertices:vertices.map(([latitude,longitude])=>({latitude,longitude}))}}),exported);
assert.equal(vertices.length,4,'Export cannot mutate saved geometry');
body.actions[Object.keys(actions)[0]].matchAny=false;
assert.equal(geometry.buildZoneExport(zone)['MG-37'].actions[Object.keys(actions)[0]].matchAny,true,'Exports cannot mutate the template');
for(const id of [undefined,0,-1,1.5,NaN])assert.throws(()=>geometry.buildZoneExport({...zone,id}));
for(const bad of [[[91,-73],...vertices.slice(1)],[[null,-73],...vertices.slice(1)],[['',-73],...vertices.slice(1)],[[NaN,-73],...vertices.slice(1)],[vertices[0],vertices[0],vertices[1]]])assert.throws(()=>geometry.buildZoneExport({...zone,poligono:{...zone.poligono,vertices:bad}}));

// The final envelope works for one or many zones; every fixed field matches
// one of the supplied configurations, independent of local zone settings.
const otherZone={...zone,id:42,nombre:'Módulo sur'};
const batch=geometry.buildZonesExport([zone,otherZone],{'42':'interior'});
assert.deepEqual(Object.keys(batch),['result']);
assert.deepEqual(Object.keys(batch.result),['alert']);
assert.deepEqual(Object.keys(batch.result.alert),['MG-37','MG-42']);
for(const [key,profile] of [['MG-37','exterior'],['MG-42','interior']]){
 const {vertices,id,name,...settings}=batch.result.alert[key];
 assert.deepEqual(settings,templates[profile]);
 assert.equal(id,key);assert.equal(vertices.at(-1).altitude,0);
}
assert.equal(batch.result.alert['MG-42'].ui.fill.color,'#000000');
assert.equal(batch.result.alert['MG-42'].ui.fill.custom,false);
assert.equal(batch.result.alert['MG-42'].name,'Módulo sur');
assert.throws(()=>geometry.buildZonesExport([]));
assert.throws(()=>geometry.buildZonesExport([zone,zone]),/repetida/);
assert.throws(()=>geometry.buildZonesExport([zone,{...otherZone,id:undefined}]));
assert.throws(()=>geometry.buildZoneExport(zone,'unknown'));
assert.deepEqual(JSON.parse(geometry.zonesExportJson([zone,otherZone],{'42':'interior'})),batch);

function load(file,mocks,globals={}) {
 const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};runInNewContext(source,{exports,require:name=>name in mocks?mocks[name]:require(name),console,Error,structuredClone,...globals});return exports;
}
function host() {
 const states=[],refs=[];let state=0,ref=0;
 return {react:{useMemo:fn=>fn(),useState(initial){const i=state++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){const i=ref++;return refs[i]??(refs[i]={current:initial});}},render(fn){state=0;ref=0;return fn();}};
}
function walk(node,fn){if(!node||typeof node!=='object')return;fn(node);React.Children.forEach(node.props?.children,c=>walk(c,fn));}
function find(tree,predicate){let found;walk(tree,n=>{if(!found&&predicate(n))found=n;});assert.ok(found,'Expected control missing');return found;}
function text(node){if(typeof node==='string'||typeof node==='number')return String(node);if(!node)return '';return React.Children.toArray(node.props?.children).map(text).join('');}

// Exercise the actual service adapter: POST response IDs come from data.data.
let serviceCalls=0;
const service=load('src/features/devices/services/radarService.ts',{'@/apis/apiSystem':{apiSystem:{async post(path,payload){assert.equal(path,'/zonas');serviceCalls++;return {data:{data:{...payload,id:99,nombre:'Nombre devuelto por BD'},message:'ok'}};}}}});
const created=await service.createRadarZone({nombre:'Borrador'});assert.equal(created.id,99);assert.equal(serviceCalls,1);

// Real page handlers: create a polygon from manual coordinates and keep the
// returned ID/name, rather than assigning a provisional export identity.
const fixture={data:[zone],isPending:false,isFetching:false,isError:false,refetch(){}};
const pageHost=host();let failCreate=false;const payloads=[];const invalidations=[];
const JsonStub=()=>null,MapStub=()=>null;
const {default:Page}=load('src/features/zones/ZonesPage.tsx',{
 react:pageHost.react,
 '@tanstack/react-query':{useQuery:()=>({data:[{id:7,nombre:'Alerta del centro'}],isPending:false,isError:false}),useQueryClient:()=>({setQueryData(key,update){fixture.data=update(fixture.data);},async invalidateQueries(o){invalidations.push(o.queryKey);}}),useMutation:options=>({isPending:false,async mutateAsync(payload){const result=await options.mutationFn(payload);await options.onSuccess(result);return result;}})},
 '@/features/history/hooks/useZones':{useZones:()=>fixture},
 '@/features/devices/services/radarService':{fetchTiposAlertas:async()=>[],async createRadarZone(payload){payloads.push(payload);if(failCreate)throw new Error('Fallo controlado al guardar');return {...payload,id:99,nombre:'Nombre devuelto por BD'};}},
 './zoneGeometry':geometry,'./components/ZonesMap':{ZonesMap:MapStub},'./components/ZoneJsonField':{ZoneJsonField:JsonStub},
});
let tree=pageHost.render(()=>Page());
assert.equal(JSON.parse(find(tree,n=>n.type===JsonStub).props.json).result.alert['MG-37'].name,zone.nombre);
find(tree,n=>n.type==='button'&&text(n)==='Crear zona').props.onClick();tree=pageHost.render(()=>Page());
function setInput(label,value) {const l=find(tree,n=>n.type==='label'&&text(n).startsWith(label));find(l,n=>n.type==='input').props.onChange({target:{value}});tree=pageHost.render(()=>Page());}
setInput('Nombre de la zona','Borrador nuevo');
for(const [lat,lon] of vertices.slice(0,3)){setInput('Agregar latitud',String(lat));setInput('Agregar longitud',String(lon));find(tree,n=>n.type==='button'&&text(n)==='Agregar punto').props.onClick();tree=pageHost.render(()=>Page());}
await find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});tree=pageHost.render(()=>Page());
assert.equal(payloads.length,1);assert.equal(payloads[0].idTipoAlerta,7);assert.equal(payloads[0].poligono.vertices.length,3);
const savedJson=JSON.parse(find(tree,n=>n.type===JsonStub).props.json);
assert.equal(savedJson.result.alert['MG-99'].name,'Nombre devuelto por BD');assert.equal(savedJson.result.alert['MG-99'].vertices.length,4);assert.equal(invalidations.length,1);
// Failed saves must keep the draft and never fabricate an exportable DB ID.
find(tree,n=>n.type==='button'&&text(n)==='Crear zona').props.onClick();tree=pageHost.render(()=>Page());setInput('Nombre de la zona','Zona con error');
for(const [lat,lon] of vertices.slice(0,3)){setInput('Agregar latitud',String(lat));setInput('Agregar longitud',String(lon));find(tree,n=>n.type==='button'&&text(n)==='Agregar punto').props.onClick();tree=pageHost.render(()=>Page());}
failCreate=true;await find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});tree=pageHost.render(()=>Page());
assert.ok(text(tree).includes('Fallo controlado al guardar'));assert.equal(find(tree,n=>n.type===MapStub).props.draft.length,3);

// Selecting checkboxes does not change when inspecting another zone or
// filtering the list; the final JSON always contains exactly the marked IDs.
find(tree,n=>n.type==='button'&&text(n)==='Cancelar').props.onClick();tree=pageHost.render(()=>Page());
find(tree,n=>n.type==='button'&&text(n)==='Seleccionar visibles').props.onClick();tree=pageHost.render(()=>Page());
let pageBatch=JSON.parse(find(tree,n=>n.type===JsonStub).props.json);
assert.deepEqual(Object.keys(pageBatch.result.alert),['MG-37','MG-99']);
assert.equal(find(tree,n=>n.type===JsonStub).props.zoneCount,2);
find(tree,n=>n.type==='select'&&n.props['aria-label']==='Plantilla para Nombre devuelto por BD').props.onChange({target:{value:'interior'}});tree=pageHost.render(()=>Page());
pageBatch=JSON.parse(find(tree,n=>n.type===JsonStub).props.json);
const {vertices:batchVertices,id:batchId,name:batchName,...batchSettings}=pageBatch.result.alert['MG-99'];
assert.deepEqual(batchSettings,templates.interior);
find(tree,n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value:'Módulo norte'}});tree=pageHost.render(()=>Page());
assert.deepEqual(Object.keys(JSON.parse(find(tree,n=>n.type===JsonStub).props.json).result.alert),['MG-37','MG-99'],'Search must not silently drop marked zones');
find(tree,n=>n.type==='input'&&n.props['aria-label']==='Incluir Módulo norte en el JSON').props.onChange();tree=pageHost.render(()=>Page());
assert.deepEqual(Object.keys(JSON.parse(find(tree,n=>n.type===JsonStub).props.json).result.alert),['MG-99']);
find(tree,n=>n.type==='button'&&text(n)==='Limpiar selección').props.onClick();tree=pageHost.render(()=>Page());
assert.equal(find(tree,n=>n.type===JsonStub).props.json,'');
assert.equal(find(tree,n=>n.type===JsonStub).props.zoneCount,0);

// Copy the exact field contents and confirm feedback only after successful copy.
const copyHost=host();const copies=[];
const {ZoneJsonField}=load('src/features/zones/components/ZoneJsonField.tsx',{react:copyHost.react},{navigator:{clipboard:{async writeText(value){copies.push(value);}}},document:{execCommand(){throw Error('Unexpected fallback');}}});
let copyTree=copyHost.render(()=>ZoneJsonField({json:geometry.zonesExportJson([zone,otherZone],{'42':'interior'}),zoneCount:2}));
find(copyTree,n=>n.type==='button').props.onClick();await new Promise(setImmediate);copyTree=copyHost.render(()=>ZoneJsonField({json:geometry.zonesExportJson([zone,otherZone],{'42':'interior'}),zoneCount:2}));
assert.equal(copies[0],geometry.zonesExportJson([zone,otherZone],{'42':'interior'}));assert.ok(text(copyTree).includes('JSON copiado al portapapeles.'));
assert.equal(find(copyTree,n=>n.type==='textarea').props.readOnly,true);
assert.equal(Object.keys(JSON.parse(copies[0]).result.alert).length,2);
const fallbackHost=host();let selected=0;
const fallback=load('src/features/zones/components/ZoneJsonField.tsx',{react:fallbackHost.react},{navigator:{},document:{execCommand(){return false;}}});
let fallbackTree=fallbackHost.render(()=>fallback.ZoneJsonField({json:'{}'}));find(fallbackTree,n=>n.type==='textarea').props.ref.current={focus(){},select(){selected++;}};
find(fallbackTree,n=>n.type==='button').props.onClick();await new Promise(setImmediate);fallbackTree=fallbackHost.render(()=>fallback.ZoneJsonField({json:'{}'}));
assert.equal(selected,1);assert.ok(text(fallbackTree).includes('no permitió copiar'));assert.ok(!text(fallbackTree).includes('JSON copiado al portapapeles.'));

// Static rendering of the actual details/map (schematic mode, no external tiles).
const actualHost=host();
const {ZonesMap}=load('src/features/zones/components/ZonesMap.tsx',{react:{...actualHost.react,useEffect(){},useCallback:fn=>fn},'react-map-gl':{default:()=>null,Layer:()=>null,Marker:()=>null,Popup:()=>null,Source:()=>null,NavigationControl:()=>null},'mapbox-gl/dist/mapbox-gl.css':{},'@/components/baseMap/libs':{MAPBOX_TOKEN:'',MAP_STYLES:{satellite:''},DEFAULT_CENTER:{latitude:-41,longitude:-73}},'../zoneGeometry':geometry});
const svg=renderToStaticMarkup(actualHost.render(()=>ZonesMap({zones:[zone],selected:zone,selectedVertex:0,onSelectZone(){},onSelectVertex(){},drawing:false,draft:[],onAddPoint(){},onMovePoint(){}})));
assert.ok(svg.includes('<polygon'));assert.ok(svg.includes('Ver punto 1'));assert.ok(svg.includes('Mapa esquemático'));
console.log('PASS: final result.alert format, immutable Exterior/Interior settings, batch selection/copy, precision, creation and zone map');
