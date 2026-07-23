import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface ExerciseSet {
  reps: number;
  weightKg?: number;
  rpe?: number;
}

export function addExerciseLog(input: {
  memberId: string;
  exerciseName: string;
  sets: ExerciseSet[];
  notes?: string;
  trainerId?: string;
}) {
  return prisma.exerciseLog.create({
    data: {
      memberId: input.memberId,
      exerciseName: input.exerciseName,
      setsJson: input.sets as unknown as Prisma.InputJsonValue,
      notes: input.notes || null,
      trainerId: input.trainerId ?? null,
    },
  });
}

export function addPersonalRecord(input: { memberId: string; exerciseName: string; value: number; unit: string }) {
  return prisma.personalRecord.create({
    data: {
      memberId: input.memberId,
      exerciseName: input.exerciseName,
      value: input.value,
      unit: input.unit,
    },
  });
}
