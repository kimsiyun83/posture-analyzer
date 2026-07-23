import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";

const LOGIN_ATTEMPT_LIMIT = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `login:${ip}:${email}`;
  const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS);
  if (!allowed) {
    const retryAfterSec = Math.ceil((retryAfterMs ?? 0) / 1000);
    return NextResponse.json(
      { error: `로그인 시도가 너무 많습니다. ${retryAfterSec}초 후 다시 시도해 주세요.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await setSessionCookie({ sub: user.id, role: user.role as "admin" | "trainer", name: user.name, email: user.email });
  await writeAuditLog({ userId: user.id, action: "auth.login" });

  return NextResponse.json({ id: user.id, name: user.name, role: user.role });
}
