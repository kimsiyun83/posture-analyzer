"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createReservation, updateReservationStatus } from "@/lib/services/reservations";
import type { SessionType } from "@/lib/types";

export async function createReservationAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberId = String(formData.get("memberId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const timeStr = String(formData.get("time") ?? "");
  if (!memberId || !dateStr || !timeStr) throw new Error("회원, 날짜, 시간은 필수입니다.");

  const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);
  const trainerId = String(formData.get("trainerId") ?? "");
  const duration = Number(formData.get("durationMinutes"));

  await createReservation({
    memberId,
    trainerId: trainerId || undefined,
    sessionType: String(formData.get("sessionType") ?? "PT") as SessionType,
    scheduledAt,
    durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    memo: String(formData.get("memo") ?? ""),
  });

  await writeAuditLog({ userId: session.sub, action: "reservation.create", entityType: "Member", entityId: memberId });
  revalidatePath("/reservations");
}

export async function updateReservationStatusAction(reservationId: string, status: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  await updateReservationStatus(reservationId, status);
  await writeAuditLog({ userId: session.sub, action: "reservation.updateStatus", entityType: "Reservation", entityId: reservationId, detail: { status } });
  revalidatePath("/reservations");
}
