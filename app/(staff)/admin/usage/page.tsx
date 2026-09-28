import Link from 'next/link';
import { redirect } from 'next/navigation';
import { portalAdmin } from '@/lib/customer';
import { prisma } from '@/lib/db';
import { dayWindow, koreanDay, previousDay } from '@/lib/traffic-date';

export const dynamic = 'force-dynamic';
const labels: Record<string, string> = { posture: '체형', balance: '한발서기', chair: '의자 일어서기', scratch: '어깨 유연성', shoulder: '어깨', elbow: '팔꿈치', desk: '업무 자세', inbody: '인바디' };
export default async function UsagePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  if (!await portalAdmin()) redirect('/login');
  let day = (await searchParams).day || previousDay();
  try { dayWindow(day); } catch { day = previousDay(); }
  if (day > koreanDay()) day = koreanDay();
  const { start, end } = dayWindow(day);
  const where = { createdAt: { gte: start, lt: end } };
  const [collection, traffic, signups, total, records, users, kinds] = await Promise.all([
    prisma.trafficCollection.findUnique({ where: { id: 'main' } }),
    prisma.$queryRaw<{ visitors: bigint; sessions: bigint; views: bigint }[]>`SELECT COUNT(DISTINCT "visitorHash") AS visitors, COUNT(*) AS sessions, COALESCE(SUM("pageViews"),0)::bigint AS views FROM "TrafficVisit" WHERE "day" = ${day}`,
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { createdAt: { lt: end } } }),
    prisma.customerRecord.count({ where }),
    prisma.customerRecord.groupBy({ by: ['customerId'], where }),
    prisma.customerRecord.groupBy({ by: ['kind'], where, _count: { _all: true } }),
  ]);
  const unavailable = !collection || collection.startedAt >= end;
  const partial = collection && collection.startedAt > start && collection.startedAt < end;
  const counts = traffic[0];
  const cards = [
    ['방문자 수 (브라우저 기준)', unavailable ? '집계 전 · 확인 불가' : `${counts.visitors}명`],
    ['접속 횟수', unavailable ? '집계 전 · 확인 불가' : `${counts.sessions}회`],
    ['페이지 조회 수', unavailable ? '집계 전 · 확인 불가' : `${counts.views}회`],
    ['신규 가입자', `${signups}명`], ['저장 이용자', `${users.length}명`],
    ['저장 검사 수', `${records}건`], ['누적 가입 고객', `${total}명`],
  ];
  return <main className="mx-auto max-w-4xl space-y-6 pb-16">
    <Link href="/admin" className="text-teal-700">← 관리자 홈</Link>
    <h1 className="text-2xl font-bold">일별 방문 · 가입 · 이용 통계</h1>
    <form className="flex flex-wrap items-end gap-3">
      <label className="grid gap-2">통계 날짜<input type="date" name="day" defaultValue={day} max={koreanDay()} className="rounded-lg border p-3" /></label>
      <button className="rounded-lg bg-teal-800 px-6 py-3 text-white">조회</button>
    </form>
    <p>{day} · 한국시간 00:00–23:59{day === koreanDay() ? ' (오늘 집계 진행 중)' : ''}</p>
    <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6">
      {collection ? <>접속 통계 수집 시작: {collection.startedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국시간). </> : '접속 통계 수집 설정을 확인해 주세요. '}
      {unavailable ? '이 날짜의 접속 통계는 수집 전이므로 확인할 수 없습니다.' : partial ? '이 날짜는 수집 시작 이후의 일부 시간만 포함합니다.' : '방문자 수는 같은 날 같은 브라우저의 중복 접속을 제외합니다.'}
    </div>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><h2 className="text-sm text-zinc-600">{label}</h2><p className="mt-2 text-xl font-bold">{value}</p></div>)}</section>
    <section className="rounded-xl border bg-white p-5"><h2 className="mb-3 font-bold">검사 종류별 저장 건수</h2>{kinds.length ? <ul className="space-y-2">{kinds.map(k => <li key={k.kind}>{labels[k.kind] || k.kind}: {k._count._all}건</li>)}</ul> : <p>해당 날짜에 저장된 검사 기록이 없습니다.</p>}</section>
    <div className="space-y-2 text-sm leading-6 text-zinc-600">
      <p>접속 횟수는 30분 동안 페이지 이동이 없거나 한국시간 날짜가 바뀌면 새로 집계합니다. 페이지 조회는 화면이 열린 뒤의 페이지 이동을 셉니다. 관리자·직원으로 로그인한 접속과 알려진 봇은 제외합니다.</p>
      <p>방문자는 실제 인원과 다를 수 있습니다. 다른 기기·브라우저, 쿠키 삭제·차단은 중복 집계될 수 있으며 추적 거부, 네트워크 오류는 누락될 수 있습니다.</p>
      <p>가입 및 이용 통계는 현재 보관 중인 고객과 저장 기록 기준입니다. 저장하지 않은 검사와 삭제된 기록은 포함하지 않습니다. 과거 인바디 결과를 올린 경우 검사일이 아닌 앱에 저장한 날짜로 집계합니다.</p>
    </div>
    <Link href="/admin/customers" className="text-teal-700 underline">고객별 검사 기록 보기</Link>
  </main>;
}
