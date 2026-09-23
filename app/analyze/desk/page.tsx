"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {PoseLandmarker} from '@mediapipe/tasks-vision';
import {freshDesk,inspectNeck,reliablePoint,stableNeck,stepDesk,type DeskStats,type DeskReport} from '@/lib/desk-posture';
import DeskPostureReport,{deskTime} from '@/components/DeskPostureReport';
import {CustomerSave} from '@/components/CustomerAccess';
import './desk.css';
type Mode='off'|'beep'|'voice';
export default function Page(){
 const [active,setActive]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[calibrated,setCalibrated]=useState(false),[enabled,setEnabled]=useState(false),[message,setMessage]=useState('옆모습이 보이도록 카메라를 고정한 뒤 시작하세요.'),[audioMessage,setAudioMessage]=useState(''),[mode,setMode]=useState<Mode>('beep'),[side,setSide]=useState<'auto'|'left'|'right'>('auto'),[threshold,setThreshold]=useState(12),[hold,setHold]=useState(8),[delta,setDelta]=useState<number|null>(null),[total,setTotal]=useState(0),[bad,setBad]=useState(false),[result,setResult]=useState<{id:string;data:DeskReport}|null>(null);
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),audio=useRef<AudioContext|null>(null),stats=useRef<DeskStats|null>(null),baseline=useRef(0),startedAt=useRef(''),pause=useRef(false),calibrate=useRef(false),resultBox=useRef<HTMLDivElement>(null);
 useEffect(()=>{let alive=true;fetch('/api/customer/auth').then(r=>r.json()).then(d=>{if(alive){setEnabled(d.settings?.cameraEnabled===true);if(!d.settings?.cameraEnabled)setMessage('센터에서 카메라 기능을 잠시 중단했습니다.');}}).catch(()=>{if(alive)setMessage('설정을 불러오지 못했습니다. 새로고침해 주세요.');});return()=>{alive=false;};},[]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();void audio.current?.close().catch(()=>{});},[]);
 useEffect(()=>{if(result)resultBox.current?.scrollIntoView({behavior:'smooth'});},[result]);
 const sound=useCallback((selected:Mode)=>{
  if(selected==='off')return;
  try{
   if(selected==='voice'&&'speechSynthesis' in window){if(window.speechSynthesis.speaking)return;const utterance=new SpeechSynthesisUtterance('고개를 편안하게 올리고 기준 자세로 돌아와 주세요.');utterance.lang='ko-KR';utterance.rate=.95;utterance.onerror=()=>setAudioMessage('음성을 재생하지 못했습니다. 기기의 소리 설정을 확인하거나 경고음을 선택하세요.');window.speechSynthesis.speak(utterance);return;}
   if(selected==='voice'){setAudioMessage('이 브라우저는 음성을 지원하지 않아 경고음으로 알립니다.');}
   if(!audio.current||audio.current.state==='closed')audio.current=new AudioContext();
   const ctx=audio.current;void ctx.resume().then(()=>{if(ctx.state!=='running'){setAudioMessage('소리가 차단됐습니다. 알림 테스트를 누르고 볼륨을 확인하세요.');return;}const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=660;gain.gain.setValueAtTime(.08,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.32);}).catch(()=>setAudioMessage('경고음을 재생할 수 없습니다. 기기 볼륨을 확인하세요.'));
  }catch{setAudioMessage('이 브라우저에서는 소리 알림을 사용할 수 없습니다. 화면 알림을 확인해 주세요.');}
 },[]);
 const finish=useCallback((reason='측정을 종료했습니다.')=>{
  const s=stats.current;if(s){const r=stepDesk(s,performance.now(),null,threshold,hold*1000).stats;setResult({id:crypto.randomUUID(),data:{source:'camera',startedAt:startedAt.current,endedAt:new Date().toISOString(),totalMs:r.totalMs,validMs:r.validMs,badMs:r.badMs,longestBadMs:r.longestBadMs,averageDelta:r.validMs?r.sumDeltaMs/r.validMs:0,maxDelta:r.maxDelta,alerts:r.alerts,threshold,holdSeconds:hold,alertMode:mode,baseline:baseline.current}});stats.current=null;}
  setActive(false);setReady(false);setDelta(null);setMessage(reason);window.speechSynthesis?.cancel();void audio.current?.close().catch(()=>{});audio.current=null;
 },[threshold,hold,mode]);
 useEffect(()=>{
  if(!active)return;let disposed=false,stream:MediaStream|null=null,model:PoseLandmarker|null=null,timer:ReturnType<typeof setInterval>|undefined,lastVideo=-1,smooth:number|null=null;
  let lockedSide:'left'|'right'|null=null;let sampleSide:'left'|'right'|null=null;
  let base:{angle:number;size:number;direction:number}|null=null;let samples:{angle:number;size:number;direction:number;time:number}[]=[];
  const invalidate=(now:number,text:string)=>{smooth=null;if(stats.current){stats.current=stepDesk(stats.current,now,null,threshold,hold*1000).stats;setTotal(stats.current.totalMs);}setDelta(null);setBad(false);setMessage(text);};
  async function start(){try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('카메라를 지원하는 HTTPS 브라우저에서 열어주세요.');
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:720}},audio:false});if(disposed){stream.getTracks().forEach(t=>t.stop());return;}
   stream.getVideoTracks().forEach(t=>{t.onended=()=>{if(!disposed)finish('카메라 연결이 끊겨 측정을 종료했습니다.');};});
   const v=video.current!;v.srcObject=stream;await v.play();
   const {FilesetResolver,PoseLandmarker:Pose}=await import('@mediapipe/tasks-vision');const files=await FilesetResolver.forVisionTasks('/mediapipe/wasm');
   const create=(delegate:'GPU'|'CPU')=>Pose.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',delegate},runningMode:'VIDEO',numPoses:2,minPoseDetectionConfidence:.65,minTrackingConfidence:.65});
   try{model=await create('GPU');}catch{model=await create('CPU');}if(disposed){model.close();return;}setReady(true);setMessage('귀와 어깨가 보이면 아래 ‘기준 자세 5초 설정’을 누르세요.');
   timer=setInterval(()=>{if(disposed)return;const now=performance.now();
    if(stats.current&&stats.current.totalMs>=8*3600000){finish('8시간 측정을 완료했습니다.');return;}
    if(pause.current||document.hidden){invalidate(now,'일시정지 중 · 이 시간은 자세 평가에서 제외됩니다.');return;}
    if(v.readyState<2||v.currentTime===lastVideo){invalidate(now,'카메라 영상을 기다리고 있습니다.');return;}lastVideo=v.currentTime;
    try{
     const poses=model!.detectForVideo(v,now).landmarks;const p=poses.length===1?poses[0]:[];const detection=inspectNeck(p,v.videoWidth,v.videoHeight,lockedSide??(calibrate.current?sampleSide:null)??side);const reading=detection.reading;
     const cv=canvas.current!;cv.width=v.videoWidth;cv.height=v.videoHeight;const ctx=cv.getContext('2d')!;ctx.clearRect(0,0,cv.width,cv.height);
     // Draw every reliable point, even if another landmark is temporarily missing.
     const selected=detection.side;const e=p[selected==='left'?7:8],shoulder=p[selected==='left'?11:12];
     ctx.strokeStyle='#32d5b8';ctx.lineWidth=4;
     if(reliablePoint(e)&&reliablePoint(shoulder)){ctx.beginPath();ctx.moveTo(e.x*cv.width,e.y*cv.height);ctx.lineTo(shoulder.x*cv.width,shoulder.y*cv.height);ctx.stroke();}
     detection.points.forEach((q,i)=>{if(!reliablePoint(q))return;const x=q.x*cv.width,y=q.y*cv.height;ctx.fillStyle='#32d5b8';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.font='bold 18px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#10251e';ctx.strokeText(['코','귀','어깨'][i],x+10,y-10);ctx.fillStyle='white';ctx.fillText(['코','귀','어깨'][i],x+10,y-10);ctx.strokeStyle='#32d5b8';ctx.lineWidth=4;});
     if(!reading){invalidate(now,poses.length>1?'한 사람만 화면에 보여야 합니다.':detection.message);return;}
     if(!base){if(!calibrate.current){setMessage(`${selected==='left'?'왼쪽':'오른쪽'} 코·귀·어깨 인식 완료 · 편안한 자세에서 기준 자세 설정을 눌러주세요.`);return;}
      if(sampleSide!==selected){samples=[];sampleSide=selected;}
      const calibration=stableNeck(samples,{...reading,time:now});samples=calibration.samples;
      const elapsed=now-samples[0].time;setMessage(`기준 자세 설정 중 · ${Math.min(5,elapsed/1000).toFixed(1)} / 5초${elapsed>=5000?' · 자세를 조금 더 유지해 주세요.':''}`);if(!calibration.ready)return;
      base={angle:calibration.angle,size:calibration.size,direction:calibration.direction};lockedSide=selected;baseline.current=base.angle;stats.current=freshDesk(now);startedAt.current=new Date().toISOString();calibrate.current=false;setCalibrated(true);
     }
     if(reading.direction!==base.direction||Math.abs(reading.size/base.size-1)>.4){invalidate(now,'카메라 거리나 방향이 바뀌었습니다. 원래 위치로 돌아오거나 종료 후 기준을 다시 설정하세요.');return;}
     const raw=reading.angle-base.angle;smooth=smooth===null?raw:smooth*.65+raw*.35;const next=stepDesk(stats.current!,now,smooth,threshold,hold*1000);stats.current=next.stats;
     setDelta(smooth);setTotal(next.stats.totalMs);setBad(next.stats.previousBad);setMessage(next.stats.previousBad?`고개를 편안하게 올려 기준 자세로 돌아와 주세요. (${(next.stats.streakMs/1000).toFixed(0)}초)`:'기준 자세 범위를 유지하고 있습니다.');if(next.alert)sound(mode);
    }catch{finish('자세 인식에 오류가 발생해 측정을 종료했습니다. 결과를 확인하고 다시 시작해 주세요.');}
   },200);
  }catch(e){if(!disposed)finish(e instanceof Error?e.message:'카메라를 시작하지 못했습니다.');}}
  void start();
  const visibility=()=>{if(document.hidden){invalidate(performance.now(),'화면이 보이지 않아 측정을 일시정지했습니다.');window.speechSynthesis?.cancel();}};document.addEventListener('visibilitychange',visibility);
  return()=>{disposed=true;if(timer)clearInterval(timer);stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});model?.close();window.speechSynthesis?.cancel();void audio.current?.close().catch(()=>{});audio.current=null;document.removeEventListener('visibilitychange',visibility);};
 },[active,side,threshold,hold,mode,finish,sound]);
 return <div className="care-app desk-app"><header className="care-header"><Link href="/">← 홈</Link><b>업무 자세 알림</b><Link href="/customer">내 기록</Link></header><main className="care-main"><h1>업무 중, 고개를 편안하게</h1><p className="muted">기준 자세와 비교해 고개가 앞으로 기운 상태를 감지하고 알려드립니다.</p>
 <details className="care-card" open={!active}><summary>사용 방법 · 카메라 설치 안내</summary><ol><li>휴대폰이나 웹캠을 몸의 <b>옆쪽</b>에 고정하세요. 귀·코·어깨와 상체가 충분히 보이고 카메라가 기울지 않도록 합니다.</li><li>기본 자동 선택은 잘 보이는 쪽의 귀와 어깨를 찾습니다. 기준 설정 후에는 같은 쪽을 유지합니다. 정면 노트북 카메라에서는 앞으로 나온 자세를 정확히 구분하기 어렵습니다.</li><li>알림 방식과 민감도를 선택하고 ‘알림 테스트’로 소리를 확인합니다.</li><li>카메라를 켠 뒤 화면을 편안하게 바라보며 앉고 ‘기준 자세 5초 설정’을 누르세요. 움직이지 않고 5초 유지하면 자동 측정이 시작됩니다.</li><li>업무 중 이 페이지를 보이는 상태로 유지하세요. 다른 작업과 함께 창을 나란히 두거나 별도 휴대폰을 사용하세요. 탭 전환·화면 잠금·앱 최소화 중에는 측정과 알림이 중단됩니다.</li><li>종료 버튼을 누르면 평가가 표시됩니다. 로그인하면 요약 수치가 내 기록과 관리자 화면에 저장됩니다.</li></ol><p className="muted small">2차원 영상에서 귀–어깨 선의 기준 대비 변화를 보는 생활습관 보조 기능입니다. 알림 기준은 의료 진단 기준이 아닙니다. 카메라 위치나 의자를 옮기면 종료 후 다시 기준을 잡으세요. 영상·음성은 녹화하거나 서버에 전송하지 않습니다. 처음 실행할 때 인식 모델을 내려받습니다.</p></details>
 <fieldset disabled={active} className="care-card desk-options"><legend>알림 설정</legend><label>카메라에 보이는 쪽<select value={side} onChange={e=>setSide(e.target.value as 'auto'|'left'|'right')}><option value="auto">자동 · 잘 보이는 쪽</option><option value="left">왼쪽 옆모습</option><option value="right">오른쪽 옆모습</option></select></label><label>알림 방식<select value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="beep">경고음</option><option value="voice">한국어 음성 안내</option><option value="off">무음 · 화면 안내만</option></select></label><label>민감도 (기준 대비)<select value={threshold} onChange={e=>setThreshold(+e.target.value)}><option value="8">민감 · 8°</option><option value="12">보통 · 12°</option><option value="16">여유 · 16°</option></select></label><label>지속 시간<select value={hold} onChange={e=>setHold(+e.target.value)}><option value="5">5초</option><option value="8">8초</option><option value="15">15초</option></select></label></fieldset><button className="care-secondary" onClick={()=>sound(mode)}>알림 테스트</button><p className="muted small">소리 알림은 기기 볼륨·무음 설정과 브라우저 지원에 영향을 받습니다. 알림은 최대 30초에 한 번 울립니다.</p><p role="status">{audioMessage}</p>
 {active&&<section className="desk-camera"><div className="desk-video"><video ref={video} playsInline muted/><canvas ref={canvas}/></div><div className={`desk-status ${bad?'desk-warning':''}`} role="status">{message}<strong>{delta===null?'인식 대기':`기준 대비 ${delta>0?'+':''}${delta.toFixed(1)}°`}</strong></div></section>}{!active&&<p role="status">{message}</p>}
 {active?<><p className="desk-time">측정 시간 {deskTime(total)} {paused?'· 일시정지':''}</p><div className="desk-buttons"><button className="care-secondary" disabled={!ready||delta!==null||calibrated} onClick={()=>{calibrate.current=true;setMessage('기준 자세를 5초 유지해 주세요.');}}>기준 자세 5초 설정</button><button className="care-secondary" onClick={()=>{pause.current=!pause.current;setPaused(pause.current);window.speechSynthesis?.cancel();}}>{paused?'측정 재개':'일시정지'}</button><button className="care-primary" onClick={()=>finish()}>종료 · 평가 보기</button></div><p className="muted small">일시정지 중 카메라 미리보기는 유지됩니다. 종료하면 카메라가 꺼집니다.</p></>:<button className="care-primary" disabled={!enabled} onClick={()=>{stats.current=null;pause.current=false;calibrate.current=false;setPaused(false);setResult(null);setCalibrated(false);setTotal(0);setBad(false);setMessage('카메라와 인식 모델을 준비하고 있습니다…');try{audio.current=new AudioContext();void audio.current.resume().catch(()=>{});}catch{}setActive(true);}}>카메라 켜고 자세 알림 시작</button>}
 {result&&<div ref={resultBox}><DeskPostureReport data={result.data}/>{result.data.validMs>=10000&&<CustomerSave kind="desk" data={result.data} clientId={result.id}/>}</div>}
 </main></div>;
}
