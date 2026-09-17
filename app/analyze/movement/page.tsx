"use client";
/* Browser-only saved records are loaded after hydration. */
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {CustomerSave} from "@/components/CustomerAccess";
export default function Page() {
  return (
    <Suspense>
      <Movement />
    </Suspense>
  );
}
function Movement() {
  const kind = useSearchParams().get("test") || "balance";
  const chair = kind === "chair",
    scratch = kind === "scratch";
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [side, setSide] = useState<"left" | "right">("left");
  const [complete, setComplete] = useState<{id:string;data:{left:number;right:number;count:number;seconds:number;source:string}}|null>(null);
  const [saved, setSaved] = useState(false);
  const start = useRef(0);
  useEffect(() => {
    if (!running) return;
    start.current = performance.now() - seconds * 1000;
    const timer = setInterval(() => {
      const next = (performance.now() - start.current) / 1000;
      if (chair && next >= 30) {
        setSeconds(30);
        setRunning(false);
      } else setSeconds(next);
    }, 100);
    return () => clearInterval(timer);
  }, [running, chair]); // eslint-disable-line react-hooks/exhaustive-deps
  function stop() {
    setRunning(false);
    if (!chair) (side === "left" ? setLeft : setRight)(seconds.toFixed(1));
  }
  const valid =
    scratch || !chair
      ? left.trim() !== "" &&
        right.trim() !== "" &&
        [left, right].every(
          (v) =>
            Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 999,
        )
      : seconds >= 30;
  return (
    <div className="care-app">
      <header className="care-header">
        <Link href="/analyze/tests">← 검사 목록</Link>
        <b>움직임 기록</b>
      </header>
      <main className="care-main">
        <span className="eyebrow">직원 확인 · 수동 기록</span>
        <h1>
          {chair
            ? "30초 의자 일어서기"
            : scratch
              ? "어깨 스크래치 기록"
              : "한발 서기 균형 기록"}
        </h1>
        <section className="care-card">
          <h2>함께 확인해 주세요</h2>
          <p>
            {chair
              ? "움직이지 않는 의자를 준비하고 직원이 곁에서 확인해 주세요. 시작 버튼을 누른 뒤 완전히 일어선 횟수를 직원이 + 버튼으로 기록합니다."
              : scratch
                ? "등 뒤에서 손을 뻗었을 때 손끝 사이의 간격을 직원이 줄자로 확인합니다. 손이 닿으면 0cm로 기록하세요. 좌우를 같은 조건으로 비교합니다."
                : "직원이 옆에서 지켜보는 안전한 공간에서 진행하세요. 왼발·오른발로 각각 선 시간을 기록합니다. 발이 닿거나 지지가 필요하면 정지 버튼을 누르세요."}
          </p>
          <p className="muted small">
            불편감이 있으면 멈추고 담당자와 확인하세요. 자동 인식이나 임상
            정상치 판정 기능이 아닙니다.
          </p>
        </section>
        {!scratch && (
          <section className="care-card empty-panel">
            {!chair && (
              <div className="goal-options">
                {(["left", "right"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={running}
                    aria-pressed={side === s}
                    onClick={() => {
                      setSide(s);
                      setSeconds(0);
                      setSaved(false);setComplete(null);
                    }}
                  >
                    {s === "left" ? "왼발" : "오른발"}
                  </button>
                ))}
              </div>
            )}
            <div className="hero-score">
              {seconds.toFixed(1)}
              <small>초</small>
            </div>
            {chair && (
              <>
                <h2>{count}회</h2>
                <div className="goal-options">
                  <button
                    disabled={!running || count === 0}
                    onClick={() => setCount((c) => Math.max(0, c - 1))}
                  >
                    − 1회
                  </button>
                  <button
                    disabled={!running}
                    onClick={() => setCount((c) => c + 1)}
                  >
                    + 1회 기록
                  </button>
                </div>
              </>
            )}
            <button
              className="care-primary"
              disabled={chair && seconds >= 30}
              onClick={() => {
                setSaved(false);setComplete(null);
                if (running) stop();
                else setRunning(true);
              }}
            >
              {running ? "정지 · 기록" : "시작"}
            </button>
            <button
              className="care-secondary"
              onClick={() => {
                setRunning(false);
                setSeconds(0);
                setCount(0);
                setSaved(false);setComplete(null);
                setComplete(null);
              }}
            >
              타이머 초기화
            </button>
          </section>
        )}
        {!chair && (
          <section className="care-card">
            <h2>좌우 비교 기록</h2>
            {(["left", "right"] as const).map((s) => (
              <label className="check-label" key={s}>
                {s === "left" ? "왼쪽" : "오른쪽"}{" "}
                {scratch ? "손끝 간격 (cm)" : "유지 시간 (초)"}
                <input
                  style={{
                    width: "85px",
                    border: "1px solid #ccc",
                    padding: "10px",
                    height: "auto",
                  }}
                  type="number"
                  min="0"
                  max="999"
                  step="0.1"
                  value={s === "left" ? left : right}
                  onChange={(e) => {
                    (s === "left" ? setLeft : setRight)(e.target.value);
                    setSaved(false);setComplete(null);
                  }}
                />
              </label>
            ))}
            {valid && (
              <p>
                좌우 차이 {Math.abs(Number(left) - Number(right)).toFixed(1)}
                {scratch ? "cm" : "초"} · 측정 조건도 함께 확인하세요.
              </p>
            )}
          </section>
        )}
        <button
          className="care-primary"
          disabled={!valid || running || saved}
          onClick={() => {
            setComplete({id:crypto.randomUUID(),data:{left:Number(left),right:Number(right),count,seconds:chair?30:seconds,source:"manual"}});
            setSaved(true);
          }}
        >
          {saved ? "✓ 저장 완료" : "검사 완료 · 계정에 저장"}
        </button>
        {complete && <CustomerSave kind={kind} data={complete.data} clientId={complete.id}/>}
        <Link className="care-secondary" href="/customer">내 전체 검사 기록</Link>
      </main>
    </div>
  );
}
