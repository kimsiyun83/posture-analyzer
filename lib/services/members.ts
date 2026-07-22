import { prisma } from "@/lib/db";
import type { Gender, PaymentMethod, SessionType } from "@/lib/types";

export interface CreateMemberInput {
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string; // yyyy-mm-dd
  gender?: Gender;
  memo?: string;
  medicalHistory?: string;
  createdByUserId?: string;
}

export function listMembers(query?: string) {
  return prisma.member.findMany({
    where: query
      ? {
          active: true,
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : { active: true },
    orderBy: { name: "asc" },
  });
}

export function getMemberDetail(id: string) {
  return prisma.member.findUnique({
    where: { id },
    include: {
      painRecords: { orderBy: { recordedAt: "desc" }, take: 20 },
      packages: { orderBy: { startDate: "desc" } },
      payments: { orderBy: { paidAt: "desc" }, take: 20 },
      attendance: { orderBy: { checkedInAt: "desc" }, take: 20 },
      postureResults: { orderBy: { measuredAt: "desc" }, take: 10 },
      bodyAssessments: { orderBy: { measuredAt: "desc" }, take: 10 },
      inbodyResults: { orderBy: { measuredAt: "desc" }, take: 10 },
      romRecords: { orderBy: { measuredAt: "desc" }, take: 10 },
      exerciseLogs: { orderBy: { sessionDate: "desc" }, take: 10 },
      personalRecords: { orderBy: { achievedAt: "desc" }, take: 10 },
      pilatesRecords: { orderBy: { classDate: "desc" }, take: 10 },
      stretchLogs: { orderBy: { sessionDate: "desc" }, take: 10 },
      aiReports: { orderBy: { generatedAt: "desc" }, take: 10 },
      reservations: { orderBy: { scheduledAt: "desc" }, take: 10 },
    },
  });
}

export function createMember(input: CreateMemberInput) {
  return prisma.member.create({
    data: {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      gender: input.gender ?? null,
      memo: input.memo || null,
      medicalHistory: input.medicalHistory || null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

export function updateMember(id: string, input: Partial<CreateMemberInput>) {
  return prisma.member.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.birthDate !== undefined ? { birthDate: input.birthDate ? new Date(input.birthDate) : null } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.memo !== undefined ? { memo: input.memo || null } : {}),
      ...(input.medicalHistory !== undefined ? { medicalHistory: input.medicalHistory || null } : {}),
    },
  });
}

export function addPainRecord(input: {
  memberId: string;
  bodyPart: string;
  description?: string;
  severity: number;
  recordedById?: string;
}) {
  return prisma.painRecord.create({
    data: {
      memberId: input.memberId,
      bodyPart: input.bodyPart,
      description: input.description || null,
      severity: input.severity,
      recordedById: input.recordedById ?? null,
    },
  });
}

export function addPackage(input: {
  memberId: string;
  name: string;
  sessionType: SessionType | "MIXED";
  totalSessions?: number;
  price: number;
  endDate?: string;
}) {
  return prisma.membershipPackage.create({
    data: {
      memberId: input.memberId,
      name: input.name,
      sessionType: input.sessionType,
      totalSessions: input.totalSessions ?? null,
      remainingSessions: input.totalSessions ?? null,
      price: input.price,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
}

export function addPayment(input: {
  memberId: string;
  packageId?: string;
  amount: number;
  method: PaymentMethod;
  memo?: string;
  recordedById?: string;
}) {
  return prisma.payment.create({
    data: {
      memberId: input.memberId,
      packageId: input.packageId || null,
      amount: input.amount,
      method: input.method,
      memo: input.memo || null,
      recordedById: input.recordedById ?? null,
    },
  });
}

export async function checkIn(input: { memberId: string; sessionType: SessionType; staffId?: string; packageId?: string }) {
  const attendance = await prisma.attendance.create({
    data: {
      memberId: input.memberId,
      sessionType: input.sessionType,
      staffId: input.staffId ?? null,
    },
  });
  if (input.packageId) {
    await prisma.membershipPackage.updateMany({
      where: { id: input.packageId, remainingSessions: { gt: 0 } },
      data: { remainingSessions: { decrement: 1 } },
    });
  }
  return attendance;
}
