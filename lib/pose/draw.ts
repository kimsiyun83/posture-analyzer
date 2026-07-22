import type { PoseLandmarks } from "./landmarks";
import { keyLandmarksForOverlay, type Facing } from "./metrics";

export function drawPostureOverlay(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  landmarks: PoseLandmarks,
  view: "front" | "side",
  facing?: Facing,
) {
  ctx.drawImage(img, 0, 0);

  const overlay = keyLandmarksForOverlay(landmarks, view, facing);
  const toPx = (p: { x: number; y: number }) => ({ x: p.x * img.width, y: p.y * img.height });

  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = Math.max(2, img.width * 0.004);
  overlay.lines.forEach(([a, b]) => {
    const pa = toPx(a);
    const pb = toPx(b);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  });

  if ("plumb" in overlay && overlay.plumb) {
    const bottom = toPx(overlay.plumb.bottom);
    ctx.strokeStyle = "#facc15";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(bottom.x, 0);
    ctx.lineTo(bottom.x, img.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = "#ef4444";
  overlay.points.forEach((p) => {
    const px = toPx(p);
    ctx.beginPath();
    ctx.arc(px.x, px.y, Math.max(3, img.width * 0.006), 0, Math.PI * 2);
    ctx.fill();
  });
}

export function renderPostureOverlayCanvas(
  img: HTMLImageElement,
  landmarks: PoseLandmarks,
  view: "front" | "side",
  facing?: Facing,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  drawPostureOverlay(ctx, img, landmarks, view, facing);
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = src;
  });
}
