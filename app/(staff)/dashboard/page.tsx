import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-zinc-900">대시보드</h1>
      <p className="text-sm text-zinc-600">{session?.name}님, 환영합니다.</p>
    </div>
  );
}
