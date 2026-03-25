import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MercatorCoordinate } from "mapbox-gl";
import type { CustomLayerInterface, Map as MapboxMap } from "mapbox-gl";

// ── Tipos públicos ─────────────────────────────────────────────────────────

export interface BoatEntry {
  lng: number;
  lat: number;
  bearingDeg: number;
  moving: boolean;
  isSelected: boolean;
  /** Ruta GLB asignada a este target según su categoría */
  modelPath: string;
}

export interface Boat3DConfig {
  /** Ruta del modelo por defecto (se usa como fallback) */
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
  modelPath: "/3d/glb/cargo_ship.glb",
  scale: 1,
  rotationOffset: 0,
  camHeight: 3.5,
  camDist: 2.5,
  fov: 40,
  ambientInt: 0.7,
  dirInt: 1.4,
};

export const BOAT_LAYER_ID = "boat-3d-custom-layer";

// ── Estado del módulo ──────────────────────────────────────────────────────

interface CachedModel {
  obj: THREE.Object3D;
  maxDim: number;
  mixer?: THREE.AnimationMixer;
}

let _map: MapboxMap | null = null;
let _renderer: THREE.WebGLRenderer | null = null;
let _scene: THREE.Scene | null = null;
let _camera: THREE.Camera | null = null;
let _modelGroup: THREE.Group | null = null;
/** Modelo actualmente adjunto al _modelGroup (para swap eficiente) */
let _activeModelObj: THREE.Object3D | null = null;
let _ambientLight: THREE.AmbientLight | null = null;
let _dirLight: THREE.DirectionalLight | null = null;
let _movingRing: THREE.Mesh | null = null;
let _selectedRing: THREE.Mesh | null = null;
const _clock = new THREE.Clock();
let _config: Boat3DConfig = { ...DEFAULT_BOAT3D_CONFIG };
const _entries = new Map<string, BoatEntry>();
/** Cache de modelos cargados: path → objeto Three.js listo para usar */
const _modelCache = new Map<string, CachedModel>();
/** Rutas en carga actualmente (para no lanzar peticiones duplicadas) */
const _loadingPaths = new Set<string>();

/** Tamaño base del modelo en metros reales con scale=1 */
const SCALE_TO_METERS = 20;

// ── Carga de modelo ────────────────────────────────────────────────────────

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

/**
 * Si el modelo no está en cache ni cargando, inicia su carga async.
 * Cuando termina queda disponible en _modelCache para el próximo frame.
 */
function ensureModel(path: string) {
  if (!_scene || _modelCache.has(path) || _loadingPaths.has(path)) return;

  _loadingPaths.add(path);
  const loader = new GLTFLoader();
  loader.load(
    path,
    (gltf) => {
      _loadingPaths.delete(path);
      if (!_scene) return;

      const obj = gltf.scene;
      // Centrar en XZ, base en Y=0
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;

      obj.position.x -= center.x;
      obj.position.z -= center.z;
      obj.position.y -= box.min.y;

      let mixer: THREE.AnimationMixer | undefined;
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(obj);
        gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
      }

      _modelCache.set(path, { obj, maxDim, mixer });
      _map?.triggerRepaint();
    },
    undefined,
    (err) => {
      _loadingPaths.delete(path);
      console.error("[BoatLayer] Error loading GLB:", path, err);
    },
  );
}

// ── CustomLayerInterface ───────────────────────────────────────────────────

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

    // Grupo que contiene el modelo activo + anillos indicadores
    _modelGroup = new THREE.Group();
    _scene.add(_modelGroup);

    // Anillo de estado
    const rGeo1 = new THREE.RingGeometry(0.88, 1.08, 64);
    rGeo1.rotateX(-Math.PI / 2);
    _movingRing = new THREE.Mesh(
      rGeo1,
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }),
    );
    _movingRing.position.y = 0.01;
    _modelGroup.add(_movingRing);

    // Anillo de selección
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

    // Pre-cargar los modelos que ya están registrados
    for (const [, entry] of _entries) {
      ensureModel(entry.modelPath);
    }
  },

  onRemove() {
    // Limpiar todos los modelos en caché
    for (const [, cached] of _modelCache) {
      disposeObj(cached.obj);
    }
    _modelCache.clear();
    _loadingPaths.clear();
    _activeModelObj = null;
    _renderer?.dispose();
    _renderer = null;
    _scene = null;
    _camera = null;
    _modelGroup = null;
    _ambientLight = null;
    _dirLight = null;
    _movingRing = null;
    _selectedRing = null;
    _map = null;
  },

  render(_gl: WebGL2RenderingContext, matrix: number[]) {
    if (!_renderer || !_scene || !_camera || !_modelGroup || _entries.size === 0)
      return;

    const delta = _clock.getDelta();

    // Actualizar animaciones de todos los modelos cargados
    for (const [, cached] of _modelCache) {
      cached.mixer?.update(delta);
    }

    if (_ambientLight) _ambientLight.intensity = _config.ambientInt;
    if (_dirLight) _dirLight.intensity = _config.dirInt;

    const canvas = _renderer.domElement;
    const dpr = _renderer.getPixelRatio();
    _renderer.setSize(canvas.width / dpr, canvas.height / dpr, false);

    const mapMatrix = new THREE.Matrix4().fromArray(matrix);

    for (const [, boat] of _entries) {
      const { lng, lat, modelPath } = boat;
      if (!isFinite(lng) || !isFinite(lat)) continue;

      // Obtener modelo del cache (o disparar carga si falta)
      const cached = _modelCache.get(modelPath);
      if (!cached) {
        ensureModel(modelPath);
        continue; // se renderiza en el próximo frame cuando esté listo
      }

      // Intercambiar modelo en el grupo si es diferente al anterior
      if (_activeModelObj !== cached.obj) {
        if (_activeModelObj) _modelGroup.remove(_activeModelObj);
        _modelGroup.add(cached.obj);
        _activeModelObj = cached.obj;
      }

      // Escala: SCALE_TO_METERS metros reales, ajustada por _config.scale
      const modelWorldScale = (SCALE_TO_METERS / cached.maxDim) * _config.scale;
      _modelGroup.scale.setScalar(modelWorldScale);

      // Posición Mercator del target
      const mc = MercatorCoordinate.fromLngLat([lng, lat], 0);
      const s = mc.meterInMercatorCoordinateUnits();

      // Matriz del target en espacio Mercator:
      //   1. RotateX(PI/2): GLB Y-up → Mercator Z-up
      //   2. Scale(s,-s,s): metros → unidades Mercator (el -s invierte Y de Mercator)
      //   3. Translate: posición exacta en el mapa
      const targetMercatorMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .multiply(new THREE.Matrix4().makeScale(s, -s, s))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

      // Rumbo del target (solo su propio heading)
      _modelGroup.rotation.y =
        -((boat.bearingDeg + _config.rotationOffset) * Math.PI) / 180;

      // Estado de los anillos
      const mat = _movingRing!.material as THREE.MeshBasicMaterial;
      mat.color.set(boat.moving ? 0x38bdf8 : 0x6b7280);
      mat.opacity = boat.moving ? 0.85 : 0.35;
      _movingRing!.visible = true;
      _selectedRing!.visible = boat.isSelected;

      // projectionMatrix = mapboxVP × targetMercatorMatrix
      _camera.projectionMatrix = mapMatrix.clone().multiply(targetMercatorMatrix);

      _renderer.resetState();
      _renderer.render(_scene!, _camera);
    }

    if ([...
_modelCache.values()].some((c) => c.mixer)) _map?.triggerRepaint();
  },
};

// ── API pública ────────────────────────────────────────────────────────────

export function createBoatLayer(): CustomLayerInterface {
  return _layer;
}

export function destroyBoatLayer() {
  _entries.clear();
}

export function updateBoat3DConfig(cfg: Partial<Boat3DConfig>) {
  Object.assign(_config, cfg);
  _map?.triggerRepaint();
}

export function registerBoat(id: string, lng: number, lat: number, modelPath: string) {
  _entries.set(id, { lng, lat, bearingDeg: 0, moving: false, isSelected: false, modelPath });
  if (_scene) ensureModel(modelPath);
  _map?.triggerRepaint();
}

export function updateBoat(id: string, data: Partial<BoatEntry>) {
  const entry = _entries.get(id);
  if (entry) {
    const prevPath = entry.modelPath;
    Object.assign(entry, data);
    // Pre-cargar el modelo nuevo si cambió la categoría
    if (data.modelPath && data.modelPath !== prevPath && _scene) {
      ensureModel(data.modelPath);
    }
    _map?.triggerRepaint();
  }
}

export function unregisterBoat(id: string) {
  _entries.delete(id);
}
