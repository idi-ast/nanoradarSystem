// node script/test-browser-memory.mjs — usa dependencias instaladas, sin navegador ni backend.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { QueryClient, QueryObserver, timeoutManager } from '@tanstack/react-query';

function load(file, mocks = {}, globals = {}, transform = s => s) {
  const url = new URL(`../${file}`, import.meta.url);
  const require = createRequire(url);
  const source = transform(readFileSync(url, 'utf8')).replaceAll('import.meta.env', '({ DEV: false })');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  runInNewContext(js, { exports, require: name => name in mocks ? mocks[name] : require(name),
    console, AbortController, URL, ...globals });
  return exports;
}
const { appendBoundedHistory } = load('src/features/devices/utils/boundedHistory.ts');
for (const max of [1, 10, 1500]) {
  for (const n of [0, 1, 100, 20000]) {
    const previous = Array.from({ length: 2000 }, (_, i) => i);
    const incoming = Array.from({ length: n }, (_, i) => 2000 + i);
    assert.deepEqual(Array.from(appendBoundedHistory(previous, incoming, max)), [...previous, ...incoming].slice(-max));
    assert.equal(previous.length, 2000, 'Published state must not be mutated');
  }
}

// Actual Zustand persistence: runtime viewport moves must not produce disk writes.
const disk = new Map();
let writes = 0;
const localStorage = {
  getItem: k => disk.get(k) ?? null,
  setItem(k, v) { disk.set(k, v); writes++; },
  removeItem: k => disk.delete(k),
};
const storage = load('src/features/devices/utils/preferenceStorage.ts', {}, { localStorage });
const { useTargetVisualStore: store } = load('src/features/devices/stores/targetVisualStore.ts', {
  '../utils/preferenceStorage': storage,
  '../components/map/boatSingleRenderer': { DEFAULT_BOAT3D_CONFIG: { modelPath: '/boat.glb', scale: 1 } },
});
store.getState().setTrackStrokeWidth(8);
const saved = disk.get('target-visual-prefs');
for (let i = 0; i < 1000; i++) {
  store.getState().setCurrentViewportCenter({ latitude: i / 1000, longitude: 1 });
  store.getState().setCurrentViewportZoom(i / 100);
}
assert.equal(writes, 1);
assert.equal(disk.get('target-visual-prefs'), saved);
assert.equal(store.getState().currentViewportZoom, 9.99);
assert.equal(JSON.parse(saved).state.currentViewportCenter, undefined);
store.getState().setCustomMapZoom(17);
assert.equal(writes, 2);
store.getState().setCustomMapZoom(17);
assert.equal(writes, 2);
await store.persist.rehydrate();
assert.equal(store.getState().customMapZoom, 17);

// Query options through the real QueryObserver: same 30 s window shares one fetch,
// the backend still receives the exact timestamp, and inactive data is collectible.
const requests = [];
const { useTrackHistory } = load('src/features/devices/hooks/useTrackHistory.ts', {
  '@tanstack/react-query': { useQuery: options => options },
  '../services/radarService': { fetchTrackHistory: async (id, params) => {
    requests.push({ id, params }); return { points: [{ lat: 1, lon: 1 }] };
  } },
});
const timers = new Map();
let timerId = 0;
timeoutManager.setTimeoutProvider({
  setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
  setInterval() { throw new Error('Unexpected interval in query test'); },
  clearInterval() {},
});
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const opts = sessionRef => useTrackHistory({ trackId: 'T1', tipoRadar: 'magos', sessionRef });
const epoch = 1800000000000;
const observer = new QueryObserver(qc, opts(epoch));
const unsubscribe = observer.subscribe(() => {});
await observer.refetch();
const firstRequests = requests.length;
for (let i = 1; i < 150; i++) observer.setOptions(opts(epoch + i * 200));
assert.equal(qc.getQueryCache().getAll().length, 1);
assert.equal(requests.length, firstRequests);
await observer.refetch();
assert.equal(requests.at(-1).params.session_ref, new Date(epoch + 29800).toISOString());
observer.setOptions(opts(epoch + 30000));
await observer.refetch();
assert.equal(qc.getQueryCache().getAll().length, 2);
assert.notDeepEqual(opts(epoch).queryKey, opts(epoch + 86400000).queryKey, 'Different days must remain isolated');
unsubscribe();
for (const [id, timer] of [...timers]) if (timer.delay === 60000) { timers.delete(id); timer.fn(); }
assert.equal(qc.getQueryCache().getAll().length, 0);
qc.clear();

// Minimal hook host for lifecycle tests; actual timers/WS/media are controlled doubles.
function hookHost() {
  const states = [], refs = [], effects = [];
  const react = {
    useRef(initial) { const ref = { current: initial }; refs.push(ref); return ref; },
    useState(initial) {
      const index = states.length;
      states.push(typeof initial === 'function' ? initial() : initial);
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => effects.push(fn),
  };
  return { react, states, refs, effects };
}
const wsHost = hookHost();
const intervals = new Map();
let nextInterval = 0, clock = epoch;
class Socket {
  static all = [];
  constructor() { Socket.all.push(this); }
  close() { this.closed = true; }
}
class Clock extends Date { static now() { return clock; } }
const timing = { HISTORY_MAX_POINTS: 1500, TARGET_TIMEOUT_MS: 600000 };
const wsModule = load('src/features/devices/hooks/useRadarWebSocket.ts', {
  react: wsHost.react, '../config': { TARGET_TIMING: timing },
  '../stores/targetVisualStore': { useTargetVisualStore: selector => selector({ inactiveIconTimeoutSec: 0 }) },
  '../stores/radarConnectionStore': load('src/features/devices/stores/radarConnectionStore.ts'),
  sonner: { toast: {} }, '../utils/boundedHistory': { appendBoundedHistory },
}, { localStorage, WebSocket: Socket, Date: Clock,
  setInterval(fn, delay) { const id = ++nextInterval; intervals.set(id, { fn, delay }); return id; },
  clearInterval: id => intervals.delete(id), setTimeout() {}, clearTimeout() {},
});
const radar = wsModule.useRadarWebSocket('ws://example.invalid');
const closeRadar = wsHost.effects[0]();
const socket = Socket.all[0];
const tick = delay => [...intervals.values()].find(t => t.delay === delay).fn();
socket.onmessage({ data: JSON.stringify({ magosRadar: [{ trackId: '1', positions: Array.from({ length: 2000 }, (_, i) => ({ lat: -41, lon: -73, ts: epoch / 1000 + i, nivel: 0, zona: '' })) }] }) });
tick(200);
assert.equal(wsHost.states[0].get('magosradar_1').history.length, 1500, 'Initial payload also obeys the history limit');
assert.equal(wsHost.refs[0].current.size, 1);
const sameMap = wsHost.states[0];
socket.onmessage({ data: JSON.stringify({ actividad: { camaras: [{ ip: 'test' }] } }) });
tick(200);
assert.equal(wsHost.states[0], sameMap, 'Camera-only updates must not copy target histories');
clock += 120001;
tick(15000);
assert.equal(wsHost.refs[0].current.size, 0, 'Kinematics must expire even without incoming messages');
radar.clearTargets();
assert.equal(wsHost.states[0].size, 0);
closeRadar();
assert.equal(intervals.size, 0);
assert.equal(socket.closed, true);
assert.equal(socket.onmessage, null);

// Both camera implementations must preserve the stream during fullscreen detachment,
// and close/abort/stop/detach exactly once when the camera really unmounts.
for (const file of ['src/features/devices/components/map/cameras/ptz/hooks/useWebRtcPlayer.ts', 'src/features/devices/components/map/cameras/Camera.tsx']) {
  const host = hookHost();
  const peers = [], fetches = [];
  class Peer {
    constructor() { peers.push(this); }
    addTransceiver() {}
    async createOffer() { return { sdp: 'test' }; }
    async setLocalDescription() {}
    async setRemoteDescription() { this.remoteSet = true; }
    close() { this.closed = true; }
  }
  const cameraModule = load(file, { react: host.react }, {
    RTCPeerConnection: Peer,
    fetch(url, config) { fetches.push(config); return new Promise(() => {}); },
    setTimeout() {}, clearTimeout() {},
  }, source => {
    if (file.endsWith('/Camera.tsx')) {
      const start = source.indexOf('function useWebRtcPlayer(');
      const end = source.indexOf('\nfunction CameraToolbar(', start);
      return `import { useCallback, useEffect, useRef, useState } from "react";\nexport ${source.slice(start, end)}`;
    }
    return source;
  });
  const camera = cameraModule.useWebRtcPlayer('https://example.invalid/camera');
  const cleanups = host.effects.map(fn => fn()).filter(Boolean);
  let stops = 0, pauses = 0;
  const track = { stop() { stops++; } };
  const stream = { getTracks: () => [track] };
  const node = { srcObject: null, pause() { pauses++; }, play: async () => {} };
  camera.videoRef(node);
  await new Promise(resolve => setImmediate(resolve));
  const peer = peers[0];
  peer.ontrack({ streams: [stream] });
  camera.videoRef(null);
  assert.equal(peer.closed, undefined, 'Fullscreen must retain its shared connection');
  assert.equal(camera.streamRef.current, stream);
  cleanups.forEach(fn => fn());
  cleanups.forEach(fn => fn());
  assert.equal(peer.closed, true);
  assert.equal(peer.ontrack, null);
  assert.equal(stops, 1);
  assert.equal(pauses, 1);
  assert.equal(node.srcObject, null);
  assert.equal(camera.streamRef.current, null);
  assert.equal(fetches[0].signal.aborted, true);
}
console.log('PASS: bounded histories, preference writes/rehydration, query reuse/GC, WS cleanup, camera/fullscreen lifecycle');

// A playback pool must stop scheduling new downloads after leaving the page.
{
  const host = hookHost();
  const pending = [];
  let loads = 0;
  const playbackModule = load('src/features/history/hooks/useTrackPlayback.ts', {
    react: host.react,
    '@tanstack/react-query': { useQueryClient: () => ({ fetchQuery: options => options.queryFn() }) },
    '@/features/devices/services/radarService': { fetchTrackHistory: () => {
      loads++; return new Promise(resolve => pending.push(resolve));
    } },
  });
  const playback = playbackModule.useTrackPlayback();
  const cleanup = host.effects.map(fn => fn()).filter(Boolean);
  const loading = playback.playAll(Array.from({ length: 100 }, (_, i) => ({ track_id: String(i), tipo_radar: 'magos' })));
  assert.equal(loads, 4);
  cleanup.forEach(fn => fn());
  pending.forEach(resolve => resolve({ points: [] }));
  await loading;
  assert.equal(loads, 4, 'The remaining 96 tracks must not be downloaded after unmount');
}
{
  const host = hookHost();
  const pollingIntervals = new Map();
  let nextId = 0;
  const { useNotificationPolling } = load('src/hooks/useNotifications.ts', {
    react: host.react, '../services/logsNotificationsService': { NotificationsService: {}, LogsService: {} },
  }, { setInterval(fn) { const id = ++nextId; pollingIntervals.set(id, fn); return id; },
    clearInterval: id => pollingIntervals.delete(id) });
  const poll = useNotificationPolling();
  const cleanup = host.effects.map(fn => fn()).filter(Boolean);
  poll.startPolling(); poll.startPolling(); poll.startPolling();
  assert.equal(pollingIntervals.size, 1);
  cleanup.forEach(fn => fn());
  assert.equal(pollingIntervals.size, 0);
}
console.log('PASS: playback download pool cancellation and idempotent notification polling');
