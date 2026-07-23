"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkIn } from "@/lib/services/members";
import type { SessionType } from "@/lib/types";

export async function quickCheckInAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new Error("회원을 선택해 주세요.");

  await checkIn({
    memberId,
    sessionType: String(formData.get("sessionType") ?? "PT") as SessionType,
    staffId: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "attendance.checkIn", entityType: "Member", entityId: memberId });
  revalidatePath("/attendance");
}
