"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  view: "front" | "side";
  onCapture: (dataUrl: string, width: number, height: number) => void;
}

export default function CameraCapture({ view, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setReady(false);
      setError(null);
      stopStream();
      try {
        const constraints: MediaStreamConstraints = {
          video:
            devices.length > 0
              ? { deviceId: { exact: devices[deviceIndex % devices.length].deviceId } }
              : { facingMode: { ideal: "environment" } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        if (devices.length === 0) {
          const list = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) setDevices(list.filter((d) => d.kind === "videoinput"));
        }
      } catch {
        if (!cancelled) setError("카메라에 접근할 수 없습니다. 브라우저 권한을 확인해 주세요.");
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceIndex, devices.length]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.92), canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full max-w-md aspect-[3/4] max-h-[58vh] bg-black rounded-xl overflow-hidden">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <GuideOverlay view={view} />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white bg-black/70">
            {error}
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!ready}
          className="rounded-full bg-zinc-900 px-6 py-3 text-white font-medium disabled:opacity-40"
        >
          촬영하기
        </button>
        {devices.length > 1 && (
          <button
            type="button"
            onClick={() => setDeviceIndex((i) => i + 1)}
            className="rounded-full border border-zinc-300 px-4 py-3 text-sm font-medium"
          >
            카메라 전환
          </button>
        )}
      </div>
    </div>
  );
}

function GuideOverlay({ view }: { view: "front" | "side" }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
      viewBox="0 0 300 400"
      preserveAspectRatio="none"
    >
      <line x1="150" y1="0" x2="150" y2="400" stroke="#22d3ee" strokeWidth="1" strokeDasharray="6 6" />
      {view === "front" ? (
        <>
          <line x1="60" y1="90" x2="240" y2="90" stroke="#facc15" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="70" y1="230" x2="230" y2="230" stroke="#facc15" strokeWidth="1" strokeDasharray="4 4" />
          <text x="150" y="380" fill="#fff" fontSize="12" textAnchor="middle">
            정면: 어깨 · 골반 라인을 가이드에 맞춰 주세요
          </text>
        </>
      ) : (
        <>
          <line x1="20" y1="0" x2="20" y2="400" stroke="#facc15" strokeWidth="1" strokeDasharray="4 4" />
          <text x="150" y="380" fill="#fff" fontSize="12" textAnchor="middle">
            측면: 귀 · 어깨 · 골반 · 무릎 · 발목이 모두 보이게 서주세요
          </text>
        </>
      )}
    </svg>
  );
}
