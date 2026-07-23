// AI engine abstraction. `RuleBasedAiEngine` is the default, zero-cost implementation
// (deterministic templates over the member's actual data — no external API, no
// per-request cost). To upgrade quality later, implement `AiEngine` with real GPT
// calls (e.g. `OpenAiEngine`) reading OPENAI_API_KEY, and swap the export at the
// bottom of this file — nothing else in the app needs to change, since callers only
// depend on the `AiEngine` interface.

export interface MemberAiContext {
  name: string;
  age?: number;
  gender?: string | null;
  medicalHistory?: string | null;
  recentPainRecords: { bodyPart: string; severity: number; recordedAt: Date }[];
  recentAttendanceCount: number;
  latestPostureResult?: {
    programType: string;
    frontScore: number;
    sideScore: number;
    measuredAt: Date;
  };
  latestBodyAssessment?: {
    weightKg: number | null;
    bodyFatPercent: number | null;
    muscleMassKg: number | null;
    bmi: number | null;
  };
}

export interface AiEngine {
  readonly name: string;
  generateConsultationNote(ctx: MemberAiContext): string;
  recommendExercises(ctx: MemberAiContext): string;
  recommendDiet(ctx: MemberAiContext): string;
}

function painSummary(ctx: MemberAiContext): string {
  if (ctx.recentPainRecords.length === 0) return "최근 보고된 통증 없음";
  const parts = ctx.recentPainRecords
    .slice(0, 3)
    .map((p) => `${p.bodyPart}(강도 ${p.severity}/10, ${p.recordedAt.toLocaleDateString("ko-KR")})`);
  return parts.join(", ");
}

export class RuleBasedAiEngine implements AiEngine {
  readonly name = "rule-based";

  generateConsultationNote(ctx: MemberAiContext): string {
    const lines: string[] = [];
    lines.push(`${ctx.name} 회원 상담 노트 (자동 생성, ${new Date().toLocaleDateString("ko-KR")})`);
    lines.push("");
    lines.push(`- 최근 통증 이력: ${painSummary(ctx)}`);
    lines.push(`- 최근 출석: 최근 기록 기준 ${ctx.recentAttendanceCount}회`);

    if (ctx.medicalHistory) {
      lines.push(`- 병력 참고: ${ctx.medicalHistory}`);
    }

    if (ctx.latestPostureResult) {
      const { programType, frontScore, sideScore, measuredAt } = ctx.latestPostureResult;
      lines.push(
        `- 최근 자세 분석(${measuredAt.toLocaleDateString("ko-KR")}, ${programType}): 정면 ${frontScore}점 / 측면 ${sideScore}점`
      );
      if (frontScore < 70 || sideScore < 70) {
        lines.push("  → 정렬 편차가 눈에 띄는 편이므로 다음 세션에서 재평가와 교정 운동 비중을 높이는 것을 권장합니다.");
      } else {
        lines.push("  → 전반적인 정렬은 양호한 편이며, 유지 목적의 프로그램으로 진행 가능합니다.");
      }
    }

    if (ctx.latestBodyAssessment?.bmi) {
      lines.push(`- 체성분: BMI ${ctx.latestBodyAssessment.bmi.toFixed(1)}`);
    }

    lines.push("");
    lines.push(
      "이 노트는 회원의 기록 데이터를 바탕으로 규칙 기반 엔진이 자동 생성한 초안입니다. 실제 상담 전 트레이너의 검토와 수정을 거쳐 사용해 주세요."
    );

    return lines.join("\n");
  }

  recommendExercises(ctx: MemberAiContext): string {
    const lines: string[] = [];
    lines.push(`${ctx.name} 회원 운동 추천 (자동 생성)`);
    lines.push("");

    const hasPain = ctx.recentPainRecords.some((p) => p.severity >= 6);
    if (hasPain) {
      const worst = ctx.recentPainRecords.sort((a, b) => b.severity - a.severity)[0];
      lines.push(`- ${worst.bodyPart} 부위 통증(강도 ${worst.severity}/10)이 확인되어, 해당 부위에 직접 부하가 실리는 고강도 동작은 당분간 피하고 저강도 가동성·안정화 운동을 우선 배치하는 것을 권장합니다.`);
    }

    if (ctx.latestPostureResult) {
      const { frontScore, sideScore } = ctx.latestPostureResult;
      if (sideScore < 70) {
        lines.push("- 측면 정렬 점수가 낮아 전방머리자세·둥근어깨 교정을 위한 흉추 신전, 견갑 안정화 운동을 세션 초반에 포함하는 것을 권장합니다.");
      }
      if (frontScore < 70) {
        lines.push("- 정면 좌우 비대칭이 확인되어, 편측(한쪽씩) 운동 비중을 높여 약한 쪽을 우선 강화하는 것을 권장합니다.");
      }
      if (frontScore >= 70 && sideScore >= 70) {
        lines.push("- 정렬 상태가 양호하여 복합관절 운동 중심의 일반적인 근력 향상 프로그램 진행이 가능합니다.");
      }
    } else {
      lines.push("- 자세 분석 기록이 없어 일반적인 기초 체력 평가(FMS 등)를 우선 진행하는 것을 권장합니다.");
    }

    lines.push("");
    lines.push("이 추천은 규칙 기반 초안이며, 트레이너의 전문적 판단으로 최종 프로그램을 확정해 주세요.");
    return lines.join("\n");
  }

  recommendDiet(ctx: MemberAiContext): string {
    const lines: string[] = [];
    lines.push(`${ctx.name} 회원 식단 방향 제안 (자동 생성)`);
    lines.push("");

    const bmi = ctx.latestBodyAssessment?.bmi;
    if (bmi) {
      if (bmi >= 25) {
        lines.push(`- BMI ${bmi.toFixed(1)}로 과체중 범위에 해당하여, 총 섭취 칼로리를 소폭 줄이고 단백질 섭취 비중을 높이는 방향을 권장합니다.`);
      } else if (bmi < 18.5) {
        lines.push(`- BMI ${bmi.toFixed(1)}로 저체중 범위에 해당하여, 근성장을 위한 총 섭취 칼로리·단백질 섭취를 늘리는 방향을 권장합니다.`);
      } else {
        lines.push(`- BMI ${bmi.toFixed(1)}로 정상 범위이며, 현재 섭취 패턴 유지와 함께 운동 목표(근성장/체지방 감소)에 맞춰 미세 조정하는 방향을 권장합니다.`);
      }
    } else {
      lines.push("- 체성분 측정 기록이 없어 구체적 칼로리 권장이 어렵습니다. 인바디 측정을 먼저 진행해 주세요.");
    }

    lines.push("");
    lines.push("이 제안은 일반적인 가이드라인이며, 의학적 영양 상담을 대체하지 않습니다. 특정 질환이 있는 회원은 전문의·영양사와 상담을 권장합니다.");
    return lines.join("\n");
  }
}

export function getAiEngine(): AiEngine {
  // Swap point for a real GPT-backed engine later: if (process.env.OPENAI_API_KEY)
  // return new OpenAiEngine(); — until then, always the free rule-based engine.
  return new RuleBasedAiEngine();
}
