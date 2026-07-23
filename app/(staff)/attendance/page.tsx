import Link from "next/link";
import { listMembers, listRecentAttendance } from "@/lib/services/members";
import { SESSION_TYPE_LABEL_KO, SESSION_TYPES } from "@/lib/types";
import { quickCheckInAction } from "./actions";

export default async function AttendancePage() {
  const [attendance, members] = await Promise.all([listRecentAttendance(), listMembers()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-zinc-900">출석</h1>

      <form action={quickCheckInAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 p-4">
        <div>
          <label className="text-xs text-zinc-500">회원</label>
          <select name="memberId" required className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">수업 유형</label>
          <select name="sessionType" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SESSION_TYPE_LABEL_KO[t]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          체크인
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">회원</th>
              <th className="px-4 py-2 font-medium">유형</th>
              <th className="px-4 py-2 font-medium">담당</th>
              <th className="px-4 py-2 font-medium">체크인 시각</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id} className="border-t border-zinc-100">
                <td className="px-4 py-2">
                  <Link href={`/members/${a.memberId}`} className="font-medium text-zinc-900 hover:underline">
                    {a.member.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {SESSION_TYPE_LABEL_KO[a.sessionType as keyof typeof SESSION_TYPE_LABEL_KO] ?? a.sessionType}
                </td>
                <td className="px-4 py-2 text-zinc-500">{a.staff?.name ?? "-"}</td>
                <td className="px-4 py-2 text-zinc-500">{a.checkedInAt.toLocaleString("ko-KR")}</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  출석 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
