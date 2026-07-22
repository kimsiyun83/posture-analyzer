"use client";

import { useEffect, useRef } from "react";
import type { PoseLandmarks } from "@/lib/pose/landmarks";
import type { Facing } from "@/lib/pose/metrics";
import { drawPostureOverlay } from "@/lib/pose/draw";

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
      drawPostureOverlay(ctx, img, landmarks, view, facing);
    };
    img.src = imageSrc;
  }, [imageSrc, landmarks, view, facing]);

  return <canvas ref={canvasRef} className="w-full rounded-xl border border-zinc-200" />;
}
