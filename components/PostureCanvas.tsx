"use client";

import { useEffect, useRef } from "react";
import type { PoseLandmarks } from "@/lib/pose/landmarks";
import { keyLandmarksForOverlay, type Facing } from "@/lib/pose/metrics";

interface PostureCanvasProps {
  imageSrc: string;
  landmarks: PoseLandmarks;
  view: "front" | "side";
  facing?: Facing;
}

export default function PostureCanvas({ imageSrc, landmarks, view, facing }: PostureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
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
    };
    img.src = imageSrc;
  }, [imageSrc, landmarks, view, facing]);

  return <canvas ref={canvasRef} className="w-full rounded-xl border border-zinc-200" />;
}
