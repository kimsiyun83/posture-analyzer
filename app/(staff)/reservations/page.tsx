import { listUpcomingReservations } from "@/lib/services/reservations";
import { listMembers } from "@/lib/services/members";
import { listStaff } from "@/lib/services/admin";
import {
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABEL_KO,
  SESSION_TYPE_LABEL_KO,
  SESSION_TYPES,
} from "@/lib/types";
import { createReservationAction, updateReservationStatusAction } from "./actions";

export default async function ReservationsPage() {
  const [reservations, members, staff] = await Promise.all([listUpcomingReservations(), listMembers(), listStaff()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-zinc-900">예약 관리</h1>

      <form action={createReservationAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 p-4">
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
          <label className="text-xs text-zinc-500">트레이너</label>
          <select name="trainerId" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">미지정</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">유형</label>
          <select name="sessionType" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SESSION_TYPE_LABEL_KO[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">날짜</label>
          <input type="date" name="date" required className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">시간</label>
          <input type="time" name="time" required className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">시간(분)</label>
          <input
            type="number"
            name="durationMinutes"
            defaultValue={60}
            className="mt-0.5 w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500">메모</label>
          <input name="memo" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          예약 등록
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">일시</th>
              <th className="px-4 py-2 font-medium">회원</th>
              <th className="px-4 py-2 font-medium">트레이너</th>
              <th className="px-4 py-2 font-medium">유형</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">변경</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-4 py-2">{r.scheduledAt.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-2">{r.member.name}</td>
                <td className="px-4 py-2 text-zinc-500">{r.trainer?.name ?? "-"}</td>
                <td className="px-4 py-2 text-zinc-500">
                  {SESSION_TYPE_LABEL_KO[r.sessionType as keyof typeof SESSION_TYPE_LABEL_KO] ?? r.sessionType}
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {RESERVATION_STATUS_LABEL_KO[r.status as keyof typeof RESERVATION_STATUS_LABEL_KO] ?? r.status}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    {RESERVATION_STATUSES.filter((s) => s !== r.status).map((s) => (
                      <form key={s} action={updateReservationStatusAction.bind(null, r.id, s)}>
                        <button type="submit" className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600">
                          {RESERVATION_STATUS_LABEL_KO[s]}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  예정된 예약이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
