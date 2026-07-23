import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PilatesEquipment, PilatesLevel } from "@/lib/types";

export interface PilatesExerciseEntry {
  name: string;
  detail?: string;
}

export function addPilatesRecord(input: {
  memberId: string;
  equipment: PilatesEquipment;
  level: PilatesLevel;
  exercises: PilatesExerciseEntry[];
  notes?: string;
  trainerId?: string;
}) {
  return prisma.pilatesRecord.create({
    data: {
      memberId: input.memberId,
      equipment: input.equipment,
      level: input.level,
      exercisesJson: input.exercises as unknown as Prisma.InputJsonValue,
      notes: input.notes || null,
      trainerId: input.trainerId ?? null,
    },
  });
}
