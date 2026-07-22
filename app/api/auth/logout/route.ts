import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  await clearSessionCookie();
  if (session) await writeAuditLog({ userId: session.sub, action: "auth.logout" });
  return NextResponse.json({ ok: true });
}
