import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const saved = new Map(); let writes = 0;
globalThis.localStorage = { getItem: name => saved.get(name) ?? null, setItem(name, value) { saved.set(name, value); writes++; }, removeItem: name => saved.delete(name) };
function load(file, mocks = {}, globals = {}) {
 const exports = {};
 runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => name in mocks ? mocks[name] : require(name), console, ...globals });
 return exports;
}
const mod = load('src/features/devices/stores/trackSurveillanceStore.ts', { '@/libs/zustand/stores/userStore': { useUserStore: fn => fn({ user: { id: 1 } }) } });
const store = mod.useTrackSurveillanceStore;
const scope = mod.useSurveillanceScope('radar-1');
const make = (id, time = 1800000000000) => ({ id, lat: -41, lon: -73, nivel: 1, zona: 'mar', lastUpdate: time, deviceType: 'magosradar', history: [[-41, -73, time]] });
const boat = make('magosradar_T23');
store.getState().watch(scope, boat);
const lost = mod.mergeSurveillanceTargets([], store.getState().entries, scope);
assert.equal(lost.length, 1);
assert.equal(lost[0].underSurveillance, true);
assert.equal(lost[0].lastUpdate, boat.lastUpdate, 'Keeping a target cannot manufacture a fresh detection');
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, 'another-user').length, 0);
const fresh = make(boat.id, boat.lastUpdate + 6000);
store.getState().observe(scope, [fresh]);
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope)[0].lastUpdate, fresh.lastUpdate);
const count = writes;
store.getState().observe(scope, [fresh]);
store.getState().observe(scope, [make(boat.id, fresh.lastUpdate + 200)]);
assert.equal(writes, count, 'Unchanged and frequent observations must not rewrite saved history');
const another = make('magosradar_T24');
const simultaneous = mod.mergeSurveillanceTargets([fresh, another], store.getState().entries, scope);
assert.equal(simultaneous.length, 2, 'Live and saved copies of the same ID must not duplicate');
assert.equal(simultaneous[1].underSurveillance, undefined, 'A new ID is not assumed to be the missing boat');
store.persist.rehydrate();
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope)[0].lastUpdate, fresh.lastUpdate, 'Reload preserves the last observation, not a current timestamp');
// Exercise actual hook cleanup of the live cache: preserve the final update,
// even if it arrived less than five seconds after the last saved observation.
let previous, effect;
const hook = load('src/features/devices/hooks/useSurveillanceTargets.ts', {
 react: { useEffect: fn => { effect = fn; }, useMemo: fn => fn(), useRef: value => previous ??= { current: value } },
 '../stores/trackSurveillanceStore': { ...mod, useTrackSurveillanceStore: Object.assign(fn => fn(store.getState()), { getState: store.getState }) },
});
const final = make(boat.id, fresh.lastUpdate + 200);
hook.useSurveillanceTargets([final], 'radar-1'); effect();
hook.useSurveillanceTargets([], 'radar-1'); effect();
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope)[0].lastUpdate, final.lastUpdate);
store.getState().release(scope, boat.id);
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope).length, 0);
assert.equal(mod.mergeSurveillanceTargets([fresh], store.getState().entries, scope).length, 1, 'Releasing surveillance must not delete real live data');
assert.throws(() => store.getState().watch(scope, { ...boat, lat: NaN }));
for (let i = 0; i < 20; i++) store.getState().watch(scope, make(`magosradar_T${i}`));
assert.throws(() => store.getState().watch(scope, make('magosradar_overflow')), /20/);
store.getState().watch(scope, { ...make('magosradar_T0'), history: Array.from({ length: 2000 }, (_, i) => [-41, -73, boat.lastUpdate + i]) });
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope)[0].history.length, 1500);
store.setState({ entries: {} });
const watched = make('magosradar_UI', Date.now() - 120000);
store.getState().watch(scope, watched);
let liveTargets = [watched];
const ui = load('src/features/devices/components/panel/TrackSurveillance.tsx', {
 '../../context/useRadarContext': { useRadarContext: () => ({ instanceConfig: { id: 'radar-1', timing: { TRACKING_ACTIVE_MS: 10000 } } }), useRadarTargets: () => ({ targets: liveTargets }) },
 '../../stores/trackSurveillanceStore': { ...mod, useTrackSurveillanceStore: fn => fn(store.getState()) },
 sonner: { toast: {} },
});
let html = renderToStaticMarkup(createElement(ui.TrackSurveillanceButton, { target: watched }));
assert.ok(html.includes('Retirar de vigilancia'));
assert.ok(html.includes('Sin señal hace 2 min'));
assert.ok(html.includes('Última posición conocida'));
// Stable sidebar cards hold an older target. Status must use the current live
// context so an actively detected boat never incorrectly shows "Sin señal".
liveTargets = [make(watched.id, Date.now())];
html = renderToStaticMarkup(createElement(ui.SurveillanceStatus, { target: watched }));
assert.ok(html.includes('Detección reciente'));
store.getState().release(scope, watched.id);
html = renderToStaticMarkup(createElement(ui.TrackSurveillanceButton, { target: watched }));
assert.ok(html.includes('Mantener bajo vigilancia'));
assert.ok(!html.includes('Última posición conocida'));
store.setState({ entries: {} });
console.log('PASS: lost tracks retained with real timestamps, account scoping, bounded snapshots/writes, reload, final observation, new IDs and manual release');

store.setState({ entries: {} });
store.getState().watch(scope, boat);
store.getState().observe(scope, [make(boat.id, boat.lastUpdate + 1000)]);
store.getState().exclude(scope, [boat.id]);
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope).length, 0, 'Saved surveillance cannot resurrect an excluded target');
store.getState().observe(scope, [make(boat.id, boat.lastUpdate + 1000)], true);
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope).length, 0, 'Final cached observation cannot undo an exclusion');
store.persist.rehydrate();
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope).length, 0);
store.getState().observe(scope, [make(boat.id, boat.lastUpdate + 2000)]);
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope).length, 1, 'A new allowed observation restores watched target visibility');
store.setState({ entries: {} });
console.log('PASS: exclusion overrides saved surveillance and persists until a new allowed observation');

// Backend identity fusion transfers surveillance and cannot resurrect old IDs.
store.setState({ entries: {} });
const alias = make('magosradar_T500', Date.now());
const canonical = { ...make('magosradar_T1', alias.lastUpdate + 100), mergedTrackIds: ['T500'] };
store.getState().watch(scope, alias);
let fused = mod.mergeSurveillanceTargets([canonical], store.getState().entries, scope);
assert.equal(fused.length, 1);
assert.equal(fused[0].id, canonical.id);
assert.equal(fused[0].underSurveillance, true);
store.getState().observe(scope, [canonical]);
fused = mod.mergeSurveillanceTargets([], store.getState().entries, scope);
assert.equal(fused.length, 1);
assert.equal(fused[0].id, canonical.id);
assert.equal(fused[0].lastUpdate, canonical.lastUpdate);
assert.equal(store.getState().entries[JSON.stringify([scope, alias.id])], undefined);
store.persist.rehydrate();
assert.equal(mod.mergeSurveillanceTargets([], store.getState().entries, scope)[0].id, canonical.id);
console.log('PASS: fusion transfers surveillance to canonical ID, with bounded history, real timestamps and reload continuity');
