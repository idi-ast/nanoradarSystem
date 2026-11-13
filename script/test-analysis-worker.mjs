import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';

const bundled = await build({ entryPoints: ['src/features/history/reportAnalytics.ts'], alias: { '@': `${process.cwd()}/src` }, bundle: true, platform: 'node', format: 'cjs', write: false });
const core = { exports: {} };
new Function('module', 'exports', bundled.outputFiles[0].text)(core, core.exports);
const input = { tracks: [], points: [], zones: [], from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-02T00:00:00Z'), settings: core.exports.DEFAULT_REPORT_SETTINGS };
const track = { track_id: 'T42', tipo_radar: 'magos', first_seen: '2026-11-01T00:00:00Z', last_seen: '2026-11-01T00:20:00Z', point_count: 21, nivel_max: 2, zones: ['modulo'], behavior_class: 'lancha' };
input.tracks = [track];
input.points = Array.from({ length: 21 }, (_, i) => ({ trackKey: JSON.stringify([track.tipo_radar, track.track_id, track.first_seen, track.last_seen]), lat: -41 + i * .00001, lon: -73, fecha: new Date(input.from.getTime() + i * 60000).toISOString(), zona: 'modulo' }));
input.zones = [{ nombre: 'modulo', vertices: [[-41.001, -73.001], [-41.001, -72.999], [-40.999, -72.999], [-40.999, -73.001]] }];
const compile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let posted;
const workerSelf = { postMessage: value => { posted = value; } };
runInNewContext(compile(readFileSync('src/features/analysis/operationalAnalysis.worker.ts', 'utf8')), { exports: {}, require: () => core.exports, self: workerSelf });
workerSelf.onmessage({ data: input });
assert.equal(JSON.stringify(posted.analysis), JSON.stringify(core.exports.computeOperationalAnalysis(input)));

// Run the real hook with a small React lifecycle host. Changing filters and
// unmounting must terminate workers and ignore stale messages.
let states = [], stateIndex = 0, dependencies, cleanup, effect, renders = 0;
const workers = [];
class FakeWorker {
 constructor() { workers.push(this); }
 postMessage(value) { this.input = value; }
 terminate() { this.terminated = true; }
}
const react = {
 useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; renders++; }]; },
 useMemo: fn => fn(),
 useEffect(fn, deps) { if (!dependencies || deps.some((value, i) => value !== dependencies[i])) { cleanup?.(); effect = fn; dependencies = deps; } },
};
const hookModule = { exports: {} };
runInNewContext(compile(readFileSync('src/features/analysis/hooks/useOperationalAnalysis.ts', 'utf8').replace('import.meta.url', '"file:///analysis/hooks/useOperationalAnalysis.ts"')), {
 exports: hookModule.exports, require: name => name === 'react' ? react : core.exports, Worker: FakeWorker, URL, queueMicrotask,
});
const render = value => { stateIndex = 0; const output = hookModule.exports.useOperationalAnalysis(value); if (effect) { const next = effect; effect = null; cleanup = next(); } return output; };
assert.equal(render(input).isComputing, true);
assert.equal(workers[0].input, input);
const next = { ...input, to: new Date('2026-11-03T00:00:00Z') };
render(next);
assert.equal(workers[0].terminated, true);
workers[0].onmessage({ data: { analysis: { stale: true } } });
assert.equal(renders, 0);
workers[1].onmessage({ data: { analysis: posted.analysis } });
assert.equal(render(next).analysis, posted.analysis);
cleanup();
assert.equal(workers[1].terminated, true);
// Browsers that cannot start a Worker still produce the same indicators.
states = []; dependencies = undefined; cleanup = undefined;
render(input);
workers.at(-1).onerror();
assert.equal(JSON.stringify(render(input).analysis), JSON.stringify(posted.analysis));
console.log('PASS: worker calculation matches report, stale jobs terminate, late replies ignored, fallback preserved');
