/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const out = mkdtempSync(join(tmpdir(), "assessment-"));
execFileSync(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "lib/assessment.ts",
  "lib/pose/report-details.ts",
  "--module",
  "commonjs",
  "--target",
  "es2020",
  "--skipLibCheck",
  "--outDir",
  out,
]);
const { checkedPixels, recommend } = require(join(out, "assessment.js"));
const { computeSideMetrics } = require(join(out, "pose/metrics.js"));
const { DEMO_FRONT, DEMO_SIDE } = require(join(out, "pose/report-details.js"));
process.on("exit", () => rmSync(out, { recursive: true, force: true }));
test("recommendations combine observed alignment and goals, and discomfort overrides the course headline", () => {
  const r = {
    front: DEMO_FRONT,
    side: DEMO_SIDE,
    goal: "balance",
    discomfort: false,
  };
  assert.equal(recommend(r).program, "pilates");
  assert.equal(recommend({ ...r, goal: "strength" }).program, "pt");
  assert.equal(recommend({ ...r, goal: "mobility" }).program, "stretching");
  assert.match(recommend({ ...r, discomfort: true }).title, /불편감 상담/);
  const normal = structuredClone(r);
  for (const group of [normal.front, normal.side])
    for (const value of Object.values(group))
      if (value && typeof value === "object") value.severity = "normal";
  assert.equal(recommend(normal).program, "pt");
});
test("quality rejects occluded required landmarks and maps image aspect ratio into pixels", () => {
  const lm = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.9,
  }));
  lm[11].y = 0.2;
  lm[27].y = 0.9;
  assert.equal(checkedPixels(lm, 600, 1200, 0)[11].y, 240);
  assert.equal(checkedPixels(lm, 600, 1200, 0)[11].x, 300);
  lm[2].visibility = 0.1;
  assert.throws(() => checkedPixels(lm, 600, 1200, 0));
  assert.doesNotThrow(() => checkedPixels(lm, 600, 1200, 2));
});
test("side metric signs remain stable when an image is horizontally mirrored", () => {
  const lm = Array.from({ length: 33 }, () => ({
    x: 100,
    y: 100,
    visibility: 0.8,
  }));
  for (const [i, x, y] of [
    [0, 160, 30],
    [7, 140, 40],
    [11, 120, 100],
    [23, 115, 200],
    [25, 110, 300],
    [27, 100, 400],
  ])
    lm[i] = { x, y, visibility: 0.99 };
  const first = computeSideMetrics(lm);
  const mirror = computeSideMetrics(lm.map((p) => ({ ...p, x: 500 - p.x })));
  assert.ok(
    Math.abs(first.forwardHeadAngle.value - mirror.forwardHeadAngle.value) <
      1e-8,
  );
  assert.ok(
    Math.abs(
      first.shoulderPlumbOffset.value - mirror.shoulderPlumbOffset.value,
    ) < 1e-8,
  );
});

test('invalid image dimensions and truncated landmark arrays fail with a capture message', () => {
  assert.throws(() => checkedPixels([], 600, 1200, 0), /촬영 데이터/);
  const lm = Array.from({length:33}, () => ({x:.5,y:.5,visibility:.9}));
  assert.throws(() => checkedPixels(lm, NaN, 1200, 0), /촬영 데이터/);
  assert.throws(() => checkedPixels(lm, 600, 1200, 9), /촬영 데이터/);
});
