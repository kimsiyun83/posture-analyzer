import type { Point } from "./landmarks";

const RAD2DEG = 180 / Math.PI;

/** Signed angle (degrees) of the line a->b relative to horizontal. Positive = b is lower than a (image y grows downward). */
export function angleFromHorizontal(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * RAD2DEG;
}

/** Unsigned tilt (degrees) of the line a-b away from level, in [0, 90]. 0 = perfectly
 * horizontal, regardless of whether a is left-of-b or right-of-b in the image. */
export function tiltFromLevel(a: Point, b: Point): number {
  const angle = Math.abs(angleFromHorizontal(a, b)) % 180;
  return angle > 90 ? 180 - angle : angle;
}

/** Angle (degrees) of the ray from vertex toward p, measured from vertical-down, signed (+ = p is to the right of vertical). */
export function angleFromVertical(vertex: Point, p: Point): number {
  const dx = p.x - vertex.x;
  const dy = p.y - vertex.y;
  return Math.atan2(dx, dy) * RAD2DEG;
}

/** Interior angle ABC (degrees) at vertex b, formed by points a-b-c. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby);
  const magCB = Math.hypot(cbx, cby);
  if (magAB === 0 || magCB === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return Math.acos(cos) * RAD2DEG;
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Signed horizontal distance from point p to the vertical line dropped from `anchor`,
 * normalized by `scale` (a body-segment length in the same units) so the result is
 * comparable across photos taken at different distances/zoom levels.
 * Positive = p is to the right of the anchor's vertical (image x grows rightward).
 */
export function normalizedHorizontalOffset(anchor: Point, p: Point, scale: number): number {
  if (scale === 0) return NaN;
  return (p.x - anchor.x) / scale;
}
