// node script/test-live-track-continuity.mjs — controlled WebSocket and clock.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
function load(file, mocks = {}, globals = {}) {
  const require = createRequire(new URL(`../${file}`, import.meta.url));
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replaceAll('import.meta.env', '({DEV:false})');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(js, { exports, console, require: name => name in mocks ? mocks[name] : require(name), ...globals });
  return exports;
}
const states = [], effects = [], intervals = new Map();
let time = 1800000000000, intervalId = 0;
const react = {
  useRef: value => ({ current: value }), useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => effects.push(fn),
  useState(initial) {
    const i = states.length;
    states.push(typeof initial === 'function' ? initial() : initial);
    return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
  },
};
class Clock extends Date { static now() { return time; } }
class Socket {
  static all = [];
  constructor() { Socket.all.push(this); }
  close() {}
}
const { appendBoundedHistory } = load('src/features/devices/utils/boundedHistory.ts');
const { useRadarWebSocket } = load('src/features/devices/hooks/useRadarWebSocket.ts', {
  react, '../config': { TARGET_TIMING: { HISTORY_MAX_POINTS: 100, TARGET_TIMEOUT_MS: 600000 } },
  '../stores/targetVisualStore': { useTargetVisualStore: fn => fn({ inactiveIconTimeoutSec: 5 }) },
  '../stores/radarConnectionStore': { useRadarConnectionStore: { getState: () => ({ setStatus() {}, remove() {} }) } },
  '../utils/boundedHistory': { appendBoundedHistory }, sonner: { toast: {} },
}, {
  WebSocket: Socket, Date: Clock, localStorage: { getItem: () => null },
  setInterval(fn, delay) { const id = ++intervalId; intervals.set(id, { fn, delay }); return id; },
  clearInterval: id => intervals.delete(id), setTimeout() {}, clearTimeout() {},
});
const exclusions = [];
useRadarWebSocket('ws://example.invalid', undefined, undefined, ids => exclusions.push(...ids));
const cleanup = effects[0]();
const socket = Socket.all[0];
const send = payload => socket.onmessage({ data: JSON.stringify(payload) });
const tick = delay => [...intervals.values()].find(interval => interval.delay === delay).fn();
const position = (offset = 0) => ({ lat: -41.5, lon: -73 + offset, ts: time / 1000, nivel: 1, zona: 'mar', snr: 10, heading: 0, speed: 1 });
const boat = () => states[0].get('magosradar_T23');
const sendBoat = () => send({ magosRadar: [{ trackId: 'T23', behaviorClass: 'lancha', behaviorConfidence: 0.9, positions: [position()] }] });
sendBoat();
send({ magosRadar: [{ trackId: 'T99', positions: [position()] }], nanoRadar: [{ id: 'a', lat: -41, lon: -73 }] });
send({ magosRadar: [], nanoRadar: [], spotter: [] });
tick(200);
assert.ok(boat(), 'An empty/other-radar frame must not discard a pending active boat');
assert.ok(states[0].has('magosradar_T99'));
assert.ok(states[0].has('nanoRadar_a'));
// Repeated updates to the same ID must retain every position within a flush.
time += 100;
sendBoat();
time += 100;
sendBoat();
send({ magosRadar: [{ trackId: 'T23', positions: [] }] });
send({ spotter: [{ id: 's1', lat: -41, lon: -73 }] });
send({ spotter: [{ id: 's2', lat: -41, lon: -73 }] });
send({ spotter: [] });
tick(200);
assert.equal(boat().history.length, 3);
assert.ok(states[0].has('spotter_s1'));
assert.ok(states[0].has('spotter_s2'));
for (let i = 0; i < 180; i++) {
  time += 2000;
  sendBoat();
  send({ magosRadar: [{ trackId: 'T99', positions: [position()] }] });
  tick(200);
  tick(5000);
  assert.ok(boat(), `Active boat disappeared at ${i * 2} seconds`);
  assert.equal(boat().lastUpdate, time);
}
assert.equal(boat().history.length, 100, 'History must remain bounded');
const before = boat();
time += 100;
send({ magosRadar: [{ trackId: 'T23', positions: [{ ...position(), lat: null }] }] });
tick(200);
assert.ok(Number.isFinite(boat().lat));
assert.equal(boat().lat, before.lat);
assert.equal(boat().lastUpdate, before.lastUpdate, 'Invalid data cannot refresh a real detection');
time += 100;
sendBoat();
tick(200);
assert.ok(Number.isFinite(boat().lat), 'The next valid detection must retain valid kinematics');
assert.equal(boat().lastUpdate, time);
// Entering exclusion removes both rendered and buffered observations immediately.
time += 100;
sendBoat();
send({ magosRadar: [], magosRadarExcluded:['T23'] });
assert.equal(boat(), undefined);
assert.ok(exclusions.includes('magosradar_T23'));
tick(200);
assert.equal(boat(), undefined, 'A buffered pre-exclusion point must not resurrect the target');
time += 100;
sendBoat();
tick(200);
assert.ok(boat(), 'Leaving exclusion can reuse the radar track ID');
assert.equal(boat().history.length, 1, 'Reentry must start from a clean visible position');
time += 5001;
tick(5000);
assert.equal(boat(), undefined);
cleanup();
assert.equal(intervals.size, 0);
console.log('PASS: interleaved sweeps, empty broadcasts, six-minute active track continuity, bounded history, invalid coordinates and real inactivity');
