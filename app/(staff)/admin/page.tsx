import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats, listStaff } from "@/lib/services/admin";
import { SESSION_TYPE_LABEL_KO, RESERVATION_STATUS_LABEL_KO } from "@/lib/types";
import { createStaffAction, toggleStaffActiveAction } from "./actions";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const [stats, staff] = await Promise.all([getDashboardStats(), listStaff()]);

  return (
    <div className="flex flex-col gap-8 pb-16">
      <h1 className="text-xl font-bold text-zinc-900">관리자 대시보드</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="활성 회원" value={stats.activeMembers.toLocaleString("ko-KR")} />
        <StatCard label="이번 달 매출" value={`${stats.monthlyRevenue.toLocaleString("ko-KR")}원`} />
        <StatCard label="누적 매출" value={`${stats.totalRevenue.toLocaleString("ko-KR")}원`} />
        <StatCard label="이번 달 출석" value={`${stats.monthlyAttendanceCount.toLocaleString("ko-KR")}회`} />
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-zinc-900">오늘의 예약</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">시간</th>
                <th className="px-4 py-2 font-medium">회원</th>
                <th className="px-4 py-2 font-medium">트레이너</th>
                <th className="px-4 py-2 font-medium">유형</th>
                <th className="px-4 py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {stats.todaysReservations.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">
                    {r.scheduledAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2">{r.member.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{r.trainer?.name ?? "-"}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {SESSION_TYPE_LABEL_KO[r.sessionType as keyof typeof SESSION_TYPE_LABEL_KO] ?? r.sessionType}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {RESERVATION_STATUS_LABEL_KO[r.status as keyof typeof RESERVATION_STATUS_LABEL_KO] ?? r.status}
                  </td>
                </tr>
              ))}
              {stats.todaysReservations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    오늘 예약된 일정이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-zinc-900">강사·직원 관리</h2>
        <form action={createStaffAction} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 p-3">
          <MiniField label="이름" name="name" required />
          <MiniField label="이메일" name="email" type="email" required />
          <MiniField label="초기 비밀번호" name="password" type="password" required />
          <div>
            <label className="text-xs text-zinc-500">역할</label>
            <select name="role" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="trainer">트레이너</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <MiniField label="전문분야" name="specialty" placeholder="PT / 필라테스" />
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
            계정 생성
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 font-medium">이메일</th>
                <th className="px-4 py-2 font-medium">역할</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{s.email}</td>
                  <td className="px-4 py-2 text-zinc-500">{s.role === "admin" ? "관리자" : "트레이너"}</td>
                  <td className="px-4 py-2 text-zinc-500">{s.active ? "활성" : "비활성"}</td>
                  <td className="px-4 py-2">
                    <form action={toggleStaffActiveAction.bind(null, s.id, !s.active)}>
                      <button type="submit" className="text-xs text-zinc-500 underline">
                        {s.active ? "비활성화" : "활성화"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function MiniField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
