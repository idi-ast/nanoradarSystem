import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const storage = new Map();
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
async function bundle(file) {
  const output = await build({ entryPoints: [file], bundle: true, platform: 'node', format: 'cjs', external: ['react'], write: false });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', 'localStorage', output.outputFiles[0].text)(module, module.exports, require, localStorage);
  return module.exports;
}
const categories = await bundle('src/features/devices/config/behaviorCategories.ts');
const { behaviorKey, behaviorLabel, behaviorCriticality, isBehaviorVisible, orderedBehaviorKeys, BEHAVIOR_ORDER } = categories;
for (const alias of ['lancha', 'barco', 'BOAT', 'Embarcación']) {
  assert.equal(behaviorKey(alias), 'lancha');
  assert.equal(behaviorLabel(alias), 'Embarcación');
  assert.equal(behaviorCriticality(alias), 'Alta');
}
// A boat always uses the boat model; unclassified/buoy/bird tracks never inherit a pet model.
assert.equal(categories.behaviorModelCategory('Embarcación', .9), 2);
assert.equal(categories.behaviorModelCategory('animal', .9), 4);
for (const value of ['sin_clasificar', undefined, 'boya', 'aves', 'ola']) assert.equal(categories.behaviorModelCategory(value, .99), null);
assert.equal(categories.behaviorModelCategory('animal', .3), null);
assert.equal(behaviorLabel('Pájaro'), 'Aves');
assert.equal(behaviorLabel('UNKNOWN'), 'Sin clasificar');
assert.deepEqual(orderedBehaviorKeys(['animal', 'aves', 'lancha', 'boat', 'boya']), ['lancha', 'bolla', 'pajaro', 'animal']);
for (const key of BEHAVIOR_ORDER.slice(0, 5)) assert.equal(isBehaviorVisible(key, {}), true);
for (const key of ['persona', 'vehiculo', 'animal', 'dron', 'mascota']) assert.equal(isBehaviorVisible(key, {}), false);
const store = (await bundle('src/features/devices/stores/behaviorVisibilityStore.ts')).useBehaviorVisibilityStore;
store.getState().setVisible('Animal', true);
store.getState().setVisible('Embarcación', false);
assert.equal(isBehaviorVisible('animal', store.getState().visibility), true);
assert.equal(isBehaviorVisible('BOAT', store.getState().visibility), false);
const reloaded = (await bundle('src/features/devices/stores/behaviorVisibilityStore.ts')).useBehaviorVisibilityStore;
assert.deepEqual(reloaded.getState().visibility, { animal: true, lancha: false });
const source = ts.transpileModule(readFileSync('src/layouts/header/BehaviorVisibilityControls.tsx', 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
runInNewContext(source, { exports, require: name => {
  if (name === '@tanstack/react-query') return { useQuery: () => ({ data: ['mascota'] }) };
  if (name.endsWith('/behaviorCategories')) return categories;
  if (name.endsWith('/behaviorVisibilityStore')) return { useBehaviorVisibilityStore: () => reloaded.getState() };
  if (name.endsWith('/services')) return { fetchBehaviorCategories: () => {} };
  return require(name);
}});
function inputs(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(inputs);
  return [...(node.type === 'input' ? [node] : []), ...inputs(node.props?.children)];
}
let switches = inputs(exports.BehaviorVisibilityControls());
const animal = switches.find(input => input.props['aria-label'] === 'Mostrar Animal');
assert.equal(animal.props.checked, true);
animal.props.onChange({ target: { checked: false } });
switches = inputs(exports.BehaviorVisibilityControls());
assert.equal(switches.find(input => input.props['aria-label'] === 'Mostrar Animal').props.checked, false);
assert.equal(switches.find(input => input.props['aria-label'] === 'Mostrar Mascota').props.checked, false);
console.log('PASS: category names, criticality, aliases, default visibility, on/off controls and persistence');
