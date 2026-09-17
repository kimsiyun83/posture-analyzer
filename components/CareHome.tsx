"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  House,
  ChartPie,
  Camera,
  Barbell,
  User,
  Bell,
  ArrowRight,
  PersonSimple,
  PersonSimpleWalk,
  Armchair,
  ArrowUpRight,
} from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  readRecords,
  RECORD_KEY,
  type AssessmentRecord,
  recommend,
} from "@/lib/assessment";
import { summarizeReport, METRIC_GUIDES } from "@/lib/pose/report-details";
import DetailedPostureReport from "./DetailedPostureReport";
import AssessmentExtra from "./AssessmentExtra";
export default function CareHome() {
  const [tab, setTab] = useState("home");
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [notice, setNotice] = useState(false);
  const [selected, setSelected] = useState<AssessmentRecord | null>(null);
  const [message, setMessage] = useState("");
  // Read browser-only records after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(readRecords());
  }, []);
  const latest = records[0];
  const summary = latest ? summarizeReport(latest.front, latest.side) : null;
  return (
    <div className="care-app">
      <header className="care-header">
        <Link href="/" className="care-logo">
          L<span>ULU</span>
          <small> CARE</small>
        </Link>
        <button
          aria-label="알림 보기"
          className="icon-button"
          onClick={() => setNotice(!notice)}
        >
          <Bell size={24} weight="fill" />
        </button>
      </header>
      {notice && (
        <div className="care-notice" role="status">
          새로운 알림이 없습니다. 같은 촬영 조건으로 내 몸의 변화를 기록해
          보세요.
        </div>
      )}
      <main className="care-main">
        {tab === "home" && (
          <>
            <section className="care-card score-card">
              <div className="section-label">
                내 몸의 정렬 지표 <span>POSTURE</span>
              </div>
              <div className="hero-score">
                {summary ? summary.score : "—"}
                <small>{summary ? "점" : "측정 전"}</small>
              </div>
              <p className="mint-message">
                {summary
                  ? "이번 기록을 기준으로 내 몸의 변화를 살펴보세요."
                  : "사진 4장으로, 내 몸을 알아가는 첫걸음"}
              </p>
              <div className="home-chart">
                {records.length ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart
                      data={[...records]
                        .reverse()
                        .map((r) => ({
                          date: new Date(r.date).toLocaleDateString("ko-KR"),
                          score: summarizeReport(r.front, r.side).score,
                        }))}
                    >
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip />
                      <Line
                        type="linear"
                        dataKey="score"
                        name="정렬 지표"
                        stroke="#0baa99"
                        strokeWidth={2}
                        dot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    <span className="empty-dot" />
                    <p>첫 측정을 기다리고 있어요</p>
                    <small>기록이 쌓이면 변화가 보여요</small>
                  </div>
                )}
              </div>
              <small className="muted">
                {latest
                  ? new Date(latest.date).toLocaleString("ko-KR")
                  : "사진 기반 참고 지표 · 의료 진단이 아닙니다"}
              </small>
            </section>
            <section className="care-card type-card">
              <img
                src="/illustrations/guide-character.webp"
                alt="내 몸의 기록을 안내하는 캐릭터"
              />
              <div>
                <h2>나의 유형</h2>
                {summary ? (
                  <div className="tags">
                    {summary.priorities.slice(0, 3).map((r) => (
                      <span key={r.key}>#{METRIC_GUIDES[r.key].title}</span>
                    ))}
                    {!summary.priorities.length && <span>#앱 참고 범위</span>}
                  </div>
                ) : (
                  <>
                    <p>
                      어떤 자세를
                      <br />
                      가지고 있을까요?
                    </p>
                    <span className="tag">#측정 후 확인해요</span>
                  </>
                )}
                <button className="text-link" onClick={() => setTab("reports")}>
                  리포트 보기 <ArrowUpRight />
                </button>
              </div>
            </section>
            <Link className="care-start" href="/analyze">
              <div>
                <small>KNOW YOUR BODY</small>
                <h2>지금, 내 몸 체크하기</h2>
                <p>정면부터 측면까지 차근차근</p>
              </div>
              <ArrowRight size={26} />
            </Link>
            <Link className="demo-link" href="/analyze/demo">
              데모 리포트 먼저 보기 <ArrowUpRight />
            </Link>
            <p className="bottom-note">
              검사 후 내 몸의 평가와 목표에 맞춰
              <br />
              적절한 강습을 함께 찾아드려요.
            </p>
          </>
        )}
        {tab === "reports" && (
          <>
            <h1>내 리포트</h1>
            <p className="muted">이 기기에 저장한 측정 기록입니다.</p>
            {selected ? (
              <>
                <button className="text-link" onClick={() => setSelected(null)}>
                  ← 목록으로
                </button>
                <AssessmentExtra
                  front={selected.front}
                  side={selected.side}
                  extra={selected}
                />
                <DetailedPostureReport
                  front={selected.front}
                  side={selected.side}
                  programType={recommend(selected).program}
                  dateLabel={new Date(selected.date).toLocaleString("ko-KR")}
                />
              </>
            ) : records.length ? (
              records.map((r) => (
                <button
                  className="care-card record-row"
                  key={r.id}
                  onClick={() => setSelected(r)}
                >
                  <span>
                    {new Date(r.date).toLocaleString("ko-KR")}
                    <small>정면 · 양측면 · 후면</small>
                  </span>
                  <strong>{summarizeReport(r.front, r.side).score}점 →</strong>
                </button>
              ))
            ) : (
              <div className="care-card empty-panel">
                <ChartPie size={40} />
                <h2>아직 기록이 없어요</h2>
                <p>검사 완료 후 ‘이 기기에 저장’을 눌러주세요.</p>
                <Link href="/analyze" className="care-primary">
                  첫 검사 시작하기
                </Link>
              </div>
            )}
          </>
        )}
        {tab === "programs" && (
          <>
            <h1>내 몸에 맞는 강습</h1>
            {latest ? (
              <section className="care-card">
                <span className="eyebrow">검사 후 상담 가이드</span>
                <h2>{recommend(latest).title}</h2>
                <p>{recommend(latest).reason}</p>
                <p className="muted">
                  사진으로 근력이나 유연성을 진단하지 않습니다. 최종 강습은
                  움직임 평가 후 결정하세요.
                </p>
              </section>
            ) : (
              <section className="care-card empty-panel">
                <Barbell size={40} />
                <h2>먼저, 내 몸을 알아볼까요?</h2>
                <p>
                  검사를 마치면 결과와 운동 목표를 함께 확인하고 강습을 제안해
                  드려요.
                </p>
                <Link href="/analyze" className="care-primary">
                  검사 시작하기
                </Link>
              </section>
            )}
            <Link href="/analyze/tests" className="care-card record-row">
              움직임 검사 더하기 <ArrowRight />
            </Link>
          </>
        )}
        {tab === "my" && (
          <>
            <h1>MY</h1>
            <section className="care-card">
              <h2>내 기록 관리</h2>
              <p>저장된 검사 {records.length}개</p>
              <p className="muted">
                사진은 이 기기의 기록에 저장하지 않습니다. 브라우저 데이터를
                지우면 기록도 삭제됩니다.
              </p>
              <button
                className="care-secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "이 기기의 체형·움직임 기록을 모두 삭제할까요?",
                    )
                  ) {
                    try {
                      localStorage.removeItem(RECORD_KEY);
                      localStorage.removeItem("lulu:movement:v1");
                      setRecords([]);
                      setSelected(null);
                      setMessage("기록을 삭제했습니다.");
                    } catch {
                      setMessage("기록을 삭제하지 못했습니다.");
                    }
                  }
                }}
              >
                기기 기록 삭제
              </button>
              <p role="status">{message}</p>
            </section>
            <Link className="care-card record-row" href="/members">
              직원 · 회원 관리 <ArrowUpRight />
            </Link>
          </>
        )}
      </main>
      <nav className="care-nav" aria-label="주요 메뉴">
        {[
          { key: "home", name: "홈", Icon: House },
          { key: "reports", name: "리포트", Icon: ChartPie },
        ].map(({ key, name, Icon }) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setSelected(null);
              window.scrollTo(0, 0);
            }}
            aria-current={tab === key ? "page" : undefined}
          >
            <Icon size={25} weight={tab === key ? "fill" : "regular"} />
            {name}
          </button>
        ))}
        <Link
          href="/analyze"
          className="camera-nav"
          aria-label="체형 촬영 시작"
        >
          <Camera size={30} weight="fill" />
        </Link>
        {[
          { key: "programs", name: "맞춤 강습", Icon: Barbell },
          { key: "my", name: "MY", Icon: User },
        ].map(({ key, name, Icon }) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              window.scrollTo(0, 0);
            }}
          >
            <Icon size={25} weight={tab === key ? "fill" : "regular"} />
            {name}
          </button>
        ))}
      </nav>
    </div>
  );
}
export function TestCatalog() {
  return (
    <div className="care-app">
      <header className="care-header">
        <Link href="/">← 홈</Link>
        <b>움직임 검사</b>
      </header>
      <main className="care-main">
        <h1>어떤 검사를 할까요?</h1>
        <p className="muted">처음이라면 전신 자세 분석부터 시작하세요.</p>
        <div className="care-notice">
          밝은 공간 · 몸의 라인이 보이는 복장 · 휴대폰 수평 맞추기
        </div>
        {[
          {
            name: "전신 자세 분석",
            desc: "4방향 촬영으로 정렬을 확인합니다.",
            href: "/analyze",
            Icon: PersonSimple,
          },
          {
            name: "한발 서기 균형 기록",
            desc: "직원과 함께 좌우 유지 시간을 기록합니다.",
            href: "/analyze/movement?test=balance",
            Icon: PersonSimpleWalk,
          },
          {
            name: "30초 의자 일어서기",
            desc: "30초 동안 직원이 확인한 횟수를 기록합니다.",
            href: "/analyze/movement?test=chair",
            Icon: Armchair,
          },
          {
            name: "어깨 스크래치 기록",
            desc: "직원이 확인한 좌우 손끝 간격을 입력합니다.",
            href: "/analyze/movement?test=scratch",
            Icon: PersonSimple,
          },
        ].map(({ name, desc, href, Icon }) => (
          <Link className="care-card test-row" href={href} key={name}>
            <div className="test-icon">
              <Icon size={40} />
            </div>
            <div>
              <h2>{name}</h2>
              <p>{desc}</p>
            </div>
            <ArrowRight />
          </Link>
        ))}
        <p className="bottom-note">
          움직임 검사는 보조 기록이며 자동 진단하지 않습니다.
        </p>
      </main>
    </div>
  );
}
