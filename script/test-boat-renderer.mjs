// node script/test-boat-renderer.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';

const pendingLoads = [];
const renderVersions = [];
let rendererDisposed = 0;
const canvas = { width: 1920, height: 1080 };
class Renderer {
  constructor() { this.domElement = canvas; }
  setPixelRatio() { assert.fail('Three must not resize the Mapbox canvas'); }
  setSize() { assert.fail('Three must not resize the Mapbox canvas'); }
  setViewport(x, y, width, height) { assert.deepEqual([x, y, width, height], [0, 0, 1920, 1080]); }
  resetState() {}
  render(scene) {
    scene.traverse(obj => {
      if (obj.isMesh && obj.name === 'test-model') {
        renderVersions.push((Array.isArray(obj.material) ? obj.material : [obj.material]).map(m => m.version));
      }
    });
  }
  dispose() { rendererDisposed++; }
}
class Loader { load(path, success) { pendingLoads.push({ path, success }); } }
const module = { exports: {} };
const source = readFileSync(new URL('../src/features/devices/components/map/boatSingleRenderer.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
runInNewContext(compiled, {
  exports: module.exports,
  require(name) {
    if (name === 'three') return { ...THREE, WebGLRenderer: Renderer };
    if (name.endsWith('GLTFLoader.js')) return { GLTFLoader: Loader };
    if (name === 'mapbox-gl') return { MercatorCoordinate: { fromLngLat: () => ({ x: 0, y: 0, z: 0, meterInMercatorCoordinateUnits: () => 1 }) } };
    throw new Error(`Unexpected import: ${name}`);
  },
  console, performance,
});
const api = module.exports;
const map = { getCanvas: () => canvas, triggerRepaint() {} };
const matrix = new THREE.Matrix4().toArray();
const layer = api.createBoatLayer();

function model() {
  const texture = new THREE.Texture();
  const materials = [new THREE.MeshBasicMaterial({ map: texture }), new THREE.MeshStandardMaterial()];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), materials);
  mesh.name = 'test-model';
  return { mesh, texture, materials };
}

api.registerBoat('boat', -73, -41, '/boat.glb');
layer.onAdd(map, {});
const loaded = model();
let textureDisposals = 0;
loaded.texture.addEventListener('dispose', () => textureDisposals++);
pendingLoads.shift().success({ scene: loaded.mesh, animations: [] });
layer.render({}, matrix);
layer.render({}, matrix);
assert.equal(renderVersions.length, 2);
assert.deepEqual(renderVersions[0], renderVersions[1], 'Stable materials must not request shader recompilation every frame');
assert.ok(loaded.materials.every(m => m.transparent));
api.updateBoat('boat', { dimmed: true });
layer.render({}, matrix);
assert.ok(loaded.materials.every(m => m.opacity === 0.4));
assert.deepEqual(renderVersions[1], renderVersions[2], 'Opacity updates do not require recompiling');
assert.deepEqual(canvas, { width: 1920, height: 1080 });

// A style change while a GLB is loading must reject the old callback,
// even if the next scene is already mounted and requesting the same path.
api.updateBoat('boat', { modelPath: '/pending.glb' });
const oldLoad = pendingLoads.shift();
layer.onRemove();
assert.equal(textureDisposals, 1);
assert.equal(rendererDisposed, 1);
layer.onAdd(map, {});
const newLoad = pendingLoads.shift();
const stale = model();
let staleDisposals = 0;
stale.texture.addEventListener('dispose', () => staleDisposals++);
oldLoad.success({ scene: stale.mesh, animations: [] });
assert.equal(staleDisposals, 1, 'A stale load must free its textures');
const before = renderVersions.length;
layer.render({}, matrix);
assert.equal(renderVersions.length, before, 'A stale model must never render in the new scene');
assert.equal(pendingLoads.length, 0, 'A stale callback must not clear the new in-flight request');
newLoad.success({ scene: model().mesh, animations: [] });
layer.render({}, matrix);
assert.equal(renderVersions.length, before + 1);
layer.onRemove();
api.destroyBoatLayer();
console.log('PASS: canvas ownership, material updates, texture cleanup and stale GLB loads');
