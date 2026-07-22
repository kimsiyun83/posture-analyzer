import { LM, type PoseLandmarks, type Point } from "./landmarks";
import { angleAt, distance, midpoint, tiltFromLevel } from "./math";

export type Severity = "normal" | "mild" | "notable";

export type ReadingKey =
  | "headTilt"
  | "shoulderTilt"
  | "hipTilt"
  | "kneeAlignmentLeft"
  | "kneeAlignmentRight"
  | "forwardHeadAngle"
  | "shoulderPlumbOffset"
  | "hipPlumbOffset"
  | "kneePlumbOffset";

export interface Reading {
  key: ReadingKey;
  label: string;
  value: number;
  unit: "deg" | "ratio";
  severity: Severity;
  note: string;
}

export const SEVERITY_LABEL_KO: Record<Severity, string> = {
  normal: "정상 범위",
  mild: "경도 편차",
  notable: "뚜렷한 편차",
};

export const SEVERITY_HEX: Record<Severity, string> = {
  normal: "#059669",
  mild: "#d97706",
  notable: "#e11d48",
};

export function formatReadingValue(r: Reading): string {
  if (r.unit === "deg") return `${r.value.toFixed(1)}°`;
  return `${(r.value * 100).toFixed(1)}%`;
}

function classify(absValue: number, mildAt: number, notableAt: number): Severity {
  if (absValue >= notableAt) return "notable";
  if (absValue >= mildAt) return "mild";
  return "normal";
}

function avgVisibility(lm: PoseLandmarks, indices: number[]): number {
  const vals = indices.map((i) => lm[i]?.visibility ?? 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------- FRONT VIEW ----------

export interface FrontResult {
  headTilt: Reading;
  shoulderTilt: Reading;
  hipTilt: Reading;
  kneeAlignmentLeft: Reading;
  kneeAlignmentRight: Reading;
  overallScore: number;
}

export function computeFrontMetrics(lm: PoseLandmarks): FrontResult {
  const leftEye = lm[LM.leftEye];
  const rightEye = lm[LM.rightEye];
  const leftShoulder = lm[LM.leftShoulder];
  const rightShoulder = lm[LM.rightShoulder];
  const leftHip = lm[LM.leftHip];
  const rightHip = lm[LM.rightHip];
  const leftKnee = lm[LM.leftKnee];
  const rightKnee = lm[LM.rightKnee];
  const leftAnkle = lm[LM.leftAnkle];
  const rightAnkle = lm[LM.rightAnkle];

  const headTiltVal = tiltFromLevel(leftEye, rightEye);
  const shoulderTiltVal = tiltFromLevel(leftShoulder, rightShoulder);
  const hipTiltVal = tiltFromLevel(leftHip, rightHip);

  const headTilt: Reading = {
    key: "headTilt",
    label: "머리 기울기 (좌우 눈 수평)",
    value: headTiltVal,
    unit: "deg",
    severity: classify(headTiltVal, 2, 4),
    note: "양쪽 눈을 잇는 선이 수평에서 벗어난 각도입니다.",
  };
  const shoulderTilt: Reading = {
    key: "shoulderTilt",
    label: "어깨 좌우 높이차",
    value: shoulderTiltVal,
    unit: "deg",
    severity: classify(shoulderTiltVal, 2, 4),
    note: "양쪽 어깨(견봉 추정 지점)를 잇는 선이 수평에서 벗어난 각도입니다.",
  };
  const hipTilt: Reading = {
    key: "hipTilt",
    label: "골반 좌우 높이차",
    value: hipTiltVal,
    unit: "deg",
    severity: classify(hipTiltVal, 2, 4),
    note: "양쪽 골반(고관절 추정 지점)을 잇는 선이 수평에서 벗어난 각도입니다.",
  };

  const kneeAlignmentLeft = kneeValgusVarus(leftHip, leftKnee, leftAnkle, "left");
  const kneeAlignmentRight = kneeValgusVarus(rightHip, rightKnee, rightAnkle, "right");

  const penalty =
    Math.min(headTiltVal / 4, 1) * 15 +
    Math.min(shoulderTiltVal / 4, 1) * 20 +
    Math.min(hipTiltVal / 4, 1) * 20 +
    Math.min(Math.abs(kneeAlignmentLeft.value) / 0.08, 1) * 22.5 +
    Math.min(Math.abs(kneeAlignmentRight.value) / 0.08, 1) * 22.5;

  return {
    headTilt,
    shoulderTilt,
    hipTilt,
    kneeAlignmentLeft,
    kneeAlignmentRight,
    overallScore: Math.round(Math.max(0, 100 - penalty)),
  };
}

function pointOnLineAtY(a: Point, b: Point, y: number): number {
  if (b.y === a.y) return a.x;
  const t = (y - a.y) / (b.y - a.y);
  return a.x + t * (b.x - a.x);
}

function kneeValgusVarus(hip: Point, knee: Point, ankle: Point, side: "left" | "right"): Reading {
  const expectedX = pointOnLineAtY(hip, ankle, knee.y);
  const legLength = distance(hip, ankle);
  const rawOffset = knee.x - expectedX;
  // Anatomical left lands on the larger-x side of a non-mirrored frontal photo, right on the
  // smaller-x side (subject faces the camera). Flip sign so + always means "valgus" (knock-knee,
  // knee drifts toward midline) and - always means "varus" (bow-leg, knee drifts away from midline).
  const signed = side === "left" ? -rawOffset : rawOffset;
  const ratio = legLength === 0 ? 0 : signed / legLength;
  const abs = Math.abs(ratio);
  const direction = ratio > 0 ? "무릎이 안쪽으로 쏠림(외반슬 경향)" : ratio < 0 ? "무릎이 바깥쪽으로 벌어짐(내반슬 경향)" : "정렬 양호";
  return {
    key: side === "left" ? "kneeAlignmentLeft" : "kneeAlignmentRight",
    label: side === "left" ? "왼쪽 무릎 정렬" : "오른쪽 무릎 정렬",
    value: ratio,
    unit: "ratio",
    severity: classify(abs, 0.04, 0.08),
    note: `엉덩이-발목 직선 대비 무릎 위치 편차(다리 길이 대비 비율). ${direction}.`,
  };
}

// ---------- SIDE VIEW ----------

export type Facing = "left" | "right";

export interface SideResult {
  facing: Facing;
  forwardHeadAngle: Reading;
  shoulderPlumbOffset: Reading;
  hipPlumbOffset: Reading;
  kneePlumbOffset: Reading;
  overallScore: number;
}

export function detectFacing(lm: PoseLandmarks): Facing {
  const leftVis = avgVisibility(lm, [LM.leftEar, LM.leftShoulder, LM.leftHip, LM.leftAnkle]);
  const rightVis = avgVisibility(lm, [LM.rightEar, LM.rightShoulder, LM.rightHip, LM.rightAnkle]);
  if (leftVis === rightVis) {
    const nose = lm[LM.nose];
    const leftEar = lm[LM.leftEar];
    const rightEar = lm[LM.rightEar];
    return Math.abs(nose.x - leftEar.x) < Math.abs(nose.x - rightEar.x) ? "left" : "right";
  }
  return leftVis > rightVis ? "left" : "right";
}

export function computeSideMetrics(lm: PoseLandmarks): SideResult {
  const facing = detectFacing(lm);
  const pick = (leftIdx: number, rightIdx: number) => (facing === "left" ? lm[leftIdx] : lm[rightIdx]);

  const ear = pick(LM.leftEar, LM.rightEar);
  const shoulder = pick(LM.leftShoulder, LM.rightShoulder);
  const hip = pick(LM.leftHip, LM.rightHip);
  const knee = pick(LM.leftKnee, LM.rightKnee);
  const ankle = pick(LM.leftAnkle, LM.rightAnkle);

  // Forward Head Angle: angle at the shoulder between an anterior horizontal ray and the
  // ray toward the ear. A practical, marker-less proxy for the craniovertebral angle (CVA)
  // used in photographic posture-screening studies, substituting the acromion for C7 since
  // C7 cannot be located reliably from a single photo without a palpated marker.
  const anteriorDir = facing === "right" ? 1 : -1;
  const horizonPoint: Point = { x: shoulder.x + anteriorDir * 100, y: shoulder.y };
  const fha = angleAt(horizonPoint, shoulder, ear);
  const forwardHeadAngle: Reading = {
    key: "forwardHeadAngle",
    label: "귀-어깨 각도 (전방머리자세 근사 지표, CVA 대체)",
    value: fha,
    unit: "deg",
    severity: classify(Math.max(0, 50 - fha), 5, 10),
    note: "각도가 작을수록 머리가 상대적으로 앞으로 나온 자세(전방머리자세)에 가깝습니다. 문헌상 대략 50°±를 참고 기준으로 삼되, 절대 진단이 아닌 동일인 추이 비교용으로 사용하세요.",
  };

  const bodyHeight = distance(ear, ankle) || 1;
  const plumbOffset = (p: Point): number => {
    const raw = p.x - ankle.x;
    const forwardSigned = anteriorDir * raw; // + = anterior (forward) of the ankle plumb line
    return forwardSigned / bodyHeight;
  };

  const shoulderOffsetVal = plumbOffset(shoulder);
  const hipOffsetVal = plumbOffset(hip);
  const kneeOffsetVal = plumbOffset(knee);

  const shoulderPlumbOffset: Reading = {
    key: "shoulderPlumbOffset",
    label: "어깨 전후 정렬 (발목 수직선 기준)",
    value: shoulderOffsetVal,
    unit: "ratio",
    severity: classify(Math.abs(shoulderOffsetVal), 0.05, 0.1),
    note: "발목에서 올린 수직선 대비 어깨의 전/후 편차(신장 대비 비율). 양수는 어깨가 앞으로 나온 둥근어깨 경향을 시사합니다.",
  };
  const hipPlumbOffset: Reading = {
    key: "hipPlumbOffset",
    label: "골반 전후 정렬 (발목 수직선 기준)",
    value: hipOffsetVal,
    unit: "ratio",
    severity: classify(Math.abs(hipOffsetVal), 0.04, 0.08),
    note: "발목 수직선 대비 골반의 전/후 편차. 골반 전방/후방 경사 스크리닝에 참고합니다.",
  };
  const kneePlumbOffset: Reading = {
    key: "kneePlumbOffset",
    label: "무릎 전후 정렬 (발목 수직선 기준)",
    value: kneeOffsetVal,
    unit: "ratio",
    severity: classify(Math.abs(kneeOffsetVal), 0.04, 0.08),
    note: "발목 수직선 대비 무릎의 전/후 편차.",
  };

  const penalty =
    Math.min(Math.max(0, 50 - fha) / 10, 1) * 35 +
    Math.min(Math.abs(shoulderOffsetVal) / 0.1, 1) * 25 +
    Math.min(Math.abs(hipOffsetVal) / 0.08, 1) * 20 +
    Math.min(Math.abs(kneeOffsetVal) / 0.08, 1) * 20;

  return {
    facing,
    forwardHeadAngle,
    shoulderPlumbOffset,
    hipPlumbOffset,
    kneePlumbOffset,
    overallScore: Math.round(Math.max(0, 100 - penalty)),
  };
}

export function keyLandmarksForOverlay(lm: PoseLandmarks, view: "front" | "side", facing?: Facing) {
  if (view === "front") {
    return {
      points: [
        lm[LM.leftEye],
        lm[LM.rightEye],
        lm[LM.leftShoulder],
        lm[LM.rightShoulder],
        lm[LM.leftHip],
        lm[LM.rightHip],
        lm[LM.leftKnee],
        lm[LM.rightKnee],
        lm[LM.leftAnkle],
        lm[LM.rightAnkle],
      ],
      lines: [
        [lm[LM.leftEye], lm[LM.rightEye]],
        [lm[LM.leftShoulder], lm[LM.rightShoulder]],
        [lm[LM.leftHip], lm[LM.rightHip]],
        [lm[LM.leftHip], lm[LM.leftKnee]],
        [lm[LM.leftKnee], lm[LM.leftAnkle]],
        [lm[LM.rightHip], lm[LM.rightKnee]],
        [lm[LM.rightKnee], lm[LM.rightAnkle]],
      ] as [Point, Point][],
    };
  }
  const f = facing ?? detectFacing(lm);
  const ear = f === "left" ? lm[LM.leftEar] : lm[LM.rightEar];
  const shoulder = f === "left" ? lm[LM.leftShoulder] : lm[LM.rightShoulder];
  const hip = f === "left" ? lm[LM.leftHip] : lm[LM.rightHip];
  const knee = f === "left" ? lm[LM.leftKnee] : lm[LM.rightKnee];
  const ankle = f === "left" ? lm[LM.leftAnkle] : lm[LM.rightAnkle];
  return {
    points: [ear, shoulder, hip, knee, ankle],
    lines: [
      [ear, shoulder],
      [shoulder, hip],
      [hip, knee],
      [knee, ankle],
    ] as [Point, Point][],
    plumb: { top: ear, bottom: ankle },
  };
}

export function collectReadings(front: FrontResult, side: SideResult): Reading[] {
  return [
    front.headTilt,
    front.shoulderTilt,
    front.hipTilt,
    front.kneeAlignmentLeft,
    front.kneeAlignmentRight,
    side.forwardHeadAngle,
    side.shoulderPlumbOffset,
    side.hipPlumbOffset,
    side.kneePlumbOffset,
  ];
}

export { midpoint };
