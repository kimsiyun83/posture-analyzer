import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { savePostureResult } from "@/lib/services/posture";
import type { FrontResult, SideResult } from "@/lib/pose/metrics";
import type { ProgramType } from "@/lib/pose/programs";

import { parseReportMetrics } from "@/lib/pose/report-details";

interface SaveBody {
  assessment?: {
    right: SideResult;
    back: { shoulder: number; hip: number };
    goal: string;
    discomfort: boolean;
  };
  programType: ProgramType;
  frontResult: FrontResult;
  sideResult: SideResult;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );

  const { id: memberId } = await params;
  const body = (await req.json().catch(() => null)) as SaveBody | null;
  if (
    !body ||
    !["pt", "pilates", "stretching"].includes(body.programType) ||
    !parseReportMetrics({ front: body.frontResult, side: body.sideResult })
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const extra = body.assessment;
  if (
    extra &&
    (!parseReportMetrics({ front: body.frontResult, side: extra.right }) ||
      !Number.isFinite(extra.back?.shoulder) ||
      !Number.isFinite(extra.back?.hip) ||
      !["balance", "strength", "mobility"].includes(extra.goal) ||
      typeof extra.discomfort !== "boolean")
  )
    return NextResponse.json(
      { error: "추가 검사 데이터가 올바르지 않습니다." },
      { status: 400 },
    );
  const result = await savePostureResult({
    assessment: extra
      ? {
          right: extra.right,
          back: extra.back,
          goal: extra.goal,
          discomfort: extra.discomfort,
          version: 2,
        }
      : undefined,
    memberId,
    programType: body.programType,
    frontResult: body.frontResult,
    sideResult: body.sideResult,
    recordedById: session.sub,
  });

  await writeAuditLog({
    userId: session.sub,
    action: "postureResult.create",
    entityType: "Member",
    entityId: memberId,
  });

  return NextResponse.json({ id: result.id });
}
