const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const m = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/traffic-date.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m.exports);
const { koreanDay, previousDay, dayWindow, publicTrafficPath } = m.exports;
test('Korean midnight splits reporting days correctly', () => {
  assert.equal(koreanDay(new Date('2026-09-28T14:59:59Z')), '2026-09-28');
  assert.equal(koreanDay(new Date('2026-09-28T15:00:00Z')), '2026-09-29');
  assert.equal(previousDay(new Date('2026-09-29T00:00:00Z')), '2026-09-28');
  assert.equal(dayWindow('2026-09-28').start.toISOString(), '2026-09-27T15:00:00.000Z');
  assert.equal(dayWindow('2026-09-28').end.toISOString(), '2026-09-28T15:00:00.000Z');
});
test('invalid calendar dates are rejected', () => {
  for (const day of ['2026-02-30', 'today', '2026-13-01']) assert.throws(() => dayWindow(day));
});
test('only public page names are accepted, no customer identifiers or queries', () => {
  for (const path of ['/', '/customer', '/analyze/live', '/analyze/movement', '/inbody']) assert.equal(publicTrafficPath(path), true);
  for (const path of ['/admin', '/customer/secret', '/?email=x', '/api/customer/records', null, {}]) assert.equal(publicTrafficPath(path), false);
});
