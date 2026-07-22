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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-zinc-900">
              스튜디오 관리
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600">
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
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span>
              {session.name} ({session.role === "admin" ? "관리자" : "트레이너"})
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
