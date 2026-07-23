import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { saveInbodyResult } from "@/lib/services/inbody";

interface SaveBody {
  weightKg?: number;
  skeletalMuscleKg?: number;
  bodyFatMassKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  visceralFatLevel?: number;
  ocrRawText?: string;
  ocrConfidence?: number;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: memberId } = await params;
  const body = (await req.json().catch(() => null)) as SaveBody | null;
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const result = await saveInbodyResult({ memberId, ...body, recordedById: session.sub });
  await writeAuditLog({ userId: session.sub, action: "inbodyResult.create", entityType: "Member", entityId: memberId });

  return NextResponse.json({ id: result.id });
}
