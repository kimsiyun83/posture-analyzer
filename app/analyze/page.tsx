"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CameraCapture from "@/components/CameraCapture";
import PostureCanvas from "@/components/PostureCanvas";
import { ReadingRow, ScoreGauge } from "@/components/ResultsReport";
import ProgramFocusPanel from "@/components/ProgramFocusPanel";
import { getPoseLandmarker } from "@/lib/pose/model";
import { computeFrontMetrics, computeSideMetrics, type FrontResult, type SideResult } from "@/lib/pose/metrics";
import type { PoseLandmarks } from "@/lib/pose/landmarks";
import { PROGRAM_META, PROGRAM_ORDER, type ProgramType } from "@/lib/pose/programs";
import { buildReportCanvas, canvasToPdfBlob, canvasToPngBlob, openBlob, shareBlob } from "@/lib/report";

type Step = "select-program" | "front-capture" | "side-capture" | "analyzing" | "results" | "error";

interface Shot {
  dataUrl: string;
  landmarks: PoseLandmarks;
}

// Persisted so an accidental back-navigation or reload doesn't wipe photos already
// captured — restored on mount, cleared on an explicit reset. Only the small,
// JSON-serializable pieces are kept (not the report canvas/blob, which rebuild
// automatically once results are restored).
const STORAGE_KEY = "posture-analyzer:session-v1";

interface PersistedSession {
  programType: ProgramType | null;
  frontShot: Shot | null;
  sideShot: Shot | null;
  frontResult: FrontResult | null;
  sideResult: SideResult | null;
}

// Derived rather than stored directly: transient steps ("analyzing", "error") would
// otherwise restore into a dead-end with no in-flight work to resolve them.
function deriveStep(s: PersistedSession): Step {
  if (s.frontShot && s.frontResult && s.sideShot && s.sideResult && s.programType) return "results";
  if (s.frontShot && s.frontResult && s.programType) return "side-capture";
  if (s.programType) return "front-capture";
  return "select-program";
}

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function savePersistedSession(data: PersistedSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full/unavailable (e.g. private browsing) — not critical, just skip
  }
}

function clearPersistedSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function AnalyzePage() {
  const [step, setStep] = useState<Step>("select-program");
  // Once true, the camera stays mounted (just hidden) for the rest of the page's
  // lifetime, even across "새로 측정하기" resets and errors — getUserMedia should
  // only ever be requested once per visit, otherwise the browser/OS permission
  // prompt can resurface on every capture cycle.
  const [cameraActivated, setCameraActivated] = useState(false);
  const [programType, setProgramType] = useState<ProgramType | null>(null);
  const [frontShot, setFrontShot] = useState<Shot | null>(null);
  const [sideShot, setSideShot] = useState<Shot | null>(null);
  const [frontResult, setFrontResult] = useState<FrontResult | null>(null);
  const [sideResult, setSideResult] = useState<SideResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportDataUrl, setReportDataUrl] = useState<string | null>(null);
  const [reportPngBlob, setReportPngBlob] = useState<Blob | null>(null);
  const [reportBuildError, setReportBuildError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "building" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "sharing" | "error">("idle");
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Restore in-progress work once on mount (covers back/forward navigation and
  // accidental reloads — this component fully remounts in both cases, wiping
  // in-memory state, but sessionStorage survives). This has to run as an effect
  // rather than a useState lazy initializer: sessionStorage isn't available during
  // Next's server render, so seeding state from it synchronously would make the
  // server-rendered HTML and the client's first render disagree (hydration error).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadPersistedSession();
    if (!saved) return;
    const restoredStep = deriveStep(saved);
    if (restoredStep === "select-program") return;
    setProgramType(saved.programType);
    setFrontShot(saved.frontShot);
    setSideShot(saved.sideShot);
    setFrontResult(saved.frontResult);
    setSideResult(saved.sideResult);
    setStep(restoredStep);
    if (restoredStep === "front-capture" || restoredStep === "side-capture") setCameraActivated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (step === "select-program") return;
    savePersistedSession({ programType, frontShot, sideShot, frontResult, sideResult });
  }, [step, programType, frontShot, sideShot, frontResult, sideResult]);

  async function detect(dataUrl: string): Promise<PoseLandmarks> {
    const landmarker = await getPoseLandmarker();
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = dataUrl;
    });
    const result = landmarker.detect(img);
    if (!result.landmarks[0]) {
      throw new Error("사진에서 사람을 인식하지 못했습니다. 몸 전체가 잘 보이도록 다시 촬영해 주세요.");
    }
    return result.landmarks[0] as PoseLandmarks;
  }

  async function handleFrontCapture(dataUrl: string) {
    setStep("analyzing");
    try {
      const landmarks = await detect(dataUrl);
      setFrontShot({ dataUrl, landmarks });
      setFrontResult(computeFrontMetrics(landmarks));
      setStep("side-capture");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStep("error");
    }
  }

  async function handleSideCapture(dataUrl: string) {
    setStep("analyzing");
    try {
      const landmarks = await detect(dataUrl);
      setSideShot({ dataUrl, landmarks });
      setSideResult(computeSideMetrics(landmarks));
      setStep("results");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStep("error");
    }
  }

  function reset() {
    setFrontShot(null);
    setSideShot(null);
    setFrontResult(null);
    setSideResult(null);
    setErrorMsg(null);
    setProgramType(null);
    setReportDataUrl(null);
    setReportPngBlob(null);
    setReportBuildError(null);
    setShowReportModal(false);
    setPdfState("idle");
    setShareState("idle");
    setActionErrorMsg(null);
    reportCanvasRef.current = null;
    clearPersistedSession();
    setStep("select-program");
  }

  // Build the report image proactively as soon as results are ready, rather than
  // inside the save button's click handler. navigator.share() must fire close to
  // the user gesture that triggered it — Safari revokes the permission if too much
  // async work (loading two photos, drawing the whole composite) happens first.
  useEffect(() => {
    if (step !== "results" || !frontShot || !sideShot || !frontResult || !sideResult || !programType) return;
    let cancelled = false;
    (async () => {
      try {
        const canvas = await buildReportCanvas({
          frontShot,
          sideShot,
          frontResult,
          sideResult,
          programType,
          dateLabel: new Date().toLocaleDateString("ko-KR"),
        });
        if (cancelled) return;
        reportCanvasRef.current = canvas;
        setReportDataUrl(canvas.toDataURL("image/png"));
        const blob = await canvasToPngBlob(canvas);
        if (!cancelled) setReportPngBlob(blob);
      } catch (e) {
        if (!cancelled) setReportBuildError(e instanceof Error ? e.message : "리포트 생성에 실패했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, frontShot, sideShot, frontResult, sideResult, programType]);

  async function handleShare() {
    if (!reportPngBlob) return;
    setShareState("sharing");
    setActionErrorMsg(null);
    try {
      const shared = await shareBlob(reportPngBlob, `posture-report-${Date.now()}.png`);
      if (!shared) openBlob(reportPngBlob);
      setShareState("idle");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setShareState("idle");
        return;
      }
      setActionErrorMsg(e instanceof Error ? e.message : "공유에 실패했습니다. 아래 이미지를 길게 눌러 저장해 주세요.");
      setShareState("error");
    }
  }

  function handleOpenPng() {
    if (!reportPngBlob) return;
    openBlob(reportPngBlob);
  }

  async function handleOpenPdf() {
    if (!reportCanvasRef.current) return;
    setPdfState("building");
    setActionErrorMsg(null);
    try {
      const pdfBlob = await canvasToPdfBlob(reportCanvasRef.current);
      openBlob(pdfBlob);
      setPdfState("idle");
    } catch (e) {
      setActionErrorMsg(e instanceof Error ? e.message : "PDF 생성에 실패했습니다.");
      setPdfState("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 처음으로
        </Link>
        <StepIndicator step={step} />
      </header>

      {step === "select-program" && (
        <ProgramSelect
          onSelect={(type) => {
            setProgramType(type);
            setCameraActivated(true);
            setStep("front-capture");
          }}
        />
      )}

      {/* Mounted once (on first program selection) and kept mounted — just hidden via
          CSS — for the rest of the page's lifetime, including across "새로 측정하기"
          resets and analysis errors. getUserMedia is only ever requested once per
          visit; unmounting/remounting between capture cycles was re-triggering the
          browser's camera permission prompt on every new client measurement. */}
      {cameraActivated && (
        <div className={step === "front-capture" || step === "side-capture" ? "contents" : "hidden"}>
          <Section
            title={step === "side-capture" ? "2. 측면 사진 촬영" : "1. 정면 사진 촬영"}
            desc={
              step === "side-capture"
                ? "몸의 옆면(귀·어깨·골반·무릎·발목)이 카메라에 일직선으로 보이게 서 주세요."
                : "양팔을 자연스럽게 내리고 정면을 보고 서 주세요."
            }
          >
            <CameraCapture
              view={step === "side-capture" ? "side" : "front"}
              onCapture={step === "side-capture" ? handleSideCapture : handleFrontCapture}
            />
          </Section>
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-zinc-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
          <p>자세를 분석하는 중입니다…</p>
        </div>
      )}

      {step === "error" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-rose-600">{errorMsg}</p>
          <button onClick={reset} className="rounded-full bg-zinc-900 px-6 py-3 text-white">
            다시 시작하기
          </button>
        </div>
      )}

      {step === "results" && frontShot && sideShot && frontResult && sideResult && programType && (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-around rounded-xl bg-zinc-50 p-6">
            <ScoreGauge label="정면 정렬 점수" score={frontResult.overallScore} />
            <ScoreGauge label="측면 정렬 점수" score={sideResult.overallScore} />
          </div>

          <ProgramFocusPanel programType={programType} frontResult={frontResult} sideResult={sideResult} />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <PostureCanvas imageSrc={frontShot.dataUrl} landmarks={frontShot.landmarks} view="front" />
              <ReadingRow reading={frontResult.headTilt} />
              <ReadingRow reading={frontResult.shoulderTilt} />
              <ReadingRow reading={frontResult.hipTilt} />
              <ReadingRow reading={frontResult.kneeAlignmentLeft} />
              <ReadingRow reading={frontResult.kneeAlignmentRight} />
            </div>
            <div className="flex flex-col gap-3">
              <PostureCanvas
                imageSrc={sideShot.dataUrl}
                landmarks={sideShot.landmarks}
                view="side"
                facing={sideResult.facing}
              />
              <ReadingRow reading={sideResult.forwardHeadAngle} />
              <ReadingRow reading={sideResult.shoulderPlumbOffset} />
              <ReadingRow reading={sideResult.hipPlumbOffset} />
              <ReadingRow reading={sideResult.kneePlumbOffset} />
            </div>
          </div>

          <Methodology />

          <div className="flex flex-col items-center gap-2 print:hidden">
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                disabled={!reportDataUrl && !reportBuildError}
                className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {reportDataUrl || reportBuildError ? "리포트 보기·저장" : "리포트 준비 중…"}
              </button>
              <button onClick={reset} className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium">
                새로 측정하기
              </button>
            </div>
            {reportBuildError && <p className="text-sm text-rose-600">리포트 생성 실패: {reportBuildError}</p>}
          </div>

          {showReportModal && (
            <ReportModal
              dataUrl={reportDataUrl}
              buildError={reportBuildError}
              canShare={!!reportPngBlob && typeof navigator !== "undefined" && typeof navigator.share === "function"}
              shareState={shareState}
              pdfState={pdfState}
              actionErrorMsg={actionErrorMsg}
              onShare={handleShare}
              onOpenPng={handleOpenPng}
              onOpenPdf={handleOpenPdf}
              onClose={() => setShowReportModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ReportModalProps {
  dataUrl: string | null;
  buildError: string | null;
  canShare: boolean;
  shareState: "idle" | "sharing" | "error";
  pdfState: "idle" | "building" | "error";
  actionErrorMsg: string | null;
  onShare: () => void;
  onOpenPng: () => void;
  onOpenPdf: () => void;
  onClose: () => void;
}

function ReportModal({
  dataUrl,
  buildError,
  canShare,
  shareState,
  pdfState,
  actionErrorMsg,
  onShare,
  onOpenPng,
  onOpenPdf,
  onClose,
}: ReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <span className="font-semibold text-zinc-900">리포트 저장</span>
          <button onClick={onClose} className="text-sm text-zinc-500">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {buildError && <p className="text-sm text-rose-600">리포트 생성에 실패했습니다: {buildError}</p>}
          {dataUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="체형·자세 분석 리포트" className="w-full rounded-lg border border-zinc-200" />
              <p className="mt-2 text-center text-xs text-zinc-500">
                아래 버튼이 잘 안 되면, 위 이미지를 <strong>길게 눌러</strong> &quot;사진에 저장&quot;을 선택해 주세요.
                가장 확실한 저장 방법입니다.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-200 p-4">
          {actionErrorMsg && <p className="text-sm text-rose-600">{actionErrorMsg}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {canShare && (
              <button
                onClick={onShare}
                disabled={shareState === "sharing"}
                className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {shareState === "sharing" ? "공유 중…" : "공유하기 / 사진첩 저장"}
              </button>
            )}
            <button
              onClick={onOpenPng}
              disabled={!dataUrl}
              className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              이미지 새 탭에서 열기
            </button>
            <button
              onClick={onOpenPdf}
              disabled={!dataUrl || pdfState === "building"}
              className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {pdfState === "building" ? "PDF 생성 중…" : "PDF 새 탭에서 열기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const order: Step[] = ["select-program", "front-capture", "side-capture", "results"];
  const idx = order.indexOf(step);
  return (
    <div className="flex gap-1.5">
      {order.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 w-8 rounded-full ${i <= idx || step === "analyzing" ? "bg-zinc-800" : "bg-zinc-200"}`}
        />
      ))}
    </div>
  );
}

function ProgramSelect({ onSelect }: { onSelect: (type: ProgramType) => void }) {
  return (
    <section className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">0. 어떤 수업을 위한 측정인가요?</h2>
        <p className="mt-1 text-sm text-zinc-500">선택한 유형에 맞춰 핵심 체크포인트를 다르게 짚어드립니다.</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {PROGRAM_ORDER.map((type) => {
          const meta = PROGRAM_META[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className="rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-zinc-900">{meta.label}</span>
                <span className="text-xs text-zinc-500">{meta.short}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">{meta.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Methodology() {
  return (
    <details className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600">
      <summary className="cursor-pointer font-medium text-zinc-800">측정 방법론 및 유의사항</summary>
      <div className="mt-3 flex flex-col gap-2">
        <p>
          이 도구는 사진에서 감지한 신체 랜드마크(어깨·골반·무릎·발목·귀 등)의 좌표로 각도와 상대적 위치 편차를
          계산하는 <strong>사진 기반 자세 스크리닝</strong>입니다. 참고한 방법론은 다음과 같습니다.
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Kendall 추선(plumb line) 자세 평가</strong>: 발목에서 올린 수직 기준선 대비 무릎·골반·어깨의
            전후 편차를 측정해 신체 정렬을 스크리닝하는 물리치료·운동처방 분야의 고전적 기법입니다.
          </li>
          <li>
            <strong>귀-어깨 각도(전방머리자세 근사 지표)</strong>: 두개척추각(Craniovertebral Angle, CVA) 측정에서
            착안한 지표로, C7 촉지 마커 없이도 어깨(견봉)와 귀(이주)를 연결한 선의 수평 대비 각도로 전방머리자세
            경향을 스크리닝합니다. 값이 작을수록 전방머리자세 경향이 큽니다.
          </li>
          <li>
            <strong>좌우 대칭성 스크리닝</strong>: 눈·어깨·골반의 좌우 높이차 및 무릎의 내외반 스크리닝은 정면
            사진에서의 좌우 비대칭을 정량화한 것입니다.
          </li>
        </ul>
        <p className="font-medium text-zinc-800">중요한 한계</p>
        <p>
          이 결과는 의료 진단이 아닌 참고용 선별(screening) 지표입니다. 단일 사진 기반 2D 분석은 카메라 각도,
          촬영 거리, 자세 재현성에 따라 오차가 발생할 수 있습니다. 정확한 진단은 의료·물리치료 전문가의 대면
          평가를 받으시길 권장하며, 이 앱은 동일 회원을 <strong>일정한 촬영 조건(같은 위치·거리·복장)</strong>으로
          반복 측정해 시간에 따른 변화 추이를 추적하는 용도로 사용할 때 가장 신뢰도가 높습니다.
        </p>
      </div>
    </details>
  );
}
