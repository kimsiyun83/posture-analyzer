import { prisma } from "@/lib/db";
import { hashPassword, type Role } from "@/lib/auth";

export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [activeMembers, monthlyRevenueAgg, totalRevenueAgg, monthlyAttendanceCount, todaysReservations] =
    await Promise.all([
      prisma.member.count({ where: { active: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startOfMonth } } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.attendance.count({ where: { checkedInAt: { gte: startOfMonth } } }),
      prisma.reservation.findMany({
        where: { scheduledAt: { gte: startOfToday, lt: endOfToday } },
        include: { member: true, trainer: true },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

  return {
    activeMembers,
    monthlyRevenue: monthlyRevenueAgg._sum.amount ?? 0,
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
    monthlyAttendanceCount,
    todaysReservations,
  };
}

export function listStaff() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createStaffAccount(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
  specialty?: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("이미 사용 중인 이메일입니다.");

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      specialty: input.specialty || null,
      phone: input.phone || null,
    },
  });
}

export function setStaffActive(userId: string, active: boolean) {
  return prisma.user.update({ where: { id: userId }, data: { active } });
}

export function getRevenueBySessionType(sinceDate: Date) {
  return prisma.payment.groupBy({
    by: ["method"],
    _sum: { amount: true },
    where: { paidAt: { gte: sinceDate } },
  });
}
