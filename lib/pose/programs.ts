import type { ReadingKey, Severity } from "./metrics";

export type ProgramType = "pilates" | "stretching" | "pt";

export interface ProgramMeta {
  label: string;
  short: string;
  description: string;
}

export const PROGRAM_META: Record<ProgramType, ProgramMeta> = {
  pilates: {
    label: "필라테스",
    short: "코어·골반 정렬 중심",
    description: "골반 전후·좌우 정렬과 척추 지지에 필요한 코어 활성화 포인트를 우선 확인합니다.",
  },
  stretching: {
    label: "패시브 스트레칭",
    short: "단축 근육 스크리닝 중심",
    description: "관절 정렬 편차로부터 단축이 의심되는 근육을 추정해 우선 스트레칭 부위를 제안합니다.",
  },
  pt: {
    label: "퍼스널 트레이닝(PT)",
    short: "근력 불균형·부상 위험 중심",
    description: "좌우 비대칭과 무릎 정렬 등 운동 중 부상 위험·큐잉이 필요한 지점을 우선 확인합니다.",
  },
};

export const PROGRAM_ORDER: ProgramType[] = ["pilates", "stretching", "pt"];

interface FocusPoint {
  key: ReadingKey;
  reason: string;
  advice: Partial<Record<Severity, string>>;
}

// Each program highlights a different subset/ordering of the same underlying
// measurements, with guidance framed for that modality's usual focus. These are
// general practice pointers for a trainer to weigh alongside their own judgment,
// not a diagnosis or a substitute for individualized program design.
export const PROGRAM_FOCUS: Record<ProgramType, FocusPoint[]> = {
  pilates: [
    {
      key: "hipPlumbOffset",
      reason: "골반의 전방/후방 경사는 코어(복횡근·골반저근) 활성화 순서를 정하는 기준이 됩니다.",
      advice: {
        notable: "골반 경사 편차가 뚜렷합니다. 파운데이션·임프린팅 동작으로 중립 골반 인지부터 우선 지도하는 것을 고려하세요.",
        mild: "경도의 골반 경사가 있습니다. 코어 활성화 동작에서 중립 골반 큐잉을 함께 챙기면 좋습니다.",
        normal: "골반 전후 정렬이 양호합니다. 기본 코어 프로그램으로 진행 가능합니다.",
      },
    },
    {
      key: "hipTilt",
      reason: "좌우 골반 높이차는 한쪽 코어·고관절 안정근의 비대칭 활성을 시사할 수 있습니다.",
      advice: {
        notable: "좌우 골반 높이차가 뚜렷합니다. 편측(한쪽씩) 코어·힙 안정화 동작 비중을 높이는 것을 고려하세요.",
        mild: "경도의 좌우 편차가 있습니다. 편측 동작 시 좌우 반복수를 동일하게 유지하며 관찰하세요.",
        normal: "좌우 골반 높이가 대칭적입니다.",
      },
    },
    {
      key: "shoulderPlumbOffset",
      reason: "어깨의 전방 이동은 흉추 신전 및 견갑 안정화 동작이 필요한지 판단하는 참고 지표입니다.",
      advice: {
        notable: "어깨가 앞으로 나온 경향이 뚜렷합니다. 흉추 신전·견갑 후인 동작을 세션 초반에 배치하는 것을 고려하세요.",
        mild: "경도의 어깨 전방 이동이 있습니다. 견갑 안정화 큐잉을 함께 확인하세요.",
        normal: "어깨-발목 정렬이 양호합니다.",
      },
    },
    {
      key: "kneeAlignmentLeft",
      reason: "한 발 지지 동작(레그서클, 사이드킥 등)에서 무릎 정렬 큐잉의 기준이 됩니다.",
      advice: {
        notable: "무릎 정렬 편차가 뚜렷합니다. 한 발 지지 동작에서 무릎 방향 큐잉을 반드시 함께 지도하세요.",
        mild: "경도의 무릎 정렬 편차가 있습니다.",
        normal: "무릎 정렬이 양호합니다.",
      },
    },
  ],
  stretching: [
    {
      key: "forwardHeadAngle",
      reason: "귀-어깨 각도가 작을수록 목 앞쪽·상부승모근·견갑거근이 단축되어 있을 가능성을 시사합니다.",
      advice: {
        notable: "전방머리자세 경향이 뚜렷합니다. 흉쇄유돌근·상부승모근·견갑거근 스트레칭을 우선 배치하는 것을 권장합니다.",
        mild: "경도의 전방머리자세 경향이 있습니다. 목·어깨 스트레칭을 세션에 포함하면 좋습니다.",
        normal: "목-어깨 정렬이 양호합니다.",
      },
    },
    {
      key: "shoulderPlumbOffset",
      reason: "어깨의 전방 이동은 대흉근·전면 삼각근 등 어깨 앞쪽 근육의 단축을 시사할 수 있습니다.",
      advice: {
        notable: "어깨가 앞으로 나온 경향이 뚜렷합니다. 가슴·전면 어깨 스트레칭을 우선순위로 두세요.",
        mild: "경도의 어깨 전방 이동이 있습니다.",
        normal: "어깨 정렬이 양호합니다.",
      },
    },
    {
      key: "hipPlumbOffset",
      reason: "골반이 앞으로 기울어져 있다면 고관절 굴곡근(장요근), 뒤로 기울어져 있다면 햄스트링 단축을 의심할 수 있습니다.",
      advice: {
        notable: "골반 경사 편차가 뚜렷합니다. 고관절 굴곡근 또는 햄스트링(경사 방향에 따라) 스트레칭을 우선 배치하세요.",
        mild: "경도의 골반 경사가 있습니다.",
        normal: "골반 전후 정렬이 양호합니다.",
      },
    },
    {
      key: "kneePlumbOffset",
      reason: "무릎의 전후 정렬은 종아리(비복근)·햄스트링의 유연성과 관련될 수 있습니다.",
      advice: {
        notable: "무릎 정렬 편차가 뚜렷합니다. 종아리·햄스트링 스트레칭을 확인하세요.",
        mild: "경도의 무릎 정렬 편차가 있습니다.",
        normal: "무릎 전후 정렬이 양호합니다.",
      },
    },
  ],
  pt: [
    {
      key: "kneeAlignmentLeft",
      reason: "스쿼트·런지 등 하체 운동에서 무릎이 안쪽으로 쏠리면(외반슬) 부상 위험이 높아질 수 있습니다.",
      advice: {
        notable: "무릎 정렬 편차가 뚜렷합니다. 하체 운동 시 무릎이 발끝 방향을 향하도록 큐잉하고, 중량 부하 전 정렬 개선 동작을 우선하세요.",
        mild: "경도의 무릎 정렬 편차가 있습니다. 고중량 하체 운동 시 무릎 방향을 계속 확인하세요.",
        normal: "무릎 정렬이 양호하여 일반적인 하체 운동 진행이 가능합니다.",
      },
    },
    {
      key: "shoulderTilt",
      reason: "좌우 어깨 높이차는 편측 근력 불균형을 시사하며, 편측 운동의 우선순위를 정하는 데 참고할 수 있습니다.",
      advice: {
        notable: "좌우 어깨 높이차가 뚜렷합니다. 약한 쪽부터 편측 운동을 우선 배치하는 것을 고려하세요.",
        mild: "경도의 좌우 편차가 있습니다.",
        normal: "좌우 어깨 높이가 대칭적입니다.",
      },
    },
    {
      key: "hipTilt",
      reason: "좌우 골반 높이차는 편측 하체·코어 근력 차이 및 운동 중 보상 동작과 관련될 수 있습니다.",
      advice: {
        notable: "좌우 골반 높이차가 뚜렷합니다. 데드리프트·스쿼트 등에서 좌우 보상 동작이 없는지 확인하세요.",
        mild: "경도의 좌우 편차가 있습니다.",
        normal: "좌우 골반 높이가 대칭적입니다.",
      },
    },
    {
      key: "forwardHeadAngle",
      reason: "오버헤드 프레스 등 상체 운동에서 전방머리자세가 있으면 경추 부담이 커질 수 있습니다.",
      advice: {
        notable: "전방머리자세 경향이 뚜렷합니다. 오버헤드 동작 전 목 중립 큐잉과 흉추 가동성 운동을 우선하세요.",
        mild: "경도의 전방머리자세 경향이 있습니다.",
        normal: "목-어깨 정렬이 양호합니다.",
      },
    },
  ],
};
