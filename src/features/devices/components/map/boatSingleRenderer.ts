/**
 * Singleton Three.js renderer para todos los marcadores 3D.
 *
 * Usa UN SOLO WebGLRenderer + scissors para pintar cada marcador en su
 * posición de pantalla exacta dentro del canvas overlay fijo.
 * Así se evita el límite de contextos WebGL del navegador (~8–16).
 *
 * Soporta modelos GLB/GLTF. El modelPath es configurable en tiempo real.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface BoatEntry {
  el: HTMLElement;
  bearingDeg: number;
  moving: boolean;
  isSelected: boolean;
}

export interface Boat3DConfig {
  /** Ruta del modelo GLB/GLTF a cargar */
  modelPath: string;
  /** Escala del modelo (1 = normal) */
  scale: number;
  /** Offset de rotación Y en grados — para ajustar la proa */
  rotationOffset: number;
  /** Posición Y de la cámara */
  camHeight: number;
  /** Posición Z de la cámara */
  camDist: number;
  /** Campo de visión de la cámara (grados) */
  fov: number;
  /** Intensidad de la luz ambiental */
  ambientInt: number;
  /** Intensidad de la luz direccional */
  dirInt: number;
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

// ── estado del módulo ──────────────────────────────────────────────────────

let _renderer: THREE.WebGLRenderer | null = null;
let _scene: THREE.Scene | null = null;
let _camera: THREE.PerspectiveCamera | null = null;
let _boatObj: THREE.Object3D | null = null;
let _mixer: THREE.AnimationMixer | null = null;
let _ambientLight: THREE.AmbientLight | null = null;
let _dirLight: THREE.DirectionalLight | null = null;
let _movingRing: THREE.Mesh | null = null;
let _selectedRing: THREE.Mesh | null = null;
let _maxDim = 1;
let _rafId: number | null = null;
let _clock = new THREE.Clock();
let _config: Boat3DConfig = { ...DEFAULT_BOAT3D_CONFIG };
const _entries = new Map<string, BoatEntry>();

// ── carga de modelo ────────────────────────────────────────────────────────

function loadModel(path: string) {
  if (!_scene) return;

  // Limpiar modelo anterior
  if (_boatObj) {
    _scene.remove(_boatObj);
    _boatObj.traverse((child) => {
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
    _boatObj = null;
  }
  _mixer = null;

  const loader = new GLTFLoader();
  loader.load(
    path,
    (gltf) => {
      const obj = gltf.scene;

      // Normalizar: centrar y escalar a una unidad lógica
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      _maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
      obj.position.sub(center);

      // Animaciones (si el GLB las incluye)
      if (gltf.animations.length > 0) {
        _mixer = new THREE.AnimationMixer(obj);
        gltf.animations.forEach((clip) => _mixer!.clipAction(clip).play());
      }

      _boatObj = obj;
      _scene!.add(obj);
    },
    undefined,
    (err) => {
      console.error("[3DRenderer] Error cargando GLB:", path, err);
    },
  );
}

// ── utilidades ─────────────────────────────────────────────────────────────

function syncSize() {
  if (!_renderer) return;
  const el = _renderer.domElement;
  const dpr = _renderer.getPixelRatio();
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w < 1 || h < 1) return;
  if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
    _renderer.setSize(w, h, false);
  }
}

// ── bucle de render ────────────────────────────────────────────────────────

function renderFrame() {
  if (!_renderer || !_scene || !_camera) return;

  const delta = _clock.getDelta();

  syncSize();

  // Aplicar config de cámara y luces en tiempo real
  _camera.position.set(0, _config.camHeight, _config.camDist);
  _camera.lookAt(0, 0, 0);
  if (_camera.fov !== _config.fov) {
    _camera.fov = _config.fov;
    _camera.updateProjectionMatrix();
  }
  if (_ambientLight) _ambientLight.intensity = _config.ambientInt;
  if (_dirLight) _dirLight.intensity = _config.dirInt;
  if (_mixer) _mixer.update(delta);

  const canvas = _renderer.domElement;

  _renderer.setScissorTest(false);
  _renderer.clear(true, true, true);

  if (_entries.size === 0 || !_boatObj) return;

  // Aplicar escala del modelo
  _boatObj.scale.setScalar((2.0 / _maxDim) * _config.scale);

  _renderer.setScissorTest(true);
  const cr = canvas.getBoundingClientRect();
  const totalW = canvas.clientWidth;
  const totalH = canvas.clientHeight;

  for (const [, data] of _entries) {
    const rect = data.el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;

    const x = Math.round(rect.left - cr.left);
    const y = Math.round(cr.bottom - rect.bottom);
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (x + w <= 0 || y + h <= 0 || x >= totalW || y >= totalH) continue;

    _renderer.setViewport(x, y, w, h);
    _renderer.setScissor(x, y, w, h);

    _camera.aspect = (w / h) || 1;
    _camera.updateProjectionMatrix();

    _boatObj.rotation.y = -((data.bearingDeg + _config.rotationOffset) * Math.PI) / 180;

    const mat = _movingRing!.material as THREE.MeshBasicMaterial;
    mat.color.set(data.moving ? 0x38bdf8 : 0x6b7280);
    mat.opacity = data.moving ? 0.85 : 0.35;
    _movingRing!.visible = true;

    _selectedRing!.visible = data.isSelected;

    _renderer.render(_scene, _camera);
  }

  _renderer.setScissorTest(false);
}

function tick() {
  _rafId = requestAnimationFrame(tick);
  renderFrame();
}

// ── API pública ────────────────────────────────────────────────────────────

export function initBoatRenderer(canvas: HTMLCanvasElement) {
  if (_renderer) return;

  _renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.autoClear = false;
  _renderer.setClearColor(0x000000, 0);

  _scene = new THREE.Scene();

  _camera = new THREE.PerspectiveCamera(_config.fov, 1, 0.1, 500);
  _camera.position.set(0, _config.camHeight, _config.camDist);
  _camera.lookAt(0, 0, 0);

  // Iluminación
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

  // Anillo de estado (azul/gris)
  const rGeo1 = new THREE.RingGeometry(0.88, 1.08, 64);
  rGeo1.rotateX(-Math.PI / 2);
  _movingRing = new THREE.Mesh(
    rGeo1,
    new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }),
  );
  _movingRing.position.y = -0.88;
  _scene.add(_movingRing);

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
  _selectedRing.position.y = -0.85;
  _selectedRing.visible = false;
  _scene.add(_selectedRing);

  loadModel(_config.modelPath);

  tick();
}

export function destroyBoatRenderer() {
  if (_rafId !== null) cancelAnimationFrame(_rafId);
  _renderer?.dispose();
  _renderer = null;
  _scene = null;
  _camera = null;
  _boatObj = null;
  _mixer = null;
  _ambientLight = null;
  _dirLight = null;
  _movingRing = null;
  _selectedRing = null;
  _maxDim = 1;
  _rafId = null;
  _entries.clear();
}

export function updateBoat3DConfig(cfg: Partial<Boat3DConfig>) {
  const prevPath = _config.modelPath;
  Object.assign(_config, cfg);
  // Si cambió el modelo, recargarlo
  if (cfg.modelPath && cfg.modelPath !== prevPath && _scene) {
    loadModel(cfg.modelPath);
  }
}

export function registerBoat(id: string, el: HTMLElement) {
  _entries.set(id, { el, bearingDeg: 0, moving: false, isSelected: false });
}

export function updateBoat(id: string, data: Partial<Omit<BoatEntry, "el">>) {
  const entry = _entries.get(id);
  if (entry) Object.assign(entry, data);
}

export function unregisterBoat(id: string) {
  _entries.delete(id);
}
