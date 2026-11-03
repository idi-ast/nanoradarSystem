// node script/test-initial-map-view.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}, globals = {}) {
  const url = new URL(`../${file}`, import.meta.url);
  const require = createRequire(url);
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: name => name in mocks ? mocks[name] : require(name), console, ...globals });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const { resolveInitialMapView } = load('src/features/devices/utils/initialMapView.ts');
const fallback = { latitude: -41, longitude: -72, zoom: 15, pitch: 0, bearing: 0 };
const config = { latitud: '-42', longitud: '-73' };
const nano = { latitud: '-43', longitud: '-74' };
const magos = { latitud: '-44', longitud: '-75' };
const base = { savedCenter: null, savedZoom: null, savedPitch: null, savedBearing: null, config: null, fallback };
const resolve = patch => plain(resolveInitialMapView({ ...base, ...patch }));
assert.deepEqual(resolve({}), fallback, 'No radar/config/preferences keeps the existing fallback');
assert.deepEqual(resolve({ config }), { ...fallback, latitude: -42, longitude: -73 });
assert.deepEqual(resolve({ config, devices: { nanoradares: [nano], magosradares: [magos] } }), { ...fallback, latitude: -43, longitude: -74 });
assert.deepEqual(resolve({ config, devices: { magosradares: [magos] } }), { ...fallback, latitude: -44, longitude: -75 });
assert.deepEqual(resolve({ devices: { spotters: [{ latitude: '-45', longitude: '-76' }] } }), { ...fallback, latitude: -45, longitude: -76 });
assert.deepEqual(resolve({ devices: { nanoradares: [{ latitud: '', longitud: '0' }, { latitud: 'Infinity', longitud: '1' }, { latitud: '91', longitud: '1' }], magosradares: [magos] } }), { ...fallback, latitude: -44, longitude: -75 });
const saved = { latitude: -33.45, longitude: -70.66, zoom: 18.25, pitch: 60, bearing: -137.5 };
const prefs = { savedCenter: { latitude: saved.latitude, longitude: saved.longitude }, savedZoom: saved.zoom, savedPitch: saved.pitch, savedBearing: saved.bearing };
assert.deepEqual(resolve({ ...prefs, devices: { nanoradares: [nano] }, config }), saved, 'Saved 3D view must override radar and legacy config');
assert.deepEqual(resolve({ ...prefs, devices: { nanoradares: [magos] }, config }), saved, 'Late/updated device data must not override saved view');
assert.deepEqual(resolve({ savedCenter: prefs.savedCenter, savedZoom: 17 }), { ...fallback, ...prefs.savedCenter, zoom: 17 }, 'Legacy saved positions use default rotation and pitch');
assert.equal(resolve({ savedPitch: NaN, savedBearing: Infinity, savedZoom: Infinity }).pitch, fallback.pitch);
assert.deepEqual(resolve({ savedCenter: { latitude: NaN, longitude: 0 }, devices: { nanoradares: [nano] } }), { ...fallback, latitude: -43, longitude: -74 });
assert.deepEqual(resolve({ devices: { nanoradares: [{ latitud: '0', longitud: '-74' }] } }), { ...fallback, latitude: 0, longitude: -74 });
assert.deepEqual(resolve({ ...prefs, savedPitch: 0, savedBearing: 0, savedZoom: 0 }), { ...saved, pitch: 0, bearing: 0, zoom: 0 });

// Real Zustand store + real middleware: atomic save, rehydration, legacy compatibility.
const disk = new Map([['target-visual-prefs', JSON.stringify({ version: 1, state: { customMapCenter: prefs.savedCenter, customMapZoom: 17, trackStrokeWidth: 6 } })]]);
let writes = 0;
const localStorage = { getItem: key => disk.get(key) ?? null, setItem(key, value) { disk.set(key, value); writes++; }, removeItem: key => disk.delete(key) };
const storage = load('src/features/devices/utils/preferenceStorage.ts', {}, { localStorage });
const mocks = {
  '../utils/preferenceStorage': storage,
  '../components/map/boatSingleRenderer': { DEFAULT_BOAT3D_CONFIG: { modelPath: '/boat.glb', scale: 1 } },
};
const createStore = () => load('src/features/devices/stores/targetVisualStore.ts', mocks).useTargetVisualStore;
const store = createStore();
assert.equal(store.getState().customMapPitch, null);
assert.equal(store.getState().customMapBearing, null);
assert.equal(store.getState().trackStrokeWidth, 6);
store.getState().setCurrentViewport(saved);
const writesBeforeSave = writes;
store.getState().saveCurrentMapView();
assert.equal(writes, writesBeforeSave + 1, 'Save full view in a single write');
let stored = JSON.parse(disk.get('target-visual-prefs')).state;
assert.deepEqual({ ...stored.customMapCenter, zoom: stored.customMapZoom, pitch: stored.customMapPitch, bearing: stored.customMapBearing }, saved);
assert.equal(stored.currentViewportPitch, undefined);
assert.equal(stored.currentViewportBearing, undefined);
const reloaded = createStore();
const s = reloaded.getState();
assert.deepEqual(resolve({ savedCenter: s.customMapCenter, savedZoom: s.customMapZoom, savedPitch: s.customMapPitch, savedBearing: s.customMapBearing, devices: { nanoradares: [nano] } }), saved);
assert.equal(s.currentViewportCenter, null);
assert.equal(s.trackStrokeWidth, 6);
reloaded.getState().clearCustomMapView();
stored = JSON.parse(disk.get('target-visual-prefs')).state;
assert.equal(stored.customMapCenter, null);
assert.equal(stored.customMapZoom, null);
assert.equal(stored.customMapPitch, null);
assert.equal(stored.customMapBearing, null);
assert.deepEqual(resolve({ savedCenter: stored.customMapCenter, devices: { nanoradares: [nano] } }), { ...fallback, latitude: -43, longitude: -74 });
console.log('PASS: radar/default/saved priority, full 3D persistence, old preferences, clear and reload');
