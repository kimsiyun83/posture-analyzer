import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { savePostureResult } from "@/lib/services/posture";
import type { FrontResult, SideResult } from "@/lib/pose/metrics";
import type { ProgramType } from "@/lib/pose/programs";

interface SaveBody {
  programType: ProgramType;
  frontResult: FrontResult;
  sideResult: SideResult;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: memberId } = await params;
  const body = (await req.json().catch(() => null)) as SaveBody | null;
  if (!body?.programType || !body.frontResult || !body.sideResult) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await savePostureResult({
    memberId,
    programType: body.programType,
    frontResult: body.frontResult,
    sideResult: body.sideResult,
    recordedById: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "postureResult.create", entityType: "Member", entityId: memberId });

  return NextResponse.json({ id: result.id });
}
