import { collectReadings, type FrontResult, type SideResult, type Reading, type ReadingKey } from "./metrics";
import type { ProgramType } from "./programs";

export const REPORT_LABEL = { normal: "참고 범위", mild: "관찰 필요", notable: "우선 확인" } as const;
export interface MetricGuide {
  title: string;
  view: "front" | "side";
  range: string;
  meaning: string;
  check: string;
  limit: string;
  max: number;
}
export const METRIC_GUIDES: Record<ReadingKey, MetricGuide> = {
  headTilt: { title: "머리 좌우 기울기", view: "front", range: "2° 미만", max: 8, meaning: "양쪽 눈을 연결한 선과 수평선 사이의 각도입니다.", check: "시선을 정면에 두고, 고개를 일부러 바로잡지 않은 편안한 자세로 다시 확인합니다.", limit: "시선 방향과 얼굴 회전에 영향을 받으며 목 질환이나 근육 단축을 판단하지 않습니다." },
  shoulderTilt: { title: "어깨 좌우 높이", view: "front", range: "2° 미만", max: 8, meaning: "양쪽 어깨의 추정 지점을 이은 선이 수평에서 벗어난 정도입니다.", check: "양팔을 자연스럽게 내리고 어깨를 으쓱하지 않은 상태에서 재확인합니다.", limit: "이 각도만으로 어느 쪽 근력이 약한지, 통증 원인이 무엇인지 알 수 없습니다." },
  hipTilt: { title: "골반 좌우 높이", view: "front", range: "2° 미만", max: 8, meaning: "양쪽 고관절 추정 지점 사이의 수평 편차입니다.", check: "발 간격과 좌우 체중 지지를 일정하게 맞추어 다시 관찰합니다.", limit: "골반 뼈의 실제 높이나 다리 길이를 직접 측정한 값이 아닙니다." },
  kneeAlignmentLeft: { title: "왼쪽 무릎 정렬", view: "front", range: "절댓값 4% 미만", max: 16, meaning: "고관절–발목 직선에서 무릎이 벗어난 거리를 해당 다리의 화면상 길이로 나눈 값입니다.", check: "발끝 방향과 무릎 위치를 함께 확인하고, 좌우에 같은 촬영 조건을 적용합니다.", limit: "양수는 안쪽, 음수는 바깥쪽 편차입니다. 뼈의 변형이나 동작 중 정렬을 진단하지 않습니다." },
  kneeAlignmentRight: { title: "오른쪽 무릎 정렬", view: "front", range: "절댓값 4% 미만", max: 16, meaning: "고관절–발목 직선에서 무릎이 벗어난 거리를 해당 다리의 화면상 길이로 나눈 값입니다.", check: "발끝 방향과 무릎 위치를 함께 확인하고, 좌우에 같은 촬영 조건을 적용합니다.", limit: "양수는 안쪽, 음수는 바깥쪽 편차입니다. 뼈의 변형이나 동작 중 정렬을 진단하지 않습니다." },
  forwardHeadAngle: { title: "귀–어깨 각도", view: "side", range: "앱 분류상 45° 초과", max: 90, meaning: "어깨에서 귀로 향하는 선과 전방 수평선이 이루는 각도입니다. 작은 값일수록 두 지점 사이의 전방 편차를 확인합니다.", check: "귀와 어깨가 가려지지 않게 하고 옆모습이 카메라와 수직인지 확인합니다.", limit: "C7 대신 어깨를 사용한 대체 지표로, 임상 두개척추각(CVA)과 같은 측정이 아닙니다." },
  shoulderPlumbOffset: { title: "어깨 전후 위치", view: "side", range: "절댓값 5% 미만", max: 20, meaning: "발목 수직선 대비 어깨 위치를 귀–발목 사이 화면상 거리로 정규화한 값입니다.", check: "몸을 돌리지 않고 발목·어깨가 보이는 자연스러운 옆모습을 확인합니다.", limit: "양수는 앞쪽, 음수는 뒤쪽 위치입니다. 라운드숄더나 근육 단축을 확정하지 않습니다." },
  hipPlumbOffset: { title: "골반 전후 위치", view: "side", range: "절댓값 4% 미만", max: 16, meaning: "발목 수직선 대비 고관절 추정 지점의 앞뒤 위치입니다. 귀–발목 거리 대비 비율로 표시합니다.", check: "골반을 의도적으로 밀거나 말지 않고 서 있는지 확인합니다.", limit: "골반의 이동량이며, 골반 전방·후방 경사각을 측정하는 지표가 아닙니다." },
  kneePlumbOffset: { title: "무릎 전후 위치", view: "side", range: "절댓값 4% 미만", max: 16, meaning: "발목 수직선 대비 무릎의 앞뒤 위치를 귀–발목 거리로 나눈 값입니다.", check: "무릎을 일부러 잠그거나 굽히지 않은 편안한 선 자세를 확인합니다.", limit: "무릎 굽힘 각도나 과신전 여부를 직접 측정한 값은 아닙니다." },
};

export function summarizeReport(front: FrontResult, side: SideResult) {
  const readings = collectReadings(front, side);
  const order = { normal: 0, mild: 1, notable: 2 };
  const priorities = readings.filter(r => r.severity !== "normal").sort((a,b) => order[b.severity] - order[a.severity]);
  return {
    readings, priorities,
    score: Math.round((front.overallScore + side.overallScore) / 2),
    counts: { normal: readings.filter(r => r.severity === "normal").length, mild: readings.filter(r => r.severity === "mild").length, notable: readings.filter(r => r.severity === "notable").length },
    kneeDifference: Math.abs(front.kneeAlignmentLeft.value - front.kneeAlignmentRight.value) * 100,
  };
}

export function readingInterpretation(r: Reading): string {
  const state = REPORT_LABEL[r.severity];
  if (r.severity === "normal") return `앱의 참고 범위에 포함됩니다. 같은 촬영 조건에서 다음 기록과 비교하세요.`;
  if (r.key === "forwardHeadAngle") return `${state} 항목입니다. 귀–어깨 각도가 앱 참고 범위보다 작게 측정되었습니다. 시선과 촬영 방향을 확인한 뒤 다시 측정하세요.`;
  if (r.unit === "ratio") {
    const direction = r.key.startsWith("kneeAlignment") ? (r.value > 0 ? "안쪽" : "바깥쪽") : (r.value > 0 ? "앞쪽" : "뒤쪽");
    return `${state} 항목입니다. 기준선보다 ${direction} 편차가 관찰됩니다. 재촬영에서도 같은 경향인지 확인하세요.`;
  }
  return `${state} 항목입니다. 수평 기준에서 편차가 관찰됩니다. 카메라 기울기와 자세 재현성을 먼저 확인하세요.`;
}

export const COACHING: Record<ProgramType, { title: string; intro: string; steps: string[] }> = {
  pt: { title: "PT 상담 포인트", intro: "정렬 수치를 실제 운동 관찰과 연결합니다.", steps: ["불편한 부위와 이전 운동 경험을 먼저 확인합니다.", "스쿼트·밀기·당기기 등 예정된 동작에서 편안한 범위와 좌우 차이를 트레이너가 관찰합니다.", "측정값 하나로 중량을 결정하지 않고 실제 수행 능력에 맞춰 강도를 정합니다."] },
  pilates: { title: "필라테스 상담 포인트", intro: "호흡과 자세 인지, 지지의 차이를 함께 확인합니다.", steps: ["호흡할 때 불편함과 편안한 자세를 먼저 확인합니다.", "매트 또는 기구에서 골반과 몸통 위치를 인지하는 과정을 지도자와 점검합니다.", "측정값만으로 기구 난이도를 결정하지 않고 동작 수행과 반응에 따라 수업을 조절합니다."] },
  stretching: { title: "패시브 스트레칭 상담 포인트", intro: "정적 사진과 실제 가동범위 평가를 구분합니다.", steps: ["통증·수술 이력과 피해야 할 움직임을 먼저 상담합니다.", "지도자가 관절의 편안한 움직임 범위를 별도로 확인합니다. 사진으로 단축 근육을 확정하지 않습니다.", "불편감에 따라 강도를 조절하고, 통증이 생기면 중단하여 담당 전문가와 상의합니다."] },
};

// Deliberately fictional, fixed example. Never written to member or measurement storage.
const reading = (key: ReadingKey, value: number, unit: Reading["unit"], severity: Reading["severity"]): Reading => ({key,label:METRIC_GUIDES[key].title,value,unit,severity,note:METRIC_GUIDES[key].meaning});
export const DEMO_FRONT: FrontResult = {
  headTilt: reading("headTilt",1.2,"deg","normal"), shoulderTilt: reading("shoulderTilt",3.1,"deg","mild"), hipTilt: reading("hipTilt",1.4,"deg","normal"),
  kneeAlignmentLeft: reading("kneeAlignmentLeft",0.052,"ratio","mild"), kneeAlignmentRight: reading("kneeAlignmentRight",0.018,"ratio","normal"), overallScore: 53,
};
export const DEMO_SIDE: SideResult = {
  facing:"left", forwardHeadAngle:reading("forwardHeadAngle",43,"deg","mild"), shoulderPlumbOffset:reading("shoulderPlumbOffset",0.062,"ratio","mild"),
  hipPlumbOffset:reading("hipPlumbOffset",0.023,"ratio","normal"), kneePlumbOffset:reading("kneePlumbOffset",0.015,"ratio","normal"), overallScore:51,
};

/** Reject incomplete/legacy JSON instead of showing invented or NaN measurements. */
export function parseReportMetrics(value: unknown): { front: FrontResult; side: SideResult } | null {
  if (!value || typeof value !== "object") return null;
  const { front, side } = value as { front?: unknown; side?: unknown };
  if (!front || !side || typeof front !== "object" || typeof side !== "object") return null;
  const f = front as Record<string, unknown>, s = side as Record<string, unknown>;
  for (const score of [f.overallScore,s.overallScore]) if(typeof score!=="number"||!Number.isFinite(score)||score<0||score>100) return null;
  if (s.facing!=="left"&&s.facing!=="right") return null;
  for (const [key, guide] of Object.entries(METRIC_GUIDES)) {
    const r=(guide.view==="front"?f:s)[key] as Partial<Reading>|undefined;
    if (!r || r.key!==key || typeof r.value!=="number" || !Number.isFinite(r.value) || !["normal","mild","notable"].includes(r.severity??"") || !["deg","ratio"].includes(r.unit??"") || typeof r.label!=="string" || typeof r.note!=="string") return null;
  }
  return {front:front as FrontResult,side:side as SideResult};
}
