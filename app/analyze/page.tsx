"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import PostureCanvas from "@/components/PostureCanvas";
import DetailedPostureReport from "@/components/DetailedPostureReport";
import { getPoseLandmarker } from "@/lib/pose/model";
import { computeFrontMetrics, computeSideMetrics, type FrontResult, type SideResult } from "@/lib/pose/metrics";
import type { PoseLandmarks } from "@/lib/pose/landmarks";
import { PROGRAM_META, PROGRAM_ORDER, type ProgramType } from "@/lib/pose/programs";
import { buildReportCanvas, canvasToPdfBlob, canvasToPngBlob, shareBlob } from "@/lib/report";

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
  return (
    <Suspense fallback={null}>
      <AnalyzePageInner />
    </Suspense>
  );
}

function AnalyzePageInner() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get("memberId");
  const [savedToMember, setSavedToMember] = useState(false);
  const [saveToMemberState, setSaveToMemberState] = useState<"idle" | "saving" | "error">("idle");
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
  const [reportPdfBlob, setReportPdfBlob] = useState<Blob | null>(null);
  const [reportBuildError, setReportBuildError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pngShareState, setPngShareState] = useState<"idle" | "sharing" | "error">("idle");
  const [pdfShareState, setPdfShareState] = useState<"idle" | "sharing" | "error">("idle");
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
    setReportPdfBlob(null);
    setReportBuildError(null);
    setShowReportModal(false);
    setPngShareState("idle");
    setPdfShareState("idle");
    setActionErrorMsg(null);
    reportCanvasRef.current = null;
    clearPersistedSession();
    setSavedToMember(false);
    setSaveToMemberState("idle");
    setStep("select-program");
  }

  async function handleSaveToMember() {
    if (!memberId || !programType || !frontResult || !sideResult) return;
    setSaveToMemberState("saving");
    try {
      const res = await fetch(`/api/members/${memberId}/posture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programType, frontResult, sideResult }),
      });
      if (!res.ok) throw new Error("저장에 실패했습니다.");
      setSavedToMember(true);
      setSaveToMemberState("idle");
    } catch {
      setSaveToMemberState("error");
    }
  }

  // Build the report image (and PDF) proactively as soon as results are ready,
  // rather than inside a button's click handler. navigator.share() must fire close
  // to the user gesture that triggered it — Safari revokes the permission if too
  // much async work (loading two photos, drawing the composite, encoding a PDF)
  // happens first.
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
        const pngBlob = await canvasToPngBlob(canvas);
        if (!cancelled) setReportPngBlob(pngBlob);
        const pdfBlob = await canvasToPdfBlob(canvas);
        if (!cancelled) setReportPdfBlob(pdfBlob);
      } catch (e) {
        if (!cancelled) setReportBuildError(e instanceof Error ? e.message : "리포트 생성에 실패했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, frontShot, sideShot, frontResult, sideResult, programType]);

  async function handleSharePng() {
    if (!reportPngBlob) return;
    setPngShareState("sharing");
    setActionErrorMsg(null);
    try {
      const shared = await shareBlob(reportPngBlob, `posture-report-${Date.now()}.png`);
      if (!shared) {
        setActionErrorMsg("이 브라우저에서는 공유가 지원되지 않습니다. 위 이미지를 길게 눌러 저장해 주세요.");
      }
      setPngShareState("idle");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setPngShareState("idle");
        return;
      }
      setActionErrorMsg(e instanceof Error ? e.message : "공유에 실패했습니다. 위 이미지를 길게 눌러 저장해 주세요.");
      setPngShareState("error");
    }
  }

  async function handleSharePdf() {
    if (!reportPdfBlob) return;
    setPdfShareState("sharing");
    setActionErrorMsg(null);
    try {
      const shared = await shareBlob(reportPdfBlob, `posture-report-${Date.now()}.pdf`);
      if (!shared) {
        setActionErrorMsg("이 브라우저에서는 PDF 공유가 지원되지 않습니다. 이미지 저장을 이용해 주세요.");
      }
      setPdfShareState("idle");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setPdfShareState("idle");
        return;
      }
      setActionErrorMsg(e instanceof Error ? e.message : "PDF 공유에 실패했습니다.");
      setPdfShareState("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
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
          <DetailedPostureReport
            front={frontResult} side={sideResult} programType={programType}
            dateLabel={new Date().toLocaleDateString("ko-KR")}
            photos={<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <figure><PostureCanvas imageSrc={frontShot.dataUrl} landmarks={frontShot.landmarks} view="front" /><figcaption className="mt-2 text-center text-xs text-zinc-500">정면 · 좌우 정렬</figcaption></figure>
              <figure><PostureCanvas imageSrc={sideShot.dataUrl} landmarks={sideShot.landmarks} view="side" facing={sideResult.facing} /><figcaption className="mt-2 text-center text-xs text-zinc-500">측면 · 발목 수직선 기준</figcaption></figure>
            </div>}
          />

          <div className="flex flex-col items-center gap-2 print:hidden">
            {memberId && (
              <button
                onClick={handleSaveToMember}
                disabled={savedToMember || saveToMemberState === "saving"}
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {savedToMember ? "✓ 회원 기록에 저장됨" : saveToMemberState === "saving" ? "저장 중…" : "회원 기록에 저장"}
              </button>
            )}
            {saveToMemberState === "error" && <p className="text-sm text-rose-600">회원 기록 저장에 실패했습니다.</p>}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                disabled={!reportDataUrl && !reportBuildError}
                className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {reportDataUrl || reportBuildError ? "사진 요약 이미지 보기·저장" : "리포트 준비 중…"}
              </button>
              {memberId ? (
                <Link
                  href={`/members/${memberId}`}
                  className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium"
                >
                  회원 페이지로 돌아가기
                </Link>
              ) : (
                <button onClick={reset} className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium">
                  새로 측정하기
                </button>
              )}
            </div>
            {reportBuildError && <p className="text-sm text-rose-600">리포트 생성 실패: {reportBuildError}</p>}
          </div>

          {showReportModal && (
            <ReportModal
              dataUrl={reportDataUrl}
              buildError={reportBuildError}
              canShare={typeof navigator !== "undefined" && typeof navigator.share === "function"}
              pngReady={!!reportPngBlob}
              pdfReady={!!reportPdfBlob}
              pngShareState={pngShareState}
              pdfShareState={pdfShareState}
              actionErrorMsg={actionErrorMsg}
              onSharePng={handleSharePng}
              onSharePdf={handleSharePdf}
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
  pngReady: boolean;
  pdfReady: boolean;
  pngShareState: "idle" | "sharing" | "error";
  pdfShareState: "idle" | "sharing" | "error";
  actionErrorMsg: string | null;
  onSharePng: () => void;
  onSharePdf: () => void;
  onClose: () => void;
}

function ReportModal({
  dataUrl,
  buildError,
  canShare,
  pngReady,
  pdfReady,
  pngShareState,
  pdfShareState,
  actionErrorMsg,
  onSharePng,
  onSharePdf,
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
              {/* 저장의 가장 확실한 경로: 새 탭/다운로드 링크는 기기마다 깨지는 경우가 많아
                  (data: URL은 크롬이 새 탭 이동을 차단, blob: URL은 iOS Safari에서 새 탭이
                  검정 화면으로 뜨는 버그가 있음), 같은 화면에 이미지를 직접 보여주고 길게 눌러
                  저장하게 하는 방식이 기기·브라우저를 가장 덜 타는 방법입니다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="체형·자세 분석 리포트" className="w-full rounded-lg border border-zinc-200" />
              <p className="mt-2 text-center text-xs text-zinc-500">
                위 이미지를 <strong>길게 눌러</strong> &quot;사진에 저장&quot;을 선택하면 사진첩에 저장됩니다.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-200 p-4">
          {actionErrorMsg && <p className="text-sm text-rose-600">{actionErrorMsg}</p>}
          {!canShare && <p className="text-xs text-zinc-500">이 브라우저는 공유하기를 지원하지 않습니다 — 위 이미지를 길게 눌러 저장해 주세요.</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {canShare && (
              <button
                onClick={onSharePng}
                disabled={!pngReady || pngShareState === "sharing"}
                className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {pngShareState === "sharing" ? "공유 중…" : "이미지 공유하기"}
              </button>
            )}
            {canShare && (
              <button
                onClick={onSharePdf}
                disabled={!pdfReady || pdfShareState === "sharing"}
                className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {pdfShareState === "sharing" ? "공유 중…" : !pdfReady ? "PDF 준비 중…" : "PDF 공유하기"}
              </button>
            )}
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
