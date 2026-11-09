// node script/test-history-filters.mjs — no backend required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const exports = {};
const source = ts.transpileModule(readFileSync('src/features/history/filters.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(source, { exports, Intl, Date });
const { resolveHistoryFilters, buildReportFilters, defaultReportPeriod } = exports;
const original = { from: '2026-11-09T15:00', to: '2026-11-09T16:00', tipoRadar: 'nano',
  minPoints: 10, minTrackedMinutes: 100, zone: 'modulo', behaviorClass: 'bolla', search: ' T23 ' };
const lookup = resolveHistoryFilters(original);
assert.equal(JSON.stringify(lookup), JSON.stringify({ minPoints: 1, trackIds: ['T23'] }));
assert.equal(original.minPoints, 10);
assert.equal(resolveHistoryFilters({ ...original, search: '' }).from, original.from);
const report = buildReportFilters({ fromDate: '2026-11-08', toDate: '2026-11-09' }, 4, 'lancha');
assert.equal(report.from, '2026-11-08T03:00:00.000Z');
assert.equal(report.to, '2026-11-10T02:59:59.999Z');
assert.equal(report.behaviorClass, 'lancha');
assert.equal(report.minTrackedMinutes, 4);
assert.equal(report.minPoints, 1);
assert.equal(report.search, undefined);
assert.equal(report.zone, undefined);
assert.equal(report.tipoRadar, undefined);
assert.equal(report.trackIds, undefined);
// Both portions of the overnight window remain inside the independent period.
for (const time of ['2026-11-09T00:30:00Z', '2026-11-09T09:30:00Z']) {
  assert.ok(Date.parse(time) >= Date.parse(report.from) && Date.parse(time) <= Date.parse(report.to));
}
assert.equal(buildReportFilters({ fromDate: '2026-06-01', toDate: '2026-06-01' }, 0, '').from, '2026-06-01T04:00:00.000Z');
// Spring forward: Chile's missing midnight is handled as the start of the day.
const spring = buildReportFilters({ fromDate: '2026-09-06', toDate: '2026-09-06' }, 0, '');
assert.equal(spring.from, '2026-09-06T04:00:00.000Z');
assert.equal(Date.parse(spring.to) - Date.parse(spring.from) + 1, 23 * 3600000);
const fall = buildReportFilters({ fromDate: '2026-04-04', toDate: '2026-04-04' }, 0, '');
assert.equal(Date.parse(fall.to) - Date.parse(fall.from) + 1, 25 * 3600000);
for (const period of [{ fromDate: '', toDate: '' }, { fromDate: '2026-02-30', toDate: '2026-03-01' }, { fromDate: '2026-11-09', toDate: '2026-11-08' }]) {
  assert.throws(() => buildReportFilters(period, 0, ''));
}
assert.equal(defaultReportPeriod(new Date('2026-11-09T01:00:00Z')).fromDate, '2026-11-07');
console.log('PASS: exact global ID lookup, independent report filters, full Chilean days, overnight coverage, DST and invalid periods');
