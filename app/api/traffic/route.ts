import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomUUID } from 'node:crypto';
import { getSession } from '@/lib/auth';
import { sameOrigin } from '@/lib/customer';
import { prisma } from '@/lib/db';
import { koreanDay, publicTrafficPath } from '@/lib/traffic-date';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
const empty = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const uuid = (v?: string) => v && /^[0-9a-f-]{36}$/i.test(v) ? v : randomUUID();
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  if (req.headers.get('dnt') === '1' || req.headers.get('sec-gpc') === '1' || /bot|crawler|spider|headless|preview|facebookexternalhit/i.test(req.headers.get('user-agent') || '')) return empty();
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return empty();
  if (Number(req.headers.get('content-length') || 0) > 300) return new NextResponse(null, { status: 413 });
  const raw = await req.text();
  if (raw.length > 300) return new NextResponse(null, { status: 413 });
  let body; try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  if (!publicTrafficPath(body?.path)) return new NextResponse(null, { status: 400 });
  if (await getSession()) return empty(); // Logged-in staff traffic must not inflate customer visits.
  const secret = process.env.JWT_SECRET;
  if (!secret) return new NextResponse(null, { status: 503 });
  const visitor = uuid(req.cookies.get('lc_visitor')?.value);
  const session = uuid(req.cookies.get('lc_visit')?.value);
  const day = koreanDay();
  const hash = (purpose: string, value: string) => createHmac('sha256', secret).update(`${purpose}:${day}:${value}`).digest('hex');
  const visitorHash = hash('visitor', visitor), id = hash('visit', session);
  if (!checkRateLimit(`traffic:${visitorHash}`, 60, 60000).allowed) return new NextResponse(null, { status: 429 });
  try {
    await prisma.trafficVisit.upsert({ where: { id }, create: { id, day, visitorHash, pageViews: 1 }, update: { pageViews: { increment: 1 }, lastSeen: new Date() } });
  } catch {
    // Telemetry failure must not interrupt a measurement or login.
    console.error('traffic_write_failed');
    return new NextResponse(null, { status: 503 });
  }
  const res = empty();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  res.cookies.set('lc_visitor', visitor, { ...opts, maxAge: 30 * 86400 });
  res.cookies.set('lc_visit', session, { ...opts, maxAge: 1800 });
  return res;
}
