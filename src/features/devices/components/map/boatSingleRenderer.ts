import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MercatorCoordinate } from "mapbox-gl";
import type { CustomLayerInterface, Map as MapboxMap } from "mapbox-gl";

export interface BoatEntry {
  lng: number;
  lat: number;
  bearingDeg: number;
  moving: boolean;
  isSelected: boolean;
}

export interface Boat3DConfig {
  modelPath: string;
  scale: number;
  rotationOffset: number;
  ambientInt: number;
  dirInt: number;
  camHeight: number;
  camDist: number;
  fov: number;
}

export const DEFAULT_BOAT3D_CONFIG: Boat3DConfig = {
  modelPath: "/3d/glb/ship.glb",
  scale: 1,
  rotationOffset: 0,
  camHeight: 3.5,
  camDist: 2.5,
  fov: 40,
  ambientInt: 0.7,
  dirInt: 1.4,
};

export const BOAT_LAYER_ID = "boat-3d-custom-layer";

let _map: MapboxMap | null = null;
let _renderer: THREE.WebGLRenderer | null = null;
let _scene: THREE.Scene | null = null;
let _camera: THREE.Camera | null = null;
let _modelGroup: THREE.Group | null = null;
let _boatObj: THREE.Object3D | null = null;
let _mixer: THREE.AnimationMixer | null = null;
let _ambientLight: THREE.AmbientLight | null = null;
let _dirLight: THREE.DirectionalLight | null = null;
let _movingRing: THREE.Mesh | null = null;
let _selectedRing: THREE.Mesh | null = null;
let _maxDim = 1;
let _loadId = 0;
const _clock = new THREE.Clock();
let _config: Boat3DConfig = { ...DEFAULT_BOAT3D_CONFIG };
const _entries = new Map<string, BoatEntry>();

/** Base size of the model in real-world meters with scale=1 */
const SCALE_TO_METERS = 20;

function disposeObj(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        (mesh.material as THREE.Material)?.dispose();
      }
    }
  });
}

function loadModel(path: string) {
  if (!_scene || !_modelGroup) return;

  if (_boatObj) {
    _modelGroup.remove(_boatObj);
    disposeObj(_boatObj);
    _boatObj = null;
  }
  _mixer = null;

  const myId = ++_loadId;
  const loader = new GLTFLoader();
  loader.load(
    path,
    (gltf) => {
      if (myId !== _loadId || !_scene || !_modelGroup) return;

      if (_boatObj) {
        _modelGroup.remove(_boatObj);
        disposeObj(_boatObj);
        _boatObj = null;
      }

      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      _maxDim = Math.max(sz.x, sz.y, sz.z) || 1;

      obj.position.x -= center.x;
      obj.position.z -= center.z;
      obj.position.y -= box.min.y;

      if (gltf.animations.length > 0) {
        _mixer = new THREE.AnimationMixer(obj);
        gltf.animations.forEach((clip) => _mixer!.clipAction(clip).play());
      }

      _boatObj = obj;
      _modelGroup.add(obj);
      _map?.triggerRepaint();
    },
    undefined,
    (err) => console.error("[BoatLayer] Error loading GLB:", path, err),
  );
}

const _layer: CustomLayerInterface = {
  id: BOAT_LAYER_ID,
  type: "custom",
  renderingMode: "3d",

  onAdd(map: MapboxMap, gl: WebGL2RenderingContext) {
    _map = map;

    _renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl as unknown as WebGL2RenderingContext,
      antialias: true,
    });
    _renderer.autoClear = false;
    _renderer.setPixelRatio(window.devicePixelRatio);

    _scene = new THREE.Scene();
    _camera = new THREE.Camera();
    _camera.matrixWorldInverse.identity();

    _ambientLight = new THREE.AmbientLight(0xffffff, _config.ambientInt);
    _scene.add(_ambientLight);
    _dirLight = new THREE.DirectionalLight(0xffffff, _config.dirInt);
    _dirLight.position.set(4, 8, 4);
    _scene.add(_dirLight);
    _scene.add(
      new THREE.HemisphereLight(
        0x93c5fd as unknown as THREE.ColorRepresentation,
        0x1e293b as unknown as THREE.ColorRepresentation,
        0.5,
      ),
    );

    _modelGroup = new THREE.Group();
    _scene.add(_modelGroup);

    const rGeo1 = new THREE.RingGeometry(0.88, 1.08, 64);
    rGeo1.rotateX(-Math.PI / 2);
    _movingRing = new THREE.Mesh(
      rGeo1,
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }),
    );
    _movingRing.position.y = 0.01;
    _modelGroup.add(_movingRing);

    const rGeo2 = new THREE.RingGeometry(1.08, 1.28, 64);
    rGeo2.rotateX(-Math.PI / 2);
    _selectedRing = new THREE.Mesh(
      rGeo2,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    _selectedRing.position.y = 0.01;
    _selectedRing.visible = false;
    _modelGroup.add(_selectedRing);

    loadModel(_config.modelPath);
  },

  onRemove() {
    _loadId++;
    if (_boatObj && _modelGroup) _modelGroup.remove(_boatObj);
    _boatObj = null;
    _mixer = null;
    _renderer?.dispose();
    _renderer = null;
    _scene = null;
    _camera = null;
    _modelGroup = null;
    _ambientLight = null;
    _dirLight = null;
    _movingRing = null;
    _selectedRing = null;
    _maxDim = 1;
    _map = null;
  },

  render(_gl: WebGL2RenderingContext, matrix: number[]) {
    if (!_renderer || !_scene || !_camera || !_modelGroup || _entries.size === 0)
      return;

    const delta = _clock.getDelta();
    if (_mixer) _mixer.update(delta);

    if (_ambientLight) _ambientLight.intensity = _config.ambientInt;
    if (_dirLight) _dirLight.intensity = _config.dirInt;

    const canvas = _renderer.domElement;
    const dpr = _renderer.getPixelRatio();
    _renderer.setSize(canvas.width / dpr, canvas.height / dpr, false);

    const mapMatrix = new THREE.Matrix4().fromArray(matrix);
    const modelWorldScale = (SCALE_TO_METERS / _maxDim) * _config.scale;
    _modelGroup.scale.setScalar(modelWorldScale);

    for (const [, boat] of _entries) {
      const { lng, lat } = boat;
      if (!isFinite(lng) || !isFinite(lat)) continue;

      const mc = MercatorCoordinate.fromLngLat([lng, lat], 0);
      const s = mc.meterInMercatorCoordinateUnits();

      // Boat's transform in Mercator space:
      // 1) RotateX(PI/2) converts GLB Y-up to Mercator Z-up
      // 2) Scale(s,-s,s) converts meters to Mercator units (Y flip for Mercator convention)
      // 3) Translate to boat's Mercator position
      const boatMercatorMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .multiply(new THREE.Matrix4().makeScale(s, -s, s))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

      _modelGroup.rotation.y =
        -((boat.bearingDeg + _config.rotationOffset) * Math.PI) / 180;

      const mat = _movingRing!.material as THREE.MeshBasicMaterial;
      mat.color.set(boat.moving ? 0x38bdf8 : 0x6b7280);
      mat.opacity = boat.moving ? 0.85 : 0.35;
      _movingRing!.visible = true;
      _selectedRing!.visible = boat.isSelected;

      // Full MVP = mapboxVP x boatMercatorMatrix x modelGroup.matrixWorld
      _camera.projectionMatrix = mapMatrix.clone().multiply(boatMercatorMatrix);

      _renderer.resetState();
      _renderer.render(_scene!, _camera);
    }

    if (_mixer) _map?.triggerRepaint();
  },
};

export function createBoatLayer(): CustomLayerInterface {
  return _layer;
}

export function destroyBoatLayer() {
  _entries.clear();
}

export function updateBoat3DConfig(cfg: Partial<Boat3DConfig>) {
  const prevPath = _config.modelPath;
  Object.assign(_config, cfg);
  if (cfg.modelPath && cfg.modelPath !== prevPath && _scene) {
    loadModel(cfg.modelPath);
  }
  _map?.triggerRepaint();
}

export function registerBoat(id: string, lng: number, lat: number) {
  _entries.set(id, { lng, lat, bearingDeg: 0, moving: false, isSelected: false });
  _map?.triggerRepaint();
}

export function updateBoat(id: string, data: Partial<BoatEntry>) {
  const entry = _entries.get(id);
  if (entry) {
    Object.assign(entry, data);
    _map?.triggerRepaint();
  }
}

export function unregisterBoat(id: string) {
  _entries.delete(id);
}
