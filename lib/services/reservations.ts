import { prisma } from "@/lib/db";
import type { SessionType } from "@/lib/types";

export function listUpcomingReservations() {
  return prisma.reservation.findMany({
    where: { scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    include: { member: true, trainer: true },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });
}

export function createReservation(input: {
  memberId: string;
  trainerId?: string;
  sessionType: SessionType;
  scheduledAt: Date;
  durationMinutes?: number;
  memo?: string;
}) {
  return prisma.reservation.create({
    data: {
      memberId: input.memberId,
      trainerId: input.trainerId || null,
      sessionType: input.sessionType,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes ?? 60,
      memo: input.memo || null,
    },
  });
}

export function updateReservationStatus(id: string, status: string) {
  return prisma.reservation.update({ where: { id }, data: { status } });
}
