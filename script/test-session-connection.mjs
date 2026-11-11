// node script/test-session-connection.mjs — real socket lifecycle and controlled auth API.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
function load(file,mocks={},globals={}) {
 const require=createRequire(new URL(`../${file}`,import.meta.url));
 const source=readFileSync(new URL(`../${file}`,import.meta.url),'utf8').replaceAll('import.meta.env','({DEV:false})');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};runInNewContext(js,{exports,require:name=>name in mocks?mocks[name]:require(name),console,Error,AbortController,Event,setTimeout,clearTimeout,...globals});return exports;
}
const connections=load('src/features/devices/stores/radarConnectionStore.ts');
const store=connections.useRadarConnectionStore;
const states=[],refs=[],effects=[];
const react={useRef(initial){const ref={current:initial};refs.push(ref);return ref;},useState(initial){const i=states.length;states.push(typeof initial==='function'?initial():initial);return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
const timers=new Map(),intervals=new Map(),listeners=new Map();let next=0,time=Date.now();
const disk=new Map([['access_token','signed-token']]);
const localStorage={getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value),removeItem:key=>disk.delete(key)};
class Clock extends Date {static now(){return time;}}
class Socket {
 static OPEN=1;static CLOSING=2;static CLOSED=3;static all=[];
 constructor(url){this.url=url;this.readyState=0;this.sent=[];Socket.all.push(this);}
 open(){this.readyState=1;this.onopen();}
 send(message){this.sent.push(JSON.parse(message));}
 close(code=1000){this.readyState=3;this.onclose?.({code});}
}
const window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),dispatchEvent:event=>listeners.get(event.type)?.()};
const {appendBoundedHistory}=load('src/features/devices/utils/boundedHistory.ts');
const module=load('src/features/devices/hooks/useRadarWebSocket.ts',{
 react,'../stores/radarConnectionStore':connections,'../config':{TARGET_TIMING:{HISTORY_MAX_POINTS:10,TARGET_TIMEOUT_MS:600000,TRACKING_ACTIVE_MS:10000}},
 '../stores/targetVisualStore':{useTargetVisualStore:select=>select({inactiveIconTimeoutSec:0})},sonner:{toast:{}},'../utils/boundedHistory':{appendBoundedHistory},
},{localStorage,WebSocket:Socket,Date:Clock,window,setInterval(fn,delay){const id=++next;intervals.set(id,{fn,delay});return id;},clearInterval:id=>intervals.delete(id),setTimeout(fn,delay){const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)});
module.useRadarWebSocket('ws://example.invalid/wsRadar?existing=yes');
const cleanup=effects[0]();let socket=Socket.all.at(-1);
const connected=()=>[...store.getState().connections.values()].includes('connected');
assert.ok(socket.url.includes('&token=signed-token'));assert.equal(connected(),false);
socket.open();assert.equal(connected(),true);
const heartbeat=()=>[...intervals.values()].find(t=>t.delay===10000).fn();
time+=10000;heartbeat();assert.deepEqual(socket.sent,[{type:'ping'}]);
socket.onmessage({data:'{"type":"pong"}'});assert.equal(connected(),true);
time+=35000;heartbeat();assert.equal(connected(),false);assert.equal(socket.readyState,Socket.CLOSED);
const retry=[...timers.values()][0];assert.equal(retry.delay,1000);retry.fn();socket=Socket.all.at(-1);socket.open();assert.equal(connected(),true);
listeners.get('offline')();assert.equal(connected(),false);
// An upgraded token reconnects an existing hook, instead of opening a header WS.
disk.set('access_token','persistent-replacement');listeners.get('radar-auth-token-changed')();socket=Socket.all.at(-1);assert.ok(socket.url.includes('persistent-replacement'));socket.open();assert.equal(connected(),true);
socket.onerror();assert.equal(connected(),false);
socket.close(4001);const count=Socket.all.length;assert.equal(Socket.all.length,count);
cleanup();assert.equal(store.getState().connections.size,0);assert.equal(intervals.size,0);assert.equal(listeners.size,0);
// One disconnected owner must not hide another still-connected radar socket.
const a=Symbol(),b=Symbol();store.getState().setStatus(a,'connected');store.getState().setStatus(b,'disconnected');assert.equal(connected(),true);store.getState().remove(a);assert.equal(connected(),false);store.getState().remove(b);
const {RadarConnectionIndicator}=load('src/layouts/header/RadarConnectionIndicator.tsx',{'@/features/devices/stores/radarConnectionStore':{useRadarConnectionStore:selector=>selector(store.getState())}});
assert.ok(renderToStaticMarkup(React.createElement(RadarConnectionIndicator)).includes('bg-gray-400'));
store.getState().setStatus(a,'connected');assert.ok(renderToStaticMarkup(React.createElement(RadarConnectionIndicator)).includes('bg-emerald-500'));store.getState().remove(a);

// Session verification upgrades only the token it validated; logout revokes
// remotely first and cleans locally even when the connection is unavailable.
let offline=false;const calls=[];
const api={setHeader(){},removeHeader(name){calls.push(['remove',name]);},async get(){return {data:{access_token:'persistent-upgrade'}};},async post(path,body,options){calls.push([path,disk.get('access_token'),Boolean(options?.signal)]);if(offline)throw Error('offline');return {data:{success:true}};}};
const {authService}=load('src/template/auth/services/authService.ts',{'@/apis':{apiSystem:api}},{localStorage,window,console:{warn(){}}});
disk.set('access_token','legacy');assert.equal((await authService.verifySession()).success,true);assert.equal(disk.get('access_token'),'persistent-upgrade');
await authService.logout();assert.equal(calls.find(c=>c[0]==='/logout')[1],'persistent-upgrade');assert.equal(disk.has('access_token'),false);
offline=true;disk.set('access_token','token');disk.set('auth_user','cached');await authService.logout();assert.equal(disk.has('access_token'),false);assert.equal(disk.has('auth_user'),false);
offline=false;
api.post=async path=>path==='/authenticated'?{data:{access_token:'new-persistent',user:{id:5,email:'operator@test.local',nombre:'Operador',apellido:'Centro',role_id:3}}}:{data:{success:true}};
api.get=async()=>{throw Error('No user listing should be requested');};
disk.set('refresh_token','stale');
const login=await authService.login({email:'operator@test.local',password:'test'});
assert.equal(login.success,true);assert.equal(login.user.id,'5');assert.equal(disk.has('refresh_token'),false);
api.post=async()=>{throw Error('offline');};
await authService.login({email:'operator@test.local',password:'test'});
assert.equal(disk.get('access_token'),'new-persistent','A failed login request must not remove an existing session');
console.log('PASS: WS green/gray state, heartbeat loss, reconnection/upgrade, cleanup, session migration and explicit logout');
