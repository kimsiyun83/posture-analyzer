"use client";
/* eslint-disable @next/next/no-img-element */
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { CustomerSave } from "@/components/CustomerAccess";
import { useSearchParams } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import PostureCanvas from "@/components/PostureCanvas";
import DetailedPostureReport from "@/components/DetailedPostureReport";
import { getPoseLandmarker } from "@/lib/pose/model";
import {
  computeFrontMetrics,
  computeSideMetrics,
  type FrontResult,
  type SideResult,
  formatReadingValue,
} from "@/lib/pose/metrics";
import { tiltFromLevel } from "@/lib/pose/math";
import type { PoseLandmarks } from "@/lib/pose/landmarks";
import {
  DIRECTIONS,
  checkedPixels,
  recommend,
  type Goal,
  type AssessmentRecord,
} from "@/lib/assessment";
interface Shot {
  dataUrl: string;
  landmarks: PoseLandmarks;
  front?: FrontResult;
  side?: SideResult;
  back?: { shoulder: number; hip: number };
}
export default function Page() {
  return (
    <Suspense>
      <Assessment />
    </Suspense>
  );
}
function Assessment() {
  const memberId = useSearchParams().get("memberId");
  const [stage, setStage] = useState<
    "prepare" | "capture" | "review" | "results"
  >("prepare");
  const [shots, setShots] = useState<Shot[]>([]);
  const [pending, setPending] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [example, setExample] = useState<number | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  function moveExample(step: number) {
    setExample((current) => current === null ? null :
      (current + step + DIRECTIONS.length) % DIRECTIONS.length);
  }
  const [goal, setGoal] = useState<Goal>("balance");
  const [discomfort, setDiscomfort] = useState(false);
  const [consent, setConsent] = useState(false);
  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [memberSaved, setMemberSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const index = shots.length;
  async function capture(dataUrl: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(
            new Error("사진을 읽지 못했습니다. JPG 또는 PNG를 선택해 주세요."),
          );
        img.src = dataUrl;
      });
      const model = await getPoseLandmarker();
      const detected = model.detect(img);
      if (detected.landmarks.length !== 1)
        throw new Error("한 사람의 전신이 보여야 합니다. 다시 촬영해 주세요.");
      const landmarks = detected.landmarks[0] as PoseLandmarks;
      const px = checkedPixels(
        landmarks,
        img.naturalWidth,
        img.naturalHeight,
        index,
      );
      const shot: Shot = { dataUrl, landmarks };
      if (index === 0) shot.front = computeFrontMetrics(px);
      else if (index === 2)
        shot.back = {
          shoulder: tiltFromLevel(px[11], px[12]),
          hip: tiltFromLevel(px[23], px[24]),
        };
      else shot.side = computeSideMetrics(px);
      setPending(shot);
      setStage("review");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "분석에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function next() {
    if (!pending) return;
    const all = [...shots, pending];
    setShots(all);
    setPending(null);
    if (all.length === 4) {
      setRecord({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        front: all[0].front!,
        side: all[3].side!,
        right: all[1].side!,
        back: all[2].back!,
        goal,
        discomfort,
      });
      setStage("results");
    } else setStage("capture");
    window.scrollTo(0, 0);
  }
  async function saveMember() {
    if (!record || !memberId || saving || memberSaved) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/members/${encodeURIComponent(memberId)}/posture`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programType: recommend(record).program,
            frontResult: record.front,
            sideResult: record.side,
            assessment: record,
          }),
        },
      );
      if (!res.ok)
        throw new Error(
          "회원 기록 저장에 실패했습니다. 로그인 상태를 확인해 주세요.",
        );
      setMemberSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className={stage === "results" ? "assessment-report-wrap" : "care-app"}
    >
      <header className="care-header">
        <Link href="/">← 홈</Link>
        <b>{stage === "results" ? "내 몸의 평가" : "체형 분석"}</b>
        <Link href="/analyze/tests">검사 목록</Link>
      </header>
      <main className={stage === "results" ? "assessment-report" : "care-main"}>
        {stage === "prepare" && (
          <>
            <span className="eyebrow">MY BODY CHECK</span>
            <h1>
              내 몸을 알아보는
              <br />
              가장 쉬운 시작
            </h1>
            <p className="muted">
              강습 선택은 검사 후에 해요.
              <br />
              먼저 네 방향에서 편안한 자세를 기록해 주세요.
            </p>
            <section className="care-card">
              <h2>촬영 전 확인해 주세요</h2>
              <ol className="prep-list">
                <li>밝은 공간에서 머리부터 발끝까지 나오게 해주세요.</li>
                <li>몸의 라인이 보이는 편안한 옷을 입고 신발을 벗어주세요.</li>
                <li>휴대폰을 수평으로 고정하고 평소처럼 서 주세요.</li>
                <li>같은 거리와 높이에서 네 방향을 촬영해 주세요.</li>
              </ol>
            </section>
            <section className="care-card">
              <h2>촬영은 총 4단계로 진행돼요</h2>
              <div className="direction-steps">
                {DIRECTIONS.map((d, i) => (
                  <span key={d}>
                    <b>{i + 1}</b>
                    {d}
                  </span>
                ))}
              </div>
              <button className="care-secondary" onClick={() => setExample(0)}>
                촬영 예시 이미지 보기
              </button>
            </section>
            <section className="care-card">
              <h2>어떤 변화를 원하시나요?</h2>
              <p className="muted">검사 후 상담 방향을 정할 때 참고해요.</p>
              <div className="goal-options">
                {(
                  [
                    ["balance", "자세 · 균형"],
                    ["strength", "근력 · 체력"],
                    ["mobility", "유연성 · 움직임"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    aria-pressed={goal === v}
                    onClick={() => setGoal(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={discomfort}
                  onChange={(e) => setDiscomfort(e.target.checked)}
                />
                현재 움직일 때 불편감이 있어요
              </label>
            </section>
            <label className="check-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              사진 기반 참고용 분석임을 확인했어요.
            </label>
            <p className="muted small">
              사진 분석은 브라우저에서 진행됩니다. 사진은 서버로 보내지 않으며
              화면을 나가면 사라집니다.
            </p>
            <button
              className="care-primary"
              disabled={!consent}
              onClick={() => setStage("capture")}
            >
              체형 분석 시작하기
            </button>
            <Link className="demo-link" href="/analyze/demo">
              데모 리포트 보기 →
            </Link>
          </>
        )}
        {(stage === "capture" || stage === "review") && (
          <>
            <div className="direction-steps">
              {DIRECTIONS.map((d, i) => (
                <span key={d} className={i <= index ? "done" : ""}>
                  <b>{i < index ? "✓" : i + 1}</b>
                  {d}
                </span>
              ))}
            </div>
            <h1>
              {index + 1}. {DIRECTIONS[index]} 촬영
            </h1>
            <p className="muted">
              {index === 0
                ? "카메라를 바라보고 양팔을 자연스럽게 내려주세요."
                : index === 2
                  ? "카메라에 등을 보이고 편안하게 서 주세요."
                  : index === 1
                    ? "오른쪽 어깨가 카메라를 향하게 서 주세요."
                    : "왼쪽 어깨가 카메라를 향하게 서 주세요."}
            </p>
            <button className="text-link" onClick={() => setExample(index)}>
              촬영 예시 확인하기 ↗
            </button>
            {(stage === "capture" || stage === "review") && (
              <div hidden={stage !== "capture" || busy}>
                <CameraCapture
                  view={index === 2 ? "back" : index === 1 || index === 3 ? "side" : "front"}
                  onCapture={capture}
                />
                <label className="care-secondary upload-label">
                  이미 촬영한 사진 선택
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 15 * 1024 * 1024) {
                        setError("15MB 이하의 사진을 선택해 주세요.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => capture(String(reader.result));
                      reader.onerror = () =>
                        setError("사진을 읽지 못했습니다.");
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            )}
            {busy && (
              <div role="status" className="care-card empty-panel">
                <h2>관절 위치를 확인하고 있어요</h2>
                <p>
                  첫 검사에서는 분석 모델을 불러오는 데 시간이 걸릴 수 있어요.
                </p>
              </div>
            )}
            {stage === "review" && pending && (
              <>
                <img
                  className="capture-preview"
                  src={pending.dataUrl}
                  alt={`${DIRECTIONS[index]} 촬영 확인`}
                />
                <p>사진의 방향과 전신이 올바르게 보이는지 확인해 주세요.</p>
                <button className="care-primary" onClick={next}>
                  {index === 3 ? "내 몸의 평가 보기" : "확인하고 다음 촬영"}
                </button>
                <button
                  className="care-secondary"
                  onClick={() => {
                    setPending(null);
                    setStage("capture");
                  }}
                >
                  다시 촬영하기
                </button>
              </>
            )}
          </>
        )}
        {stage === "results" && record && (
          <>
            <div className="report-photo-grid">
              {shots.map((shot, i) => (
                <figure key={i}>
                  {i === 2 ? (
                    <img src={shot.dataUrl} alt="후면 촬영 사진" />
                  ) : (
                    <PostureCanvas
                      imageSrc={shot.dataUrl}
                      landmarks={shot.landmarks}
                      view={i === 0 ? "front" : "side"}
                      facing={shot.side?.facing}
                    />
                  )}
                  <figcaption>{DIRECTIONS[i]}</figcaption>
                </figure>
              ))}
            </div>
            <section className="care-card crosscheck">
              <h2>네 방향 교차 확인</h2>
              <p>
                아래 값은 좌·우 촬영을 비교하기 위한 참고값입니다. 촬영 방향에
                따른 차이를 질환으로 해석하지 않습니다.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>확인 항목</th>
                    <th>정면 / 오른쪽</th>
                    <th>후면 / 왼쪽</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>어깨 수평 기울기</td>
                    <td>{record.front.shoulderTilt.value.toFixed(1)}°</td>
                    <td>{record.back.shoulder.toFixed(1)}°</td>
                  </tr>
                  <tr>
                    <td>골반 수평 기울기</td>
                    <td>{record.front.hipTilt.value.toFixed(1)}°</td>
                    <td>{record.back.hip.toFixed(1)}°</td>
                  </tr>
                  {(
                    [
                      "forwardHeadAngle",
                      "shoulderPlumbOffset",
                      "hipPlumbOffset",
                      "kneePlumbOffset",
                    ] as const
                  ).map((k) => (
                    <tr key={k}>
                      <td>{record.side[k].label.split(" (")[0]}</td>
                      <td>{formatReadingValue(record.right[k])}</td>
                      <td>{formatReadingValue(record.side[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">
                종합 지표는 정면과 왼쪽 측면의 기존 9항목으로 계산합니다.
                후면·오른쪽 측면은 교차 확인용으로 점수에 중복 반영하지
                않습니다.
              </p>
            </section>
            <section className="care-card recommendation">
              <span className="eyebrow">검사 후 · 나에게 맞는 강습 찾기</span>
              <h2>{recommend(record).title}</h2>
              <p>{recommend(record).reason}</p>
              <p className="muted">
                추천은 선택한 목표와 정렬 관찰 항목을 함께 보는 상담 안내입니다.
                아래 결과의 관찰 항목을 강사와 확인한 후 PT · 필라테스 · 패시브
                스트레칭 중 최종 선택하세요.
              </p>
            </section>
            <DetailedPostureReport
              front={record.front}
              side={record.side}
              programType={recommend(record).program}
              dateLabel={new Date(record.date).toLocaleString("ko-KR")}
            />
            <div className="save-actions">
              <CustomerSave kind="posture" data={record} clientId={record.id} />
              {memberId && (
                <button
                  className="care-secondary"
                  disabled={memberSaved || saving}
                  onClick={saveMember}
                >
                  {memberSaved
                    ? "✓ 회원 기록에 저장됨"
                    : saving
                      ? "저장 중…"
                      : "회원 기록에도 저장"}
                </button>
              )}
              <Link href="/analyze/tests" className="care-secondary">
                움직임 검사 더하기
              </Link>
              <Link href="/" className="demo-link">
                홈으로 돌아가기
              </Link>
            </div>
          </>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </main>
      {example !== null && (
        <div className="example-backdrop" onClick={() => setExample(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="촬영 예시 이미지"
            className="example-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setExample(null);
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                moveExample(e.key === "ArrowLeft" ? -1 : 1);
              }
              if (e.key === "Tab") {
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll("button"),
                );
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <header>
              <h2>촬영 예시 이미지</h2>
              <button
                autoFocus
                aria-label="촬영 예시 닫기"
                onClick={() => setExample(null)}
              >
                ×
              </button>
            </header>
            <h3 aria-live="polite">{DIRECTIONS[example]} <span className="example-count">{example + 1} / {DIRECTIONS.length}</span></h3>
            <div className="example-slider">
            <div className="example-picture"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                swipeStart.current = e.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
              }}
              onTouchMove={(e) => {
                if (e.touches.length !== 1) swipeStart.current = null;
              }}
              onTouchCancel={() => { swipeStart.current = null; }}
              onTouchEnd={(e) => {
                const start = swipeStart.current;
                swipeStart.current = null;
                const end = e.changedTouches[0];
                if (!start || !end) return;
                const dx = end.clientX - start.x;
                const dy = end.clientY - start.y;
                if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) moveExample(dx < 0 ? 1 : -1);
              }}
            >
              <img
                draggable={false}
                src="/illustrations/capture-directions.webp"
                style={{ transform: `translateX(-${example * 25}%)` }}
                alt={`${DIRECTIONS[example]} 전신 촬영 안내용 생성 이미지`}
              />
            </div>
            <button type="button" className="example-arrow example-arrow-prev" aria-label="이전 촬영 예시" onClick={() => moveExample(-1)}>‹</button>
            <button type="button" className="example-arrow example-arrow-next" aria-label="다음 촬영 예시" onClick={() => moveExample(1)}>›</button>
            </div>
            <p className="example-swipe-hint">사진을 좌우로 밀어 넘겨보세요</p>
            <div className="example-dots">
              {DIRECTIONS.map((d, i) => (
                <button
                  key={d}
                  aria-label={`${d} 예시`}
                  aria-pressed={example === i}
                  onClick={() => setExample(i)}
                />
              ))}
            </div>
            <small>촬영 안내용 생성 이미지</small>
          </section>
        </div>
      )}
    </div>
  );
}
