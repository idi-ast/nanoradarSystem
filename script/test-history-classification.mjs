// node script/test-history-classification.mjs — no backend/network required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
function load(path, mocks) {
  const require = createRequire(new URL(`../${path}`, import.meta.url));
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(source, { exports, require: name => name in mocks ? mocks[name] : require(name) });
  return exports;
}
const calls = [];
const api = load('src/features/history/api.ts', {
  '@/apis/apiSystem': { apiSystem: { get: async (path, params) => {
    calls.push({ path, params });
    return { data: { data: [{ track_id: `T${params.page}` }], total: 2, pages: 2 } };
  } } },
});
const filters = { minPoints: 5, tipoRadar: 'magos', behaviorClass: 'bolla', minTrackedMinutes: 4 };
await api.fetchTrackSummaries(filters, 2);
assert.equal(calls[0].params.behavior_class, 'bolla');
assert.equal(calls[0].params.page, 2);
assert.equal(calls[0].params.min_tracked_minutes, 4);
assert.equal(calls[0].params.min_points, 5);
calls.length = 0;
await api.fetchReportTrackSummaries(filters);
assert.equal(calls.length, 2);
assert.ok(calls.every(call => call.params.behavior_class === 'bolla'));
await api.fetchTrackSummaries({ ...filters, behaviorClass: undefined });
assert.equal(calls.at(-1).params.behavior_class, undefined);
const hooks = load('src/features/history/hooks/useTrackSummaries.ts', {
  '@tanstack/react-query': { useQuery: options => options }, '../api': api,
  '../types': { TRACKS_PAGE_SIZE: 100 }, './useTrackPlayback': { trackKey: () => '' },
});
const boat = hooks.useTrackSummaries({ ...filters, behaviorClass: 'lancha' });
const buoy = hooks.useTrackSummaries(filters);
assert.notDeepEqual(boat.queryKey, buoy.queryKey);
assert.notDeepEqual(buoy.queryKey, hooks.useTrackSummaries({ ...filters, minTrackedMinutes: 0 }).queryKey);
await buoy.queryFn();
assert.equal(calls.at(-1).params.behavior_class, 'bolla');
const filterHelpers = load('src/features/history/filters.ts', {});
await api.fetchTrackSummaries(filterHelpers.resolveHistoryFilters({ ...filters, search: ' T23 ', from: '2026-11-09T15:00', zone: 'modulo' }));
const lookup = calls.at(-1).params;
assert.equal(lookup.track_ids, 'T23');
assert.equal(lookup.min_points, 1);
for (const field of ['from', 'to', 'tipo_radar', 'search', 'behavior_class', 'min_tracked_minutes', 'zone']) assert.equal(lookup[field], undefined);
assert.equal(lookup.only_with_zones, false);
assert.notDeepEqual(hooks.useTrackSummaries({ minPoints: 1, trackIds: ['T23'] }).queryKey,
  hooks.useTrackSummaries({ minPoints: 1, trackIds: ['T24'] }).queryKey);
console.log('PASS: history category request, clearing filter, report pagination and independent query cache');
