import { prisma } from "@/lib/db";

export function saveInbodyResult(input: {
  memberId: string;
  weightKg?: number;
  skeletalMuscleKg?: number;
  bodyFatMassKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  visceralFatLevel?: number;
  ocrRawText?: string;
  ocrConfidence?: number;
  recordedById?: string;
}) {
  return prisma.inbodyResult.create({
    data: {
      memberId: input.memberId,
      weightKg: input.weightKg ?? null,
      skeletalMuscleKg: input.skeletalMuscleKg ?? null,
      bodyFatMassKg: input.bodyFatMassKg ?? null,
      bodyFatPercent: input.bodyFatPercent ?? null,
      bmi: input.bmi ?? null,
      visceralFatLevel: input.visceralFatLevel ?? null,
      ocrRawText: input.ocrRawText ?? null,
      ocrConfidence: input.ocrConfidence ?? null,
      recordedById: input.recordedById ?? null,
    },
  });
}
