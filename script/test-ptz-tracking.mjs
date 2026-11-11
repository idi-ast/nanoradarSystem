// node script/test-ptz-tracking.mjs — real merge/render logic, simulated camera state.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, { exports, require: name => name in mocks ? mocks[name] : require(name), console, ...globals });
  return exports;
}
const utils = load('src/features/devices/utils/ptzTracking.ts');
const now = 1800000000000;
const target = { track_id: 'T23', lat: -41, lon: -73, zone: 'Zona', level: 4, category: 'lancha', observed_at: 999, age_seconds: 1, signal_state: 'recent' };
const session = { radar_ip: 'radar', ptz_id: 8, tracking_state: 'following', signal_grace_seconds: 3, home_wait_seconds: 6, target };
const snapshot = { sessions: [session], server_time: 1000, receivedAt: now };
let result = utils.mergePtzTargets([], snapshot, now);
assert.equal(result[0].id, 'magosradar_T23');
assert.equal(result[0].lastUpdate, now - 1000, 'Server/browser clock skew must not create a fresh observation');
assert.equal(result[0].ptzTracking[0].ptzId, 8);
assert.equal(utils.isPtzPositionRetained(result[0], now), false);
const live = { ...result[0], ptzTracking: undefined, history: [[-41, -73, now-1000], [-41.01, -73, now]] };
assert.equal(utils.mergePtzTargets([live], snapshot, now).length, 1, 'A selected live target cannot duplicate');
assert.equal(utils.mergePtzTargets([live], snapshot, now)[0].history.length, 2);
// A status poll can still reference the retired ID until the PTZ switches.
const canonical = { ...live, id: 'magosradar_T1', mergedTrackIds: ['T23'] };
const fused = utils.mergePtzTargets([canonical], snapshot, now);
assert.equal(fused.length, 1, 'Old PTZ status must not resurrect an absorbed radar track');
assert.equal(fused[0].id, 'magosradar_T1');
assert.equal(fused[0].ptzTracking[0].ptzId, 8);
assert.equal(fused[0].history.length, 2);
const waiting = { ...session, tracking_state: 'waiting', target: { ...target, observed_at: 994, age_seconds: 6, signal_state: 'retained' } };
const oldSnapshot = { ...snapshot, sessions: [waiting] };
result = utils.mergePtzTargets([], oldSnapshot, now);
assert.equal(result[0].lastUpdate, now - 6000);
assert.equal(utils.isPtzPositionRetained(result[0], now), true);
const repoll = { ...oldSnapshot, receivedAt: now+1000, server_time: 1001 };
assert.equal(utils.mergePtzTargets([], repoll, now+1000)[0].lastUpdate, now-6000, 'Repeated status polls must not refresh the detection');
assert.equal(utils.mergePtzTargets([], oldSnapshot, now+4001).length, 0, 'Stale status must release retained markers');
assert.equal(utils.mergePtzTargets([], { ...snapshot, sessions: [{ ...session, tracking_state:'returning_home', target: null }] }, now).length, 0);
assert.equal(utils.mergePtzTargets([], { ...snapshot, sessions: [{ ...session, target: { ...target, lat: null } }] }, now).length, 0);
assert.equal(utils.mergePtzTargets([], { ...snapshot, sessions: [{ ...session, tracking_state:'paused' }] }, now).length, 0);
const secondCamera = { ...session, ptz_id: 9 };
result = utils.mergePtzTargets([], { ...snapshot, sessions: [session, secondCamera] }, now);
assert.equal(result.length, 1);
assert.equal(result[0].ptzTracking.length, 2);
assert.equal(utils.ptzStateLabel(waiting), 'Esperando nueva detección');
assert.equal(utils.ptzStateLabel({ ...session, tracking_state:'home' }), 'En posición de inicio');
let sessions = [waiting], unavailable = false;
const { PtzTrackingOverlay } = load('src/features/devices/components/map/PtzTrackingOverlay.tsx', {
  '../../context/useRadarContext': { useRadarTargets: () => ({ trackingSessions: sessions, trackingUnavailable: unavailable }) },
  '../../stores/behaviorVisibilityStore': { useBehaviorVisibilityStore: fn => fn({ visibility: { lancha: false } }) },
  '../../config/behaviorCategories': { isBehaviorVisible: category => category !== 'lancha' },
  '../../utils/ptzTracking': utils,
});
let html = renderToStaticMarkup(createElement(PtzTrackingOverlay, { onSelectTarget() {} }));
assert.ok(html.includes('Cámara #8'));
assert.ok(html.includes('Última posición conocida'));
assert.ok(html.includes('sin señal hace 6 s'));
assert.ok(html.includes('Categoría oculta'));
assert.ok(!html.includes('Siguiendo'));
sessions = [{ ...session, tracking_state: 'returning_home', target: null }];
html = renderToStaticMarkup(createElement(PtzTrackingOverlay, { onSelectTarget() {} }));
assert.ok(html.includes('Regresando al inicio'));
assert.ok(!html.includes('En posición de inicio'));
unavailable = true;
html = renderToStaticMarkup(createElement(PtzTrackingOverlay, { onSelectTarget() {} }));
assert.ok(html.includes('Estado PTZ sin actualizar'));
assert.ok(!html.includes('Regresando al inicio'));
console.log('PASS: PTZ target retention, timestamps, clock skew, duplicate cameras, stale status, release and camera state rendering');

// Render the real map layer with hidden categories, another device filter and a
// historical range that excludes the selected PTZ target. Exclusion remains mandatory.
let mapTargets = utils.mergePtzTargets([], oldSnapshot, now);
const mapState = {
  instanceConfig: { id:'test', timing:{ TRACKING_ACTIVE_MS:10000, COLOR_REFRESH_MS:200, TRAIL_FADE_POINTS:120 }, targetColors:{ moving:'#00ffff' } },
  zones: [],
};
const icon = () => createElement('span', null, 'objeto');
const visual = { use3DBoat:false, categoryModels:{}, trackStrokeWidth:2, trackDurationSec:120,
  iconStyle2D:{ size:24, movingSize:24, borderRadius:50, movingBorderRadius:50, borderWidth:2, movingBorderWidth:2,
    borderColor:'#ffffff', movingBorderColor:'#00ffff', bgColor:'#000000', bgOpacity:.5, movingBgOpacity:.5, showIcon:true, movingShowIcon:true, iconSize:15, movingIconSize:15 } };
const { RadarTargetsLayer } = load('src/features/devices/components/map/RadarTargetsLayer.tsx', {
  '../../context/useRadarContext': { useRadarContext: () => mapState, useRadarTargets: () => ({ targets:mapTargets }) },
  '../../stores/behaviorVisibilityStore': { useBehaviorVisibilityStore: fn => fn({ visibility:{lancha:false} }) },
  '../../config/behaviorCategories': { isBehaviorVisible: () => false, targetBehaviorKey: () => 'lancha', behaviorModelCategory: () => null },
  '../../stores/targetVisualStore': { useTargetVisualStore: fn => fn(visual), DEFAULT_CATEGORY_MODELS:{} },
  '../../config': { resolveBehaviorCategory: () => ({ icon, color:'#ffffff', label:'Embarcación' }) },
  '../../config/categories': { IconTargetNeutral:icon },
  './utils/geoHelpers': { isPointInPolygon: () => true },
  '../../utils/ptzTracking': utils,
  './Boat3DMarker': { Boat3DMarker:icon }, './BoatsSharedCanvas': { BoatsSharedCanvas: () => null },
  './devicesConfig': { DEVICES_BELOW_LAYER_ID:'devices' },
  'react-map-gl': { Source: ({children}) => children, Layer: () => null, Popup: () => null,
    Marker: ({children}) => createElement('div', { 'data-marker':true },children) },
});
const layerProps = { deviceFilter:'nanoRadar', historyRange:{start:0,end:0}, selectedTargetId:null, onSelectTarget() {} };
html = renderToStaticMarkup(createElement(RadarTargetsLayer, layerProps));
assert.ok(html.includes('data-marker'));
assert.ok(html.includes('PTZ #8'));
assert.ok(html.includes('Última posición conocida'));
assert.ok(html.includes('border-dashed'));
assert.ok(html.includes('Categoría oculta'));
assert.ok(html.includes('Visible por seguimiento PTZ'));
mapState.zones = [{ idTipoAlerta:6, poligono:{vertices:[]} }];
html = renderToStaticMarkup(createElement(RadarTargetsLayer, layerProps));
assert.ok(!html.includes('data-marker'), 'Exclusion must hide even a selected PTZ target');
mapState.zones = [{ idTipoAlerta:1, poligono:{vertices:[]} }];
html = renderToStaticMarkup(createElement(RadarTargetsLayer, layerProps));
assert.ok(!html.includes('data-marker'), 'No-detection zones must also hide selected PTZ targets');
mapState.zones = [];
mapTargets = [live];
html = renderToStaticMarkup(createElement(RadarTargetsLayer, layerProps));
assert.ok(!html.includes('data-marker'), 'Ordinary hidden targets keep their presentation filters');
console.log('PASS: selected PTZ marker bypasses category, device and timeline presentation filters; exclusion always wins');

let currentUserId = 1, queryOptions, queryResult = { data: snapshot, isError: false }, hookNow = now;
let requestedSignal;
const { usePtzTracking } = load('src/features/devices/hooks/usePtzTracking.ts', {
  react: { useEffect() {}, useState: () => [hookNow, () => {}] },
  '@tanstack/react-query': { useQuery: options => { queryOptions = options; return queryResult; } },
  '@/libs/zustand/stores/userStore': { useUserStore: fn => fn({ user: currentUserId == null ? null : { id: currentUserId } }) },
  '@/apis/apiSystem': { apiSystem: { get: async (url, params, options) => { requestedSignal = options.signal; return { data: snapshot }; } } },
  '../utils/ptzTracking': utils,
}, { AbortController, setTimeout, clearTimeout });
assert.equal(usePtzTracking().snapshot, snapshot);
assert.equal(queryOptions.refetchInterval, 1000);
assert.equal(queryOptions.queryKey[1], 1);
currentUserId = 2;
usePtzTracking();
assert.equal(queryOptions.queryKey[1], 2, 'PTZ status cache must be partitioned by authenticated account');
currentUserId = null;
usePtzTracking();
assert.equal(queryOptions.enabled, false);
queryResult = { data:snapshot, isError:true };
assert.equal(usePtzTracking().snapshot, undefined);
queryResult = { data:snapshot, isError:false };
hookNow = now+5000;
assert.equal(usePtzTracking().unavailable, true);
const request = new AbortController();
request.abort();
await queryOptions.queryFn({ signal:request.signal });
assert.equal(requestedSignal.aborted, true, 'Query cancellation must reach the HTTP request');
const { PtzTargetStatus } = load('src/features/devices/components/panel/PtzTargetStatus.tsx', {
  '../../context/useRadarContext': { useRadarTargets: () => ({ targets:utils.mergePtzTargets([], oldSnapshot, now), trackingNow:now }) },
  '../../stores/behaviorVisibilityStore': { useBehaviorVisibilityStore: fn => fn({ visibility:{} }) },
  '../../config/behaviorCategories': { isBehaviorVisible: () => false, targetBehaviorKey: () => 'lancha' },
  '../../utils/ptzTracking': utils,
});
html = renderToStaticMarkup(createElement(PtzTargetStatus, { targetId:'magosradar_T23' }));
assert.ok(html.includes('Última posición conocida'));
assert.ok(html.includes('Sin señal hace 6 s'));
console.log('PASS: polling expiry, account cache scope, error state, request cancellation and target card status');
