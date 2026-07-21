"use client";

import { useState } from "react";
import Link from "next/link";
import CameraCapture from "@/components/CameraCapture";
import PostureCanvas from "@/components/PostureCanvas";
import { ReadingRow, ScoreGauge } from "@/components/ResultsReport";
import { getPoseLandmarker } from "@/lib/pose/model";
import { computeFrontMetrics, computeSideMetrics, type FrontResult, type SideResult } from "@/lib/pose/metrics";
import type { PoseLandmarks } from "@/lib/pose/landmarks";

type Step = "front-capture" | "side-capture" | "analyzing" | "results" | "error";

interface Shot {
  dataUrl: string;
  landmarks: PoseLandmarks;
}

export default function AnalyzePage() {
  const [step, setStep] = useState<Step>("front-capture");
  const [frontShot, setFrontShot] = useState<Shot | null>(null);
  const [sideShot, setSideShot] = useState<Shot | null>(null);
  const [frontResult, setFrontResult] = useState<FrontResult | null>(null);
  const [sideResult, setSideResult] = useState<SideResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setStep("front-capture");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 처음으로
        </Link>
        <StepIndicator step={step} />
      </header>

      {/* Kept mounted across front-capture -> analyzing -> side-capture so the camera
          stream (and permission grant) survives the whole flow instead of being torn
          down and reacquired between the two shots. Only unmounts once the side photo
          is captured (moving on to results) or on error. */}
      {!sideShot && step !== "error" && (
        <div className={step === "analyzing" ? "hidden" : "contents"}>
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

      {step === "results" && frontShot && sideShot && frontResult && sideResult && (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-around rounded-xl bg-zinc-50 p-6">
            <ScoreGauge label="정면 정렬 점수" score={frontResult.overallScore} />
            <ScoreGauge label="측면 정렬 점수" score={sideResult.overallScore} />
          </div>

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

          <div className="flex justify-center gap-3 print:hidden">
            <button onClick={() => window.print()} className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium">
              보고서 인쇄/저장
            </button>
            <button onClick={reset} className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white">
              새로 측정하기
            </button>
          </div>
        </div>
      )}
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
  const order: Step[] = ["front-capture", "side-capture", "results"];
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
