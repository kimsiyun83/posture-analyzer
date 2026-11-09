"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {FilesetResolver,PoseLandmarker} from "@mediapipe/tasks-vision";
import CameraChrome,{useCameraScreen} from "@/components/CameraChrome";
import {GuideControls,MeasurementGuides,useMeasurementGuides} from "@/components/MeasurementGuides";
import MeasurementPhoto from "@/components/MeasurementPhoto";
import SquatGuide from "@/components/SquatGuide";
import SquatReport from "@/components/SquatReport";
import {CustomerSave} from "@/components/CustomerAccess";
import {drawPose} from "@/lib/pose/live-draw";
import {freshSquat,readSquat,stepSquat,type SquatReading,type SquatRep,type SquatReport as Report,type SquatView} from "@/lib/pose/squat";
import type {PoseLandmarks} from "@/lib/pose/landmarks";
type Snapshot={src:string;landmarks:PoseLandmarks};
export default function Page(){
 const [view,setView]=useState<SquatView>("front"),[active,setActive]=useState(false),[enabled,setEnabled]=useState(false),[settingsError,setSettingsError]=useState("");
 const [message,setMessage]=useState("정면부터 양팔을 올리고 시작해 주세요."),[count,setCount]=useState(0),[reading,setReading]=useState<SquatReading|null>(null);
 const [front,setFront]=useState<SquatRep[]|null>(null),[side,setSide]=useState<SquatRep[]|null>(null),[saved,setSaved]=useState<{id:string;data:Report}|null>(null);
 const [photos,setPhotos]=useState<Partial<Record<SquatView,Snapshot>>>({});
 const [mirror,setMirror]=useState(true),[fillFrame,setFillFrame]=useState(false),[devices,setDevices]=useState<MediaDeviceInfo[]>([]),[device,setDevice]=useState("");
 const [guides,setGuides]=useMeasurementGuides();
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),resultBox=useRef<HTMLDivElement>(null);
 useCameraScreen(active);
 useEffect(()=>{let alive=true;fetch('/api/customer/auth').then(async r=>{if(!r.ok)throw Error();const d=await r.json();if(alive){setEnabled(d.settings?.cameraEnabled===true);if(!d.settings?.cameraEnabled)setSettingsError("센터에서 카메라 검사를 잠시 중단했습니다.");}}).catch(()=>{if(alive)setSettingsError("카메라 설정을 불러오지 못했습니다. 새로고침해 주세요.");});return()=>{alive=false;};},[]);
 useEffect(()=>{if(saved)resultBox.current?.scrollIntoView({behavior:"smooth"});},[saved]);
 useEffect(()=>{
  if(!active)return;
  let disposed=false,stream:MediaStream|null=null,model:PoseLandmarker|null=null,frame=0,last=0,lastVideo=-1,state=freshSquat(),lockedSide:"left"|"right"|undefined;
  let best:Snapshot|undefined;const samples:SquatReading[]=[];
  function snapshot(points:PoseLandmarks){const v=video.current!;const cv=document.createElement('canvas');cv.width=v.videoWidth;cv.height=v.videoHeight;cv.getContext('2d')!.drawImage(v,0,0);return {src:cv.toDataURL('image/jpeg',.85),landmarks:points.map(p=>({...p}))};}
  async function start(){try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error("카메라를 지원하는 크롬 또는 엣지에서 열어주세요.");
   stream=await navigator.mediaDevices.getUserMedia({video:{...(device?{deviceId:{exact:device}}:{facingMode:{ideal:"user"}}),width:{ideal:720},height:{ideal:960},frameRate:{ideal:30,max:30}},audio:false});
   if(disposed){stream.getTracks().forEach(t=>t.stop());return;}
   stream.getVideoTracks().forEach(t=>{t.onended=()=>{if(!disposed){setMessage('카메라 연결이 끊겼습니다. 다시 시작해 주세요.');setActive(false);}};});
   const v=video.current!;v.srcObject=stream;await v.play();
   const list=await navigator.mediaDevices.enumerateDevices();if(disposed)return;setDevices(list.filter(d=>d.kind==='videoinput'));
   const files=await FilesetResolver.forVisionTasks('/mediapipe/wasm');if(disposed)return;
   const create=(delegate:'GPU'|'CPU')=>PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',delegate},runningMode:'VIDEO',numPoses:2,minPoseDetectionConfidence:.65,minTrackingConfidence:.65});
   try{model=await create('GPU');}catch{if(disposed)return;model=await create('CPU');}
   if(disposed){model.close();return;}
   function tick(now:number){if(disposed)return;frame=requestAnimationFrame(tick);if(now-last<90||v.readyState<2||v.currentTime===lastVideo)return;last=now;lastVideo=v.currentTime;
    try{
     const cv=canvas.current;if(!cv)return;cv.width=v.videoWidth;cv.height=v.videoHeight;const ctx=cv.getContext('2d')!;
     const poses=model!.detectForVideo(v,now).landmarks;const points=poses.length===1?poses[0]:[];drawPose(ctx,points,cv.width,cv.height);
     let r=document.hidden?null:readSquat(points,view,cv.width,cv.height,lockedSide);
     if(r){samples.push(r);if(samples.length>3)samples.shift();const current=r;r={...r};for(const key of ['leftKnee','rightKnee','kneeFlexion','torsoTilt','armAngle','shoulderTilt','hipTilt','kneeShiftLeft','kneeShiftRight','hipY','scale','centerX'] as const){const sorted=samples.map(s=>s[key]).sort((a,b)=>a-b);r[key]=sorted[Math.floor(sorted.length/2)];}r.side=current.side;}else samples.length=0;
     const previous=state;state=stepSquat(state,now,r,view);setReading(r);setCount(state.reps.length);
     if(state.phase==='calibrate'){lockedSide=undefined;best=undefined;}
     else if(r)lockedSide=r.side;
     if(state.peak&&state.peak!==previous.peak)best=snapshot(points);
     if(state.reps.length>previous.reps.length&&best){const shot=best;setPhotos(p=>({...p,[view]:shot}));best=undefined;}
     const labels={calibrate:'양팔을 머리 위로 올리고 똑바로 서서 1.2초 유지해 주세요.',ready:'준비 완료 · 천천히 앉았다가 완전히 일어서세요.',down:'동작 측정 중 · 통증 없는 범위에서 내려간 후 다시 서 주세요.',done:'3회 측정 완료'};
     setMessage(!r?(poses.length>1?'한 사람만 화면에 들어오세요.':view==='side'?'측면 인식 대기 · 몸을 90° 돌리고 가까운 쪽 손끝부터 발목까지 보이게 서 주세요.':'정면 인식 대기 · 손끝·어깨·골반·무릎·발목이 모두 보이게 거리를 조절해 주세요.'):labels[state.phase]);
     if(state.phase==='done'){
      if(view==='front'){setFront(state.reps);setView('side');setMessage('정면 3회 완료. 몸을 90° 돌리고 측면 촬영·측정 시작을 눌러 주세요.');}
      else {setSide(state.reps);if(front)setSaved({id:crypto.randomUUID(),data:{version:1,source:'camera',front:{reps:front},side:{reps:state.reps}}});setMessage('정면·측면 측정을 완료했습니다. 결과와 저장 상태를 확인하세요.');}
      setActive(false);
     }
    }catch{setMessage('관절 인식에 실패했습니다. 밝은 공간에서 다시 시작해 주세요.');setActive(false);}
   }frame=requestAnimationFrame(tick);
  }catch(e){if(!disposed){const name=e instanceof DOMException?e.name:'';setMessage(name==='NotAllowedError'?'카메라 권한이 차단됐습니다. 주소창의 사이트 설정에서 카메라를 허용해 주세요.':name==='NotFoundError'?'연결된 카메라를 찾지 못했습니다. USB 연결을 확인해 주세요.':name==='NotReadableError'?'다른 앱이 카메라를 사용 중입니다. 카메라 앱을 닫고 다시 시작하세요.':e instanceof Error?e.message:'카메라 연결을 확인해 주세요.');setActive(false);}}}
  void start();const visibility=()=>{if(document.hidden){setMessage('화면을 벗어나 이번 방향의 측정을 중단했습니다. 다시 시작해 주세요.');setActive(false);}};document.addEventListener('visibilitychange',visibility);
  return()=>{disposed=true;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());model?.close();document.removeEventListener('visibilitychange',visibility);};
 },[active,view,device,front]);
 function begin(){setCount(0);setReading(null);setMessage('카메라와 관절 추적을 준비하고 있어요…');setActive(true);}
 return <div className="care-app live-assessment squat-assessment"><header className="care-header"><Link href="/analyze/tests">← 검사 목록</Link><b>핸즈업 스쿼트</b><Link href="/customer">내 기록</Link></header><main className="care-main"><span className="eyebrow">정면 3회 · 측면 3회</span><h1>양팔을 올리고,<br/>천천히 앉았다 일어나요.</h1><SquatGuide/><div className="squat-progress"><span className={front?'complete':''}>1. 정면 {front?'3 / 3':'대기'}</span><span className={side?'complete':''}>2. 측면 {side?'3 / 3':'대기'}</span></div>{settingsError&&<p className="error-message" role="alert">{settingsError}</p>}{!active&&<><p className="care-notice" role="status">{message}</p>{!saved&&<button className="care-primary" disabled={!enabled} onClick={begin}>{view==='front'?'정면':'측면'} 촬영·측정 시작</button>}{devices.length>1&&<label>사용할 카메라<select value={device} onChange={e=>setDevice(e.target.value)}><option value="">기본 카메라</option>{devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`카메라 ${i+1}`}</option>)}</select></label>}</>}
 {active&&<section className="camera-screen" aria-label="핸즈업 스쿼트 전체화면 측정"><div className="camera-viewport"><video ref={video} playsInline muted style={{objectFit:fillFrame?'cover':'contain',transform:mirror?'scaleX(-1)':'none'}}/><canvas ref={canvas} aria-hidden="true" style={{objectFit:fillFrame?'cover':'contain',transform:mirror?'scaleX(-1)':'none',visibility:guides.skeleton?'visible':'hidden'}}/><MeasurementGuides settings={guides} onChange={setGuides}/><CameraChrome title={`${view==='front'?'정면':'측면'} · ${count}/3회`} progress={count/3} onClose={()=>{setActive(false);setMessage('측정을 중단했습니다. 이번 방향을 처음부터 다시 시작할 수 있습니다.');}}/><div className="live-reading">{count}<small> / 3회</small>{reading&&<span className="squat-live-detail">{view==='side'?`무릎 굽힘 ${reading.kneeFlexion.toFixed(1)}°`:`어깨 기울기 ${reading.shoulderTilt.toFixed(1)}°`}</span>}</div><p className="camera-instruction" role="status">{message}</p></div><div className="camera-controls"><GuideControls settings={guides} onChange={setGuides}/><div className="camera-options"><button onClick={()=>setMirror(m=>!m)} aria-pressed={mirror}>거울 {mirror?'ON':'OFF'}</button><button onClick={()=>setFillFrame(f=>!f)}>{fillFrame?'전체 영상 보기':'화면 채우기'}</button><button onClick={()=>{setActive(false);setMessage('측정을 중단했습니다. 이번 방향을 다시 시작해 주세요.');}}>측정 종료</button></div></div></section>}
 <div ref={resultBox}>{saved&&<><SquatReport data={saved.data}/><CustomerSave kind="squat" data={saved.data} clientId={saved.id}/></>}</div>{Object.keys(photos).length>0&&<section className="care-card"><h2>촬영 후 동작 확인</h2><p>마지막 완료 동작의 최저점입니다. 격자·기준선·관절 표시를 바꿔 확인하세요. 사진은 화면을 나가면 사라집니다.</p>{(['front','side'] as const).map(v=>photos[v]?<div key={v}><h3>{v==='front'?'정면':'측면'}</h3><MeasurementPhoto src={photos[v]!.src} landmarks={photos[v]!.landmarks} alt={`${v==='front'?'정면':'측면'} 스쿼트 최저점`}/></div>:null)}</section>}{!active&&(front||side)&&<button className="care-secondary" onClick={()=>{setFront(null);setSide(null);setSaved(null);setPhotos({});setView('front');setCount(0);setMessage('정면부터 다시 측정해 주세요. 이미 저장한 기록은 내 기록에 남습니다.');}}>정면부터 새로 검사</button>}</main></div>;
}
