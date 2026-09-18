"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {FilesetResolver,PoseLandmarker} from "@mediapipe/tasks-vision";
import {drawPose} from "@/lib/pose/live-draw";
import FaceTrackingOverlay from "./FaceTrackingOverlay";
import CameraChrome,{useCameraScreen} from "./CameraChrome";

interface CameraCaptureProps {
  active?: boolean;
  step?: number;
  onClose?: () => void;
  captureError?: string;
  view: "front" | "side" | "back";
  onCapture: (dataUrl: string, width: number, height: number) => void;
}



export default function CameraCapture({ view, onCapture, captureError, active=true, step=0, onClose }: CameraCaptureProps) {
  useCameraScreen(active);
  const poseCanvas=useRef<HTMLCanvasElement>(null);
  const [tracking,setTracking]=useState("전신 추적 준비 중…");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [fillFrame, setFillFrame] = useState(true);
  const [delay, setDelay] = useState<0|3|5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function acquireStream(): Promise<MediaStream> {
      // `exact` forces a genuinely different physical camera when the user asks to
      // switch — `ideal` alone lets some browsers keep the current device, which was
      // the root cause of "switch camera" needing two clicks to visibly take effect.
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facing }, width: { ideal: 720 }, height: { ideal: 960 }, aspectRatio: { ideal: 0.75 } },
          audio: false,
        });
      } catch (cause) {
        // Retry only an unsupported camera constraint, never a permission denial.
        if (cancelled || !(cause instanceof DOMException) ||
            !["OverconstrainedError", "NotFoundError"].includes(cause.name)) throw cause;
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 720 }, height: { ideal: 960 }, aspectRatio: { ideal: 0.75 } }, audio: false,
        });
      }
    }

    async function start() {
      setReady(false);
      setError(null);
      stopStream();
      try {
        const stream = await acquireStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const actualFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
        setMirror(actualFacing ? actualFacing === "user" : facing === "user");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (cancelled) return;
        setReady(true);
        // Device labels/ids are only populated once permission is granted; enumerate lazily
        // and only adopt the result if we don't already have a list (avoids re-triggering
        // this effect via a `devices.length` dependency every time the list is (re)filled).
        const list = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setDevices((prev) => (prev.length > 0 ? prev : list.filter((d) => d.kind === "videoinput")));
        }
      } catch {
        stopStream();
        if (!cancelled) setError("카메라에 접근할 수 없습니다. 브라우저 권한을 확인해 주세요.");
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(()=>{
    if(!ready||!active)return;
    let cancelled=false,model:PoseLandmarker|null=null,frame=0,last=0,lastVideo=-1;
    async function start(){try{
      const files=await FilesetResolver.forVisionTasks("/mediapipe/wasm");if(cancelled)return;
      const create=(delegate:"GPU"|"CPU")=>PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",delegate},runningMode:"VIDEO",numPoses:2,minPoseDetectionConfidence:.65,minTrackingConfidence:.65});
      try{model=await create("GPU");}catch{if(cancelled)return;model=await create("CPU");}
      if(cancelled){model.close();return;}
      function tick(now:number){if(cancelled)return;frame=requestAnimationFrame(tick);const v=videoRef.current,cv=poseCanvas.current;if(!v||!cv||v.readyState<2||document.hidden||now-last<80||lastVideo===v.currentTime)return;last=now;lastVideo=v.currentTime;
        const ctx=cv.getContext("2d");if(!ctx)return;cv.width=v.videoWidth;cv.height=v.videoHeight;
        try{const result=model!.detectForVideo(v,now);const points=result.landmarks.length===1?result.landmarks[0]:[];drawPose(ctx,points,cv.width,cv.height);
          const full=[11,12,23,24,25,26,27,28].every(i=>points[i]&&(points[i].visibility??0)>.65);
          setTracking(result.landmarks.length>1?"한 사람만 화면에 들어오세요":full?"전신 추적 중 · 자세를 유지하고 촬영하세요":"전신이 보이도록 거리를 조절해 주세요");
        }catch{ctx.clearRect(0,0,cv.width,cv.height);setTracking("실시간 추적 중단 · 촬영 후 분석은 가능합니다");cancelAnimationFrame(frame);}
      }frame=requestAnimationFrame(tick);
    }catch{if(!cancelled)setTracking("실시간 모델 로드 실패 · 촬영 후 분석은 가능합니다");}}
    void start();return()=>{cancelled=true;cancelAnimationFrame(frame);model?.close();};
  },[ready,active,facing]);

  const takeShot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.92), canvas.width, canvas.height);
  }, [onCapture]);

  const handleCaptureClick = () => {
    if (delay === 0) {
      takeShot();
      return;
    }
    let remaining = delay;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        takeShot();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const handleCancelCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setCountdown(null);
  };

  const handleSwitchCamera = () => {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  };

  return <div className="camera-screen" role="region" aria-label="전체화면 체형 촬영">
    <div className="camera-viewport">
      <video ref={videoRef} playsInline muted style={{objectFit:fillFrame?"cover":"contain",transform:mirror?"scaleX(-1)":"none"}}/>
      <canvas ref={poseCanvas} aria-hidden="true" style={{objectFit:fillFrame?"cover":"contain",transform:mirror?"scaleX(-1)":"none"}}/>
      {ready&&active&&view!=="back"&&<FaceTrackingOverlay video={videoRef} active={active} mirror={mirror} fillFrame={fillFrame}/>}
      <CameraChrome title={`${step+1}/4 · ${["정면","오른쪽 측면","후면","왼쪽 측면"][step]}`} progress={step/4} onClose={()=>{handleCancelCountdown();onClose?.();}}/>
      {countdown!==null&&<div className="camera-countdown" role="status">{countdown}</div>}
      <div className="camera-instruction" role={error||captureError?"alert":"status"}>{error||captureError||tracking}<small>{view==="front"?"앞모습을 촬영해 주세요.":view==="back"?"등을 카메라 쪽으로 보여 주세요.":"옆모습의 귀·어깨·골반·발목이 보이게 서 주세요."}</small></div>
    </div>
    <div className="camera-controls">
      <div className="camera-options"><button onClick={()=>setMirror(v=>!v)} aria-pressed={mirror}>거울 {mirror?"ON":"OFF"}</button><button onClick={()=>setFillFrame(v=>!v)}>{fillFrame?"전체 영상 보기":"화면 채우기"}</button><label>사진 선택<input type="file" accept="image/jpeg,image/png,image/webp" disabled={countdown!==null} onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>15*1024*1024){setError("15MB 이하 사진을 선택해 주세요.");return;}const reader=new FileReader();reader.onload=()=>onCapture(String(reader.result),0,0);reader.onerror=()=>setError("사진을 읽지 못했습니다.");reader.readAsDataURL(f);}}/></label></div>
      <div className="camera-actions"><button disabled={countdown!==null} onClick={()=>setDelay(d=>d===0?3:d===3?5:0)} aria-label="타이머 변경">◷<small>{delay?`${delay}초`:"OFF"}</small></button><button className="camera-shutter" disabled={!ready} onClick={countdown!==null?handleCancelCountdown:handleCaptureClick} aria-label={countdown!==null?"촬영 취소":"촬영하기"}>{countdown!==null?"취소":""}</button><button onClick={handleSwitchCamera} disabled={countdown!==null||!ready||devices.length<2} aria-label="카메라 전환">↻<small>카메라</small></button></div>
    </div>
  </div>;
}
