import Link from "next/link";
import { listMembers } from "@/lib/services/members";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const members = await listMembers(q);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">회원 관리</h1>
        <Link href="/members/new" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          + 회원 등록
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="이름, 전화번호, 이메일로 검색"
          className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium">
          검색
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">연락처</th>
              <th className="px-4 py-2 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/members/${m.id}`} className="font-medium text-zinc-900 hover:underline">
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-600">{m.phone ?? "-"}</td>
                <td className="px-4 py-2 text-zinc-600">{m.joinedAt.toLocaleDateString("ko-KR")}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                  등록된 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
