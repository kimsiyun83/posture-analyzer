/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const out = mkdtempSync(join(tmpdir(), 'posture-report-'));
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'lib/pose/report-details.ts', '--module', 'commonjs', '--target', 'es2020', '--esModuleInterop', '--skipLibCheck', '--outDir', out]);
const { DEMO_FRONT, DEMO_SIDE, parseReportMetrics, summarizeReport, readingInterpretation } = require(join(out, 'report-details.js'));
process.on('exit',()=>rmSync(out,{recursive:true,force:true}));

test('report summary uses measurements, preserves signed bilateral differences and counts all nine metrics',()=>{
 const summary=summarizeReport(DEMO_FRONT,DEMO_SIDE);
 assert.equal(summary.score,52);
 assert.deepEqual(summary.counts,{normal:5,mild:4,notable:0});
 assert.ok(Math.abs(summary.kneeDifference-3.4)<1e-9);
 const opposite={...DEMO_FRONT,kneeAlignmentRight:{...DEMO_FRONT.kneeAlignmentRight,value:-.018}};
 assert.ok(Math.abs(summarizeReport(opposite,DEMO_SIDE).kneeDifference-7)<1e-9);
});
test('incomplete, malformed and non-finite saved results cannot render a fabricated report',()=>{
 assert.ok(parseReportMetrics({front:DEMO_FRONT,side:DEMO_SIDE}));
 for(const v of [null,{}, {front:DEMO_FRONT}, {front:{...DEMO_FRONT,overallScore:NaN},side:DEMO_SIDE}, {front:DEMO_FRONT,side:{...DEMO_SIDE,hipPlumbOffset:{...DEMO_SIDE.hipPlumbOffset,value:Infinity}}}]) assert.equal(parseReportMetrics(v),null);
});
test('all-normal results have no priorities; notable results precede mild ones',()=>{
 const normal=structuredClone({front:DEMO_FRONT,side:DEMO_SIDE});
 for(const group of [normal.front,normal.side]) for(const r of Object.values(group)) if(r && typeof r==='object' && r.key) r.severity='normal';
 assert.equal(summarizeReport(normal.front,normal.side).priorities.length,0);
 const f={...DEMO_FRONT,hipTilt:{...DEMO_FRONT.hipTilt,severity:'notable'}};
 assert.equal(summarizeReport(f,DEMO_SIDE).priorities[0].key,'hipTilt');
});
test('interpretations distinguish anterior/posterior and inward/outward signs',()=>{
 assert.match(readingInterpretation({...DEMO_SIDE.shoulderPlumbOffset,value:-.08}),/뒤쪽/);
 assert.match(readingInterpretation({...DEMO_FRONT.kneeAlignmentLeft,value:-.05}),/바깥쪽/);
});
