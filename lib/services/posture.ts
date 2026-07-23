import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { FrontResult, SideResult } from "@/lib/pose/metrics";
import type { ProgramType } from "@/lib/pose/programs";

export function savePostureResult(input: {
  memberId: string;
  programType: ProgramType;
  frontResult: FrontResult;
  sideResult: SideResult;
  recordedById?: string;
}) {
  // FrontResult/SideResult are plain data (strings/numbers only) so this is a safe
  // structural cast — Prisma's InputJsonValue just requires an index signature that
  // TypeScript's structural interfaces don't declare.
  const metricsJson = { front: input.frontResult, side: input.sideResult } as unknown as Prisma.InputJsonValue;

  return prisma.postureResult.create({
    data: {
      memberId: input.memberId,
      programType: input.programType,
      frontScore: input.frontResult.overallScore,
      sideScore: input.sideResult.overallScore,
      metricsJson,
      recordedById: input.recordedById ?? null,
    },
  });
}
