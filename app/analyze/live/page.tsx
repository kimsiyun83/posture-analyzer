"use client";
import {Suspense,useEffect,useRef,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {FilesetResolver,PoseLandmarker} from "@mediapipe/tasks-vision";
import {freshBalance,stepBalance,visible,jointAngle,medianAngle,balanceFeet} from "@/lib/pose/live";
import BalanceMeasurementGuide from "@/components/BalanceMeasurementGuide";
import JointMeasurementGuide from "@/components/JointMeasurementGuide";
import {CustomerSave} from "@/components/CustomerAccess";
export default function Page(){return <Suspense><LiveRoute/></Suspense>;}
function LiveRoute(){const key=useSearchParams().get("test")||"shoulder";return <Live key={key}/>;}
function Live(){
 const param=useSearchParams().get("test");const kind=param==="elbow"?"elbow":param==="balance"?"balance":"shoulder";
 const [side,setSide]=useState<"left"|"right">("left"),[active,setActive]=useState(false),[enabled,setEnabled]=useState(false),[message,setMessage]=useState("카메라를 켜고 안내에 따라 주세요."),[value,setValue]=useState<number|null>(null),[peak,setPeak]=useState<number|null>(null),[results,setResults]=useState<{left?:number;right?:number}>({}),[complete,setComplete]=useState<{id:string;data:{left:number;right:number;source:string}}|null>(null),[attempt,setAttempt]=useState(0);
 const [mirror,setMirror]=useState(true);
 const [fillFrame,setFillFrame]=useState(true);
 const resetBalance=useRef(false);
 const selectedSide=useRef<"left"|"right">("left");
 const resultBox=useRef<HTMLElement>(null);
 useEffect(()=>{if(complete)resultBox.current?.scrollIntoView({behavior:"smooth",block:"start"});},[complete]);
 const cameraBox=useRef<HTMLDivElement>(null);
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),measured=useRef<number|null>(null);
 useEffect(()=>{fetch("/api/customer/auth").then(r=>r.json()).then(d=>{setEnabled(d.settings.cameraEnabled);if(!d.settings.cameraEnabled)setMessage("센터에서 카메라 검사를 잠시 중단했습니다.");}).catch(()=>setMessage("검사 설정을 불러오지 못했습니다. 새로고침해 주세요."));},[]);
 useEffect(()=>{
  if(!active)return;let cancelled=false,frame=0,stream:MediaStream|null=null,model:PoseLandmarker|null=null,last=0,lastVideo=-1,smooth:number|null=null,maximum:number|null=null,validSince=0;const samples:number[]=[];
  let balance=freshBalance(),measuringSide=selectedSide.current;
  const pair:{left?:number;right?:number}={};let switchUntil=0,finished=false;
  resetBalance.current=false;measured.current=null;
  async function start(){try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error("이 브라우저에서는 카메라를 지원하지 않습니다.");
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:720},height:{ideal:960},aspectRatio:{ideal:.75}},audio:false});
   if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}
   const v=video.current!;v.srcObject=stream;await v.play();cameraBox.current?.scrollIntoView({behavior:"smooth",block:"start"});
   const files=await FilesetResolver.forVisionTasks("/mediapipe/wasm");
   const create=(delegate:"GPU"|"CPU")=>PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",delegate},runningMode:"VIDEO",numPoses:2,minPoseDetectionConfidence:.65,minTrackingConfidence:.65});
   try{model=await create("GPU");}catch{model=await create("CPU");}
   if(cancelled){model.close();return;}
   function tick(now:number){if(cancelled||finished)return;frame=requestAnimationFrame(tick);if(now-last<50||v.readyState<2||v.currentTime===lastVideo)return;last=now;lastVideo=v.currentTime;
    try{
     const out=model!.detectForVideo(v,now),p=out.landmarks.length===1?out.landmarks[0]:[];
     const left=measuringSide==="left",indices=kind==="balance"?[11,12,23,24,27,28]:kind==="elbow"?(left?[11,13,15]:[12,14,16]):(left?[23,11,13]:[24,12,14]);
     const valid=!document.hidden&&visible(p,indices);const cv=canvas.current!,ctx=cv.getContext("2d")!;cv.width=v.videoWidth;cv.height=v.videoHeight;ctx.clearRect(0,0,cv.width,cv.height);
     if(valid){ctx.strokeStyle="#14c9ad";ctx.fillStyle="#14c9ad";ctx.lineWidth=5;ctx.beginPath();const edges=kind==="balance"?[[11,12],[11,23],[12,24],[23,24],[23,27],[24,28]]:[[indices[0],indices[1]],[indices[1],indices[2]]];edges.forEach(([a,b])=>{ctx.moveTo(p[a].x*cv.width,p[a].y*cv.height);ctx.lineTo(p[b].x*cv.width,p[b].y*cv.height);});ctx.stroke();indices.forEach(i=>{ctx.beginPath();ctx.arc(p[i].x*cv.width,p[i].y*cv.height,7,0,Math.PI*2);ctx.fill();});}
     if(kind==="balance"){
      if(resetBalance.current){balance=freshBalance();switchUntil=0;resetBalance.current=false;}
      if(now<switchUntil)return;
      balance=stepBalance(balance,now,valid?balanceFeet(p,left):null);
      setValue(balance.seconds);
      const labels={prepare:"준비 중 · 양발을 바닥에 두고 움직이지 마세요. ‘준비 완료’ 후 발을 들어 주세요.",ready:`준비 완료 · ${left?"오른발":"왼발"}을 들어 주세요. 자동으로 시작합니다.`,timing:"측정 중 · 든 발을 내리면 자동 종료됩니다.",done:"자동 측정 완료 · 반대쪽 발도 검사해 주세요.",invalid:"관절 추적 또는 지지발 위치가 달라졌습니다. 다시 측정해 주세요."};setMessage(valid?labels[balance.phase]:"인식 대기 · 어깨·골반·양쪽 발목이 모두 보이게 서 주세요.");
      if(balance.phase==="done"){
       pair[measuringSide]=Math.round(balance.seconds*10)/10;setResults({...pair});
       if(pair.left!==undefined&&pair.right!==undefined){
        finished=true;setComplete({id:crypto.randomUUID(),data:{left:pair.left,right:pair.right,source:"camera"}});
        setMessage("양쪽 검사 완료 · 아래에서 계정 저장 상태를 확인해 주세요.");setActive(false);
       }else{
        const recorded=pair[measuringSide]!;
        measuringSide=measuringSide==="left"?"right":"left";selectedSide.current=measuringSide;setSide(measuringSide);
        balance=freshBalance();switchUntil=now+2500;setValue(null);
        setMessage(`${left?"왼쪽":"오른쪽"} 지지발 ${recorded.toFixed(1)}초 기록 완료 · 양발을 내려놓으세요. 다음은 ${measuringSide==="left"?"왼쪽":"오른쪽"} 지지발 검사입니다.`);
       }
      }
      else if(balance.phase==="invalid"){setMessage("이번 측정은 저장되지 않았습니다. 양발을 내려놓고 ‘다시 준비’를 누르세요. 선택한 지지발은 바닥에 두세요.");}
     }else{
      if(!valid){validSince=0;smooth=null;samples.length=0;setValue(null);setMessage("측정할 어깨·팔꿈치·손목을 화면 안에 보여 주세요.");return;}
      if(!validSince)validSince=now;
      const angle=jointAngle(p[indices[0]],p[indices[1]],p[indices[2]],cv.width,cv.height);if(angle===null){setValue(null);validSince=0;samples.length=0;setMessage("측정 부위가 너무 작게 보입니다. 카메라를 가까이 두고 옆으로 서 주세요.");return;}
      const reading=kind==="elbow"?180-angle:angle;samples.push(reading);if(samples.length>3)samples.shift();const filtered=medianAngle(samples);smooth=smooth===null?filtered:smooth*.4+filtered*.6;
      setValue(Math.round(smooth*10)/10);if(now-validSince>=600){maximum=Math.max(maximum??0,smooth);measured.current=Math.round(maximum*10)/10;setPeak(measured.current);}
      setMessage("통증 없는 범위에서 천천히 움직이고 최대 각도 기록을 눌러 주세요.");
     }
    }catch{setMessage("관절 인식에 실패했습니다. 카메라를 다시 시작해 주세요.");setActive(false);}
   }
   frame=requestAnimationFrame(tick);
  }catch(e){if(!cancelled){setMessage(e instanceof Error?e.message:"카메라 접근을 허용해 주세요.");setActive(false);}}}
  void start();
  const visibility=()=>{if(document.hidden){setMessage("화면을 벗어나 측정을 중단했습니다. 다시 시작해 주세요.");setActive(false);}};document.addEventListener("visibilitychange",visibility);
  return()=>{cancelled=true;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());model?.close();document.removeEventListener("visibilitychange",visibility);};
 },[active,kind,attempt]);
 const balance=kind==="balance";
 return <div className="care-app live-assessment"><header className="care-header"><Link href="/analyze/tests">← 검사 목록</Link><b>실시간 카메라 검사</b></header><main className="care-main"><h1>{balance?"한발서기 자동 측정":kind==="elbow"?"팔꿈치 굽힘 각도":"어깨 올림 각도"}</h1><section className="care-card"><p>{balance?"정면에서 전신과 바닥이 보이게 촬영하세요. 측정할 지지발을 선택하고 양발로 선 뒤 반대쪽 발을 들어 주세요. 발을 내리면 시간을 기록하고 반대쪽으로 자동 전환합니다. 양쪽 완료 후 계정에 자동 저장합니다(로그인 필요). 최대 180초까지 측정합니다.":"측정할 팔이 카메라 쪽을 향하도록 서세요. 어깨 올림은 몸통–어깨–팔꿈치, 팔꿈치 굽힘은 어깨–팔꿈치–손목을 기준으로 측정합니다."}</p><p className="muted small">카메라 영상의 2차원 참고 수치입니다. 실제 관절 가동범위 진단을 대신하지 않습니다. {balance?"손으로 벽을 짚는 동작은 자동 판별하지 못합니다. 직원과 함께 안전한 공간에서 검사하세요.":"카메라와 팔의 방향을 맞추고 몸통을 움직이지 마세요."} 영상은 서버에 저장하지 않습니다.</p></section>{balance&&<BalanceMeasurementGuide side={side}/>} {!balance&&<details className="care-card"><summary>측정 자세 예시 보기</summary><JointMeasurementGuide kind={kind}/></details>}<div className="goal-options">{(["left","right"] as const).map(s=><button key={s} disabled={active} aria-pressed={side===s} onClick={()=>{selectedSide.current=s;setSide(s);setValue(null);setPeak(null);measured.current=null;setComplete(null);}}>{s==="left"?"왼쪽":"오른쪽"} {balance?"지지발":"팔"}</button>)}</div><button type="button" className="care-secondary" aria-pressed={mirror} onClick={()=>setMirror(m=>!m)}>좌우 반전 · 거울 모드 {mirror?"켜짐":"꺼짐"}</button><button type="button" className="care-secondary" aria-pressed={fillFrame} onClick={()=>setFillFrame(f=>!f)}>{fillFrame?"화면 채움 · 전체 영상 보기":"전체 영상 · 크게 보기"}</button><p className="muted small">화면 채움은 가장자리가 일부 잘릴 수 있습니다. 머리·발 또는 팔이 잘리면 전체 영상으로 전환하세요.</p><div ref={cameraBox} className={`live-camera${mirror?" live-camera-mirrored":""}`}><video ref={video} playsInline muted style={{objectFit:fillFrame?"cover":"contain",objectPosition:"center",transform:mirror?"scaleX(-1)":"none"}}/><canvas ref={canvas} style={{objectFit:fillFrame?"cover":"contain",objectPosition:"center",transform:mirror?"scaleX(-1)":"none"}}/><div className="live-camera-status" role="status">{message}</div><div className="live-reading">{value===null?"—":balance?value.toFixed(1):value}{balance?"초":"°"}</div></div>{balance&&active&&<button type="button" className="care-secondary" onClick={()=>{resetBalance.current=true;setValue(null);setComplete(null);}}>다시 준비 · 카메라 유지</button>}{!balance&&<p>이번 최대 각도: {peak??"—"}°</p>}<button className="care-primary" disabled={!enabled} onClick={()=>{if(balance&&!active)setResults({});setComplete(null);setValue(null);setPeak(null);setMessage("카메라와 관절 인식을 준비하고 있습니다…");setActive(a=>!a);setAttempt(a=>a+1);}}>{active?"측정 취소 · 카메라 끄기":"카메라 켜고 측정 시작"}</button>{!balance&&<button className="care-secondary" disabled={!active||peak===null} onClick={()=>{if(measured.current!==null){setResults(r=>({...r,[side]:measured.current!}));setActive(false);setMessage("각도를 기록했습니다. 반대쪽도 측정해 주세요.");}}}>이번 최대 각도 기록</button>}<section ref={resultBox} className="care-card"><h2>좌우 검사 결과</h2><p>왼쪽 {results.left??"미측정"} / 오른쪽 {results.right??"미측정"} {balance?"초":"°"}</p><button className="care-primary" disabled={active||results.left===undefined||results.right===undefined||!!complete} onClick={()=>setComplete({id:crypto.randomUUID(),data:{left:results.left!,right:results.right!,source:"camera"}})}>검사 완료 · 계정에 저장</button></section>{complete&&<CustomerSave kind={kind} data={complete.data} clientId={complete.id}/>}</main></div>;
}
