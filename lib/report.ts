import type { PoseLandmarks } from "./pose/landmarks";
import {
  collectReadings,
  formatReadingValue,
  SEVERITY_HEX,
  SEVERITY_LABEL_KO,
  type FrontResult,
  type SideResult,
} from "./pose/metrics";
import { loadImage, renderPostureOverlayCanvas } from "./pose/draw";
import { PROGRAM_FOCUS, PROGRAM_META, type ProgramType } from "./pose/programs";

interface Shot {
  dataUrl: string;
  landmarks: PoseLandmarks;
}

export interface ReportInput {
  frontShot: Shot;
  sideShot: Shot;
  frontResult: FrontResult;
  sideResult: SideResult;
  programType: ProgramType;
  dateLabel: string;
}

const WIDTH = 720;
const PAD = 36;
const CONTENT_W = WIDTH - PAD * 2;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildReportCanvas(input: ReportInput): Promise<HTMLCanvasElement> {
  const { frontShot, sideShot, frontResult, sideResult, programType, dateLabel } = input;

  const frontImg = await loadImage(frontShot.dataUrl);
  const sideImg = await loadImage(sideShot.dataUrl);
  const frontOverlay = renderPostureOverlayCanvas(frontImg, frontShot.landmarks, "front");
  const sideOverlay = renderPostureOverlayCanvas(sideImg, sideShot.landmarks, "side", sideResult.facing);

  const frontPhotoH = Math.round(CONTENT_W * (frontOverlay.height / frontOverlay.width));
  const sidePhotoH = Math.round(CONTENT_W * (sideOverlay.height / sideOverlay.width));

  const meta = PROGRAM_META[programType];
  const focusPoints = PROGRAM_FOCUS[programType];
  const readings = collectReadings(frontResult, sideResult);

  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) throw new Error("canvas 2d context를 생성할 수 없습니다.");

  scratch.font = "13px sans-serif";
  const focusItems = focusPoints
    .map((point) => {
      const reading = readings.find((r) => r.key === point.key);
      if (!reading) return null;
      const advice = point.advice[reading.severity] ?? point.advice.normal ?? "";
      return { reading, advice, lines: wrapText(scratch, advice, CONTENT_W) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  scratch.font = "12px sans-serif";
  const footerText =
    "이 리포트는 의료 진단이 아닌 참고용 스크리닝 결과입니다. 단일 사진 기반 2D 분석은 촬영 조건에 따라 오차가 있을 수 있으며, 동일한 조건(위치·거리·복장)으로 반복 측정할 때 변화 추이 파악에 가장 유용합니다.";
  const footerLines = wrapText(scratch, footerText, CONTENT_W);

  const READING_LINE_H = 26;
  const FOCUS_TITLE_H = 22;
  const FOCUS_LINE_H = 18;
  const FOCUS_ITEM_GAP = 12;
  const FOOTER_LINE_H = 16;

  let y = PAD;
  y += 34; // title
  y += 22; // date / program line
  y += 8;
  y += 40; // score line
  y += 24;

  y += 24; // "1. 정면" heading
  y += frontPhotoH + 12;
  y += frontResult ? 5 * READING_LINE_H : 0;
  y += 20;

  y += 24; // "2. 측면" heading
  y += sidePhotoH + 12;
  y += 4 * READING_LINE_H;
  y += 24;

  y += 26; // focus panel heading
  y += 18;
  focusItems.forEach((item) => {
    y += FOCUS_TITLE_H + item.lines.length * FOCUS_LINE_H + FOCUS_ITEM_GAP;
  });
  y += 20;

  y += footerLines.length * FOOTER_LINE_H;
  y += PAD;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = Math.ceil(y);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 생성할 수 없습니다.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let cy = PAD;
  ctx.fillStyle = "#18181b";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("체형·자세 분석 리포트", PAD, cy + 22);
  cy += 34;

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#71717a";
  ctx.fillText(`${dateLabel} · ${meta.label}`, PAD, cy + 14);
  cy += 22 + 8;

  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#18181b";
  ctx.fillText(`정면 정렬 ${frontResult.overallScore}점`, PAD, cy + 20);
  ctx.fillText(`측면 정렬 ${sideResult.overallScore}점`, PAD + CONTENT_W / 2, cy + 20);
  cy += 40 + 24;

  ctx.font = "bold 17px sans-serif";
  ctx.fillStyle = "#18181b";
  ctx.fillText("1. 정면", PAD, cy + 16);
  cy += 24;
  ctx.drawImage(frontOverlay, PAD, cy, CONTENT_W, frontPhotoH);
  cy += frontPhotoH + 12;

  const frontReadings = [
    frontResult.headTilt,
    frontResult.shoulderTilt,
    frontResult.hipTilt,
    frontResult.kneeAlignmentLeft,
    frontResult.kneeAlignmentRight,
  ];
  frontReadings.forEach((r) => {
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#27272a";
    ctx.fillText(r.label, PAD, cy + 16);
    ctx.fillStyle = SEVERITY_HEX[r.severity];
    ctx.font = "bold 14px sans-serif";
    const valueText = `${formatReadingValue(r)} · ${SEVERITY_LABEL_KO[r.severity]}`;
    const valueWidth = ctx.measureText(valueText).width;
    ctx.fillText(valueText, PAD + CONTENT_W - valueWidth, cy + 16);
    cy += READING_LINE_H;
  });
  cy += 20;

  ctx.font = "bold 17px sans-serif";
  ctx.fillStyle = "#18181b";
  ctx.fillText("2. 측면", PAD, cy + 16);
  cy += 24;
  ctx.drawImage(sideOverlay, PAD, cy, CONTENT_W, sidePhotoH);
  cy += sidePhotoH + 12;

  const sideReadings = [
    sideResult.forwardHeadAngle,
    sideResult.shoulderPlumbOffset,
    sideResult.hipPlumbOffset,
    sideResult.kneePlumbOffset,
  ];
  sideReadings.forEach((r) => {
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#27272a";
    ctx.fillText(r.label, PAD, cy + 16);
    ctx.fillStyle = SEVERITY_HEX[r.severity];
    ctx.font = "bold 14px sans-serif";
    const valueText = `${formatReadingValue(r)} · ${SEVERITY_LABEL_KO[r.severity]}`;
    const valueWidth = ctx.measureText(valueText).width;
    ctx.fillText(valueText, PAD + CONTENT_W - valueWidth, cy + 16);
    cy += READING_LINE_H;
  });
  cy += 24;

  ctx.font = "bold 17px sans-serif";
  ctx.fillStyle = "#18181b";
  ctx.fillText(`${meta.label} 핵심 체크포인트`, PAD, cy + 16);
  cy += 26;

  focusItems.forEach((item) => {
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#18181b";
    ctx.fillText(item.reading.label, PAD, cy + 14);
    cy += FOCUS_TITLE_H;
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#3f3f46";
    item.lines.forEach((line) => {
      ctx.fillText(line, PAD, cy + 13);
      cy += FOCUS_LINE_H;
    });
    cy += FOCUS_ITEM_GAP;
  });
  cy += 12;

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#a1a1aa";
  footerLines.forEach((line) => {
    ctx.fillText(line, PAD, cy + 12);
    cy += FOOTER_LINE_H;
  });

  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))), "image/png", 0.95);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function canShareFiles(file: File): boolean {
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
  return typeof nav.canShare === "function" && nav.canShare({ files: [file] });
}

/**
 * Share a pre-built blob. Must be called as directly as possible after a user
 * gesture (no `await` before this in the click handler) — Safari/WebKit revokes
 * navigator.share()'s permission if too much async work happens first.
 */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  if (!canShareFiles(file)) return false;
  await navigator.share({ files: [file], title: "체형·자세 분석 리포트" });
  return true;
}

export async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const PX_TO_MM = 25.4 / 96;
  const widthMm = canvas.width * PX_TO_MM;
  const heightMm = canvas.height * PX_TO_MM;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, heightMm],
  });
  pdf.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
  return pdf.output("blob");
}
