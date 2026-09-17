import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/members", label: "회원" },
  { href: "/reservations", label: "예약" },
  { href: "/attendance", label: "출석" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-6">
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
              </svg>
              홈으로
            </Link>
            <Link href="/dashboard" className="font-bold text-zinc-900">
              스튜디오 관리
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-zinc-600">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-zinc-900">
                  {item.label}
                </Link>
              ))}
              {session.role === "admin" && (
                <Link href="/admin" className="hover:text-zinc-900">
                  관리자
                </Link>
              )}
              {session.role === "admin" && (
                <Link href="/admin/ads" className="hover:text-zinc-900">
                  광고 자동화
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <Link href="/account" className="hover:text-zinc-900">
              {session.name} ({session.role === "admin" ? "관리자" : "트레이너"})
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
