"use client";
import {useEffect,useRef,useState,type RefObject} from "react";
import {FaceLandmarker,FilesetResolver} from "@mediapipe/tasks-vision";
import {drawable} from "@/lib/pose/live-draw";

/** Independent, lower-rate face detail never gates body measurements. */
export default function FaceTrackingOverlay({video,active,mirror,fillFrame}:{video:RefObject<HTMLVideoElement|null>;active:boolean;mirror:boolean;fillFrame:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [status,setStatus]=useState("얼굴 추적 준비 중");
 useEffect(()=>{
  if(!active)return;
  let cancelled=false,model:FaceLandmarker|null=null,frame=0,last=0,lastVideo=-1;
  async function start(){try{
   const files=await FilesetResolver.forVisionTasks("/mediapipe/wasm");
   if(cancelled)return;
   const create=(delegate:"GPU"|"CPU")=>FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",delegate},runningMode:"VIDEO",numFaces:1,minFaceDetectionConfidence:.7,minFacePresenceConfidence:.7,minTrackingConfidence:.7});
   try{model=await create("GPU");}catch{if(cancelled)return;model=await create("CPU");}
   if(cancelled){model.close();return;}
   const edges=[...FaceLandmarker.FACE_LANDMARKS_CONTOURS,...FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,...FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS];
   function tick(now:number){if(cancelled)return;frame=requestAnimationFrame(tick);const v=video.current,cv=canvas.current;if(!v||!cv||v.readyState<2||document.hidden||now-last<200||v.currentTime===lastVideo)return;last=now;lastVideo=v.currentTime;
    const ctx=cv.getContext("2d");if(!ctx)return;cv.width=v.videoWidth;cv.height=v.videoHeight;ctx.clearRect(0,0,cv.width,cv.height);
    try{const started=performance.now();const p=model!.detectForVideo(v,now).faceLandmarks[0];if(performance.now()-started>150){setStatus("몸 측정 우선 · 얼굴 세부 추적을 쉬고 있습니다");cancelAnimationFrame(frame);return;}if(!p){setStatus("얼굴 미인식 · 몸 측정은 계속됩니다");return;}
     setStatus("얼굴 세부 추적 중");ctx.strokeStyle="#ffffffb3";ctx.lineWidth=1;
     for(const {start,end} of edges){if(!drawable(p[start])||!drawable(p[end]))continue;ctx.beginPath();ctx.moveTo(p[start].x*cv.width,p[start].y*cv.height);ctx.lineTo(p[end].x*cv.width,p[end].y*cv.height);ctx.stroke();}
     ctx.fillStyle="#20d9bb";for(const point of p){if(!drawable(point))continue;ctx.beginPath();ctx.arc(point.x*cv.width,point.y*cv.height,1.2,0,Math.PI*2);ctx.fill();}
    }catch{ctx.clearRect(0,0,cv.width,cv.height);setStatus("얼굴 추적 중단 · 몸 측정은 계속됩니다");cancelAnimationFrame(frame);}
   }frame=requestAnimationFrame(tick);
  }catch{if(!cancelled)setStatus("얼굴 모델 로드 실패 · 몸 측정은 계속됩니다");}}
  void start();return()=>{cancelled=true;cancelAnimationFrame(frame);model?.close();};
 },[active,video]);
 return <><canvas aria-hidden="true" ref={canvas} className="face-tracking-layer" style={{objectFit:fillFrame?"cover":"contain",transform:mirror?"scaleX(-1)":"none"}}/><span className="face-tracking-status">{status}</span></>;
}
