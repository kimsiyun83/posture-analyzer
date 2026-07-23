import { prisma } from "@/lib/db";
import { getAiEngine, type MemberAiContext } from "@/lib/ai/engine";
import type { AiReportType } from "@/lib/types";

async function buildMemberAiContext(memberId: string): Promise<MemberAiContext | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      painRecords: { orderBy: { recordedAt: "desc" }, take: 5 },
      attendance: { orderBy: { checkedInAt: "desc" }, take: 20 },
      postureResults: { orderBy: { measuredAt: "desc" }, take: 1 },
      bodyAssessments: { orderBy: { measuredAt: "desc" }, take: 1 },
      inbodyResults: { orderBy: { measuredAt: "desc" }, take: 1 },
    },
  });
  if (!member) return null;

  const latestInbody = member.inbodyResults[0];
  const latestAssessment = member.bodyAssessments[0];

  return {
    name: member.name,
    gender: member.gender,
    medicalHistory: member.medicalHistory,
    recentPainRecords: member.painRecords.map((p) => ({
      bodyPart: p.bodyPart,
      severity: p.severity,
      recordedAt: p.recordedAt,
    })),
    recentAttendanceCount: member.attendance.length,
    latestPostureResult: member.postureResults[0]
      ? {
          programType: member.postureResults[0].programType,
          frontScore: member.postureResults[0].frontScore,
          sideScore: member.postureResults[0].sideScore,
          measuredAt: member.postureResults[0].measuredAt,
        }
      : undefined,
    latestBodyAssessment:
      latestAssessment || latestInbody
        ? {
            weightKg: latestAssessment?.weightKg ?? latestInbody?.weightKg ?? null,
            bodyFatPercent: latestAssessment?.bodyFatPercent ?? latestInbody?.bodyFatPercent ?? null,
            muscleMassKg: latestAssessment?.muscleMassKg ?? latestInbody?.skeletalMuscleKg ?? null,
            bmi: latestAssessment?.bmi ?? latestInbody?.bmi ?? null,
          }
        : undefined,
  };
}

export async function generateAiReport(input: { memberId: string; type: AiReportType; generatedById?: string }) {
  const ctx = await buildMemberAiContext(input.memberId);
  if (!ctx) throw new Error("회원을 찾을 수 없습니다.");

  const engine = getAiEngine();
  let content: string;
  switch (input.type) {
    case "CONSULTATION_NOTE":
      content = engine.generateConsultationNote(ctx);
      break;
    case "EXERCISE_RECOMMENDATION":
      content = engine.recommendExercises(ctx);
      break;
    case "DIET_RECOMMENDATION":
      content = engine.recommendDiet(ctx);
      break;
    default:
      throw new Error("지원하지 않는 리포트 유형입니다.");
  }

  return prisma.aiReport.create({
    data: {
      memberId: input.memberId,
      type: input.type,
      content,
      engineUsed: engine.name,
      generatedById: input.generatedById ?? null,
    },
  });
}
