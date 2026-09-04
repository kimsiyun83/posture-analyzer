import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, getSessionCookieName } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const ADMIN_ONLY_PREFIXES = ["/admin", "/api/admin"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Posture analyzer + landing page stay public — the client-facing screening
  // tool doesn't require staff login.
  if (pathname === "/" || pathname.startsWith("/analyze")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/mediapipe") || pathname === "/favicon.ico") return true;
  // Called by Vercel Cron / an external scheduler, never by a logged-in staff
  // session — it authenticates itself via the CRON_SECRET bearer token checked
  // inside the route handler, not the staff session cookie.
  if (pathname === "/api/cron/naver-ads") return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(getSessionCookieName())?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && session.role !== "admin") {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mediapipe).*)"],
};
