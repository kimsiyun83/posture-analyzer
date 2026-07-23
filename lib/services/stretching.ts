import { prisma } from "@/lib/db";

export function addStretchLog(input: {
  memberId: string;
  bodyPart: string;
  intensity: number;
  romBefore?: number;
  romAfter?: number;
  painBefore?: number;
  painAfter?: number;
  notes?: string;
  trainerId?: string;
}) {
  return prisma.stretchLog.create({
    data: {
      memberId: input.memberId,
      bodyPart: input.bodyPart,
      intensity: input.intensity,
      romBefore: input.romBefore ?? null,
      romAfter: input.romAfter ?? null,
      painBefore: input.painBefore ?? null,
      painAfter: input.painAfter ?? null,
      notes: input.notes || null,
      trainerId: input.trainerId ?? null,
    },
  });
}

export function addRomRecord(input: {
  memberId: string;
  joint: string;
  movement: string;
  degreeBefore?: number;
  degreeAfter?: number;
  recordedById?: string;
}) {
  return prisma.romRecord.create({
    data: {
      memberId: input.memberId,
      joint: input.joint,
      movement: input.movement,
      degreeBefore: input.degreeBefore ?? null,
      degreeAfter: input.degreeAfter ?? null,
      recordedById: input.recordedById ?? null,
    },
  });
}
