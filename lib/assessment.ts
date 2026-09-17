import {
  type FrontResult,
  type SideResult,
  detectFacing,
  collectReadings,
} from "./pose/metrics";
import { type PoseLandmarks, LM } from "./pose/landmarks";
import type { ProgramType } from "./pose/programs";
export const DIRECTIONS = ["정면", "오른쪽 측면", "후면", "왼쪽 측면"] as const;
export type Goal = "balance" | "strength" | "mobility";
export interface AssessmentRecord {
  id: string;
  date: string;
  front: FrontResult;
  side: SideResult;
  right: SideResult;
  back: { shoulder: number; hip: number };
  goal: Goal;
  discomfort: boolean;
}
export function recommend(
  r: Pick<AssessmentRecord, "goal" | "discomfort" | "front" | "side">,
): { program: ProgramType; title: string; reason: string } {
  const observed = collectReadings(r.front, r.side).filter(
    (v) => v.severity !== "normal",
  );
  const program: ProgramType =
    r.goal === "strength"
      ? "pt"
      : r.goal === "mobility"
        ? "stretching"
        : observed.length
          ? "pilates"
          : "pt";
  const focus = observed
    .slice(0, 2)
    .map((v) => v.label.split(" (")[0])
    .join(" · ");
  const basis = observed.length
    ? `이번 사진에서 ${focus} 항목이 앱 참고 범위를 벗어났습니다. 같은 조건의 재촬영과 움직임 평가로 먼저 확인하세요. `
    : "이번 사진의 9항목은 앱 참고 범위에 있습니다. 이 결과가 근력이나 유연성이 충분하다는 뜻은 아닙니다. ";
  return {
    program,
    title: r.discomfort
      ? "강습 선택 전 불편감 상담을 권해요"
      : program === "pt"
        ? "PT 상담을 추천해요"
        : program === "pilates"
          ? "필라테스 상담을 추천해요"
          : "패시브 스트레칭 상담을 추천해요",
    reason: r.discomfort
      ? "현재 불편감이 있다고 답하셨습니다. 사진만으로 수업 가능 여부를 정할 수 없어 담당자와 상태를 먼저 확인하세요."
      : basis +
        (program === "pt"
          ? "근력·체력 목표 또는 전반적인 운동 계획을 위한 PT 상담을 제안합니다."
          : program === "pilates"
            ? "자세·균형 목표와 정렬 관찰 항목을 함께 확인할 수 있는 필라테스 상담을 제안합니다."
            : "유연성·움직임 목표에 따라 패시브 스트레칭 상담을 제안합니다. 사진으로 근육 단축을 판단하지 않습니다."),
  };
}
export function checkedPixels(
  lm: PoseLandmarks,
  width: number,
  height: number,
  index: number,
): PoseLandmarks {
  if (!Array.isArray(lm) || lm.length < 33 || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isInteger(index) || index < 0 || index > 3)
    throw new Error("촬영 데이터가 올바르지 않습니다. 사진을 다시 선택해 주세요.");
  const side = detectFacing(lm);
  const indices =
    index === 0
      ? [2, 5, 11, 12, 23, 24, 25, 26, 27, 28]
      : index === 2
        ? [11, 12, 23, 24, 25, 26, 27, 28]
        : side === "left"
          ? [0, 7, 11, 23, 25, 27]
          : [0, 8, 12, 24, 26, 28];
  if (
    width <= 0 ||
    height <= 0 ||
    indices.some(
      (i) =>
        !lm[i] ||
        !Number.isFinite(lm[i].x) ||
        !Number.isFinite(lm[i].y) ||
        lm[i].x < 0 ||
        lm[i].x > 1 ||
        lm[i].y < 0 ||
        lm[i].y > 1 ||
        (lm[i].visibility ?? 0) < 0.55,
    )
  )
    throw new Error(
      "필수 관절이 가려졌거나 화면 밖에 있습니다. 머리부터 발끝까지 보이게 다시 촬영해 주세요.",
    );
  const useRight = (index === 1 || index === 3) && side === "right";
  const shoulder = lm[useRight ? LM.rightShoulder : LM.leftShoulder];
  const ankle = lm[useRight ? LM.rightAnkle : LM.leftAnkle];
  if (Math.abs(shoulder.y - ankle.y) < 0.15)
    throw new Error("전신 크기가 너무 작습니다. 카메라 거리를 조절해 주세요.");
  return lm.map((p) => ({ ...p, x: p.x * width, y: p.y * height }));
}
