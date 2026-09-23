export type Point={x:number;y:number;visibility?:number;z?:number};
export type DeskSide='left'|'right';
export const reliablePoint=(q:Point|undefined)=>!!q&&Number.isFinite(q.x)&&Number.isFinite(q.y)&&(q.visibility??0)>=.6&&q.x>.02&&q.x<.98&&q.y>.02&&q.y<.98;
export function neckReading(p:Point[],width:number,height:number,side:'left'|'right'){
 const e=p[side==='left'?7:8],s=p[side==='left'?11:12],n=p[0],otherEar=p[side==='left'?8:7];
 const visible=reliablePoint;
 if(!visible(e)||!visible(s)||!visible(n)||width<=0||height<=0)return null;
 const dx=(e.x-s.x)*width,dy=(s.y-e.y)*height,size=Math.hypot(dx,dy),facing=(n.x-e.x)*width;
 if(dy<25||size<45||Math.abs(facing)<size*.08)return null;
 // Shoulder width varies with seated rotation and arm placement; it cannot
 // determine whether the face is side-on. Reject a centered, frontal face instead.
 if(visible(otherEar)){
  const a=(n.x-e.x)*width,b=(n.x-otherEar.x)*width;
  if(a*b<0&&Math.min(Math.abs(a),Math.abs(b))/Math.max(Math.abs(a),Math.abs(b))>.65)return null;
 }
 return {angle:Math.atan2(Math.sign(facing)*dx,dy)*180/Math.PI,size,direction:Math.sign(facing)};
}
export function inspectNeck(p:Point[],width:number,height:number,side:DeskSide|'auto'){
 const candidates:DeskSide[]=side==='auto'?['left','right']:[side];
 const ranked=candidates.map(selected=>{
  const points=[p[0],p[selected==='left'?7:8],p[selected==='left'?11:12]];
  const reading=neckReading(p,width,height,selected);
  return {side:selected,points,reading,quality:Math.min(...points.map(q=>q?.visibility??0))-Math.max(-.3,Math.min(.3,((points[1]?.z??0)+(points[2]?.z??0))/2))};
 }).sort((a,b)=>Number(!!b.reading)-Number(!!a.reading)||b.quality-a.quality);
 const best=ranked[0];const labels=['코','귀','어깨'];
 const missing=labels.filter((_,i)=>!reliablePoint(best.points[i]));
 return {...best,message:!p.length?'상체가 보이도록 앉아 주세요.':missing.length?`${missing.join('·')} 인식이 약합니다. 가림을 없애고 조명과 카메라 위치를 조절하세요.`:!best.reading?'몸의 옆모습이 보이도록 카메라를 옮기고 귀부터 어깨까지 화면에 담아 주세요.':''};
}
// Frontal monitoring is a relative image-space index, never a neck angle.
export function inspectFront(p:Point[],width:number,height:number){
 const points=[p[0],p[2],p[5],p[11],p[12]],labels=['코','왼눈','오른눈','왼어깨','오른어깨'];
 const missing=labels.filter((_,i)=>!reliablePoint(points[i]));
 const fail=(message:string)=>({side:'left' as DeskSide,points,reading:null,message});
 if(missing.length)return fail(`${missing.join('·')}가 보이도록 얼굴과 양쪽 어깨를 화면에 담아 주세요.`);
 const [nose,leftEye,rightEye,left,right]=points;
 const span=Math.abs(left.x-right.x)*width,eyeSpan=Math.abs(leftEye.x-rightEye.x)*width;
 const midX=(leftEye.x+rightEye.x)/2,eyeY=(leftEye.y+rightEye.y)/2,shoulderY=(left.y+right.y)/2;
 if(span<60||eyeSpan<15||shoulderY<=nose.y)return fail('카메라 높이를 조절해 얼굴과 양쪽 어깨가 충분히 보이게 해주세요.');
 if(Math.abs(nose.x-midX)*width>eyeSpan*.65)return fail('정면 측정 중입니다. 얼굴을 화면 쪽으로 돌려주세요.');
 const angle=Math.max(-90,Math.min(90,60*(nose.y-eyeY)*height/eyeSpan-50*(shoulderY-nose.y)*height/span));
 return {side:'left' as DeskSide,points,reading:{angle,size:span,direction:1},message:''};
}
// Do not carry missing points forward. Reject sudden landmark jumps for one frame,
// then accept a persistent new position so recovery does not become stuck.
export function smoothDeskPoints(previous:Point[],current:Point[]){
 return current.map((q,i)=>{const old=previous[i];if(!reliablePoint(q)||!reliablePoint(old))return q;
  if(Math.hypot(q.x-old.x,q.y-old.y)>.12)return {...q,visibility:0};
  return {...q,x:old.x*.5+q.x*.5,y:old.y*.5+q.y*.5};
 });
}
export type NeckSample={angle:number;size:number;direction:number;time:number};
export function stableNeck(samples:NeckSample[],reading:NeckSample){
 // Brief dropouts do not discard the entire calibration. Long gaps reset it.
 let next=samples.length&&reading.time-samples[samples.length-1].time>800?[]:samples;
 next=[...next,reading].filter(s=>reading.time-s.time<=6000);
 const median=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
 const angle=median(next.map(s=>s.angle)),size=median(next.map(s=>s.size));
 const stable=next.filter(s=>s.direction===reading.direction&&Math.abs(s.angle-angle)<=4&&Math.abs(s.size/size-1)<=.15);
 const ready=next.length>=10&&reading.time-next[0].time>=5000&&stable.length/next.length>=.85&&Math.abs(reading.angle-angle)<=4;
 return {samples:next,ready,angle,size,direction:reading.direction};
}
export type DeskStats={totalMs:number;validMs:number;badMs:number;longestBadMs:number;sumDeltaMs:number;maxDelta:number;alerts:number;streakMs:number;last:number;previousBad:boolean;lastAlert:number};
export const freshDesk=(now:number):DeskStats=>({totalMs:0,validMs:0,badMs:0,longestBadMs:0,sumDeltaMs:0,maxDelta:0,alerts:0,streakMs:0,last:now,previousBad:false,lastAlert:-Infinity});
export function stepDesk(s:DeskStats,now:number,delta:number|null,threshold:number,holdMs:number){
 const dt=Math.max(0,now-s.last),r={...s,last:now,totalMs:s.totalMs+dt};let alert=false;
 if(delta===null||!Number.isFinite(delta)||dt>1000){r.streakMs=0;r.previousBad=false;return {stats:r,alert};}
 const bad=delta>=(s.previousBad?threshold-3:threshold);
 r.validMs+=dt;r.sumDeltaMs+=Math.max(0,delta)*dt;r.maxDelta=Math.max(s.maxDelta,delta);
 r.previousBad=bad;r.streakMs=bad?(s.previousBad?s.streakMs:0)+dt:0;
 if(bad)r.badMs+=dt;r.longestBadMs=Math.max(s.longestBadMs,r.streakMs);
 if(bad&&r.streakMs>=holdMs&&now-s.lastAlert>=30000){alert=true;r.lastAlert=now;r.alerts++;}
 return {stats:r,alert};
}
export type DeskReport={measurementMode?:'front'|'side';source:'camera';startedAt:string;endedAt:string;totalMs:number;validMs:number;badMs:number;longestBadMs:number;averageDelta:number;maxDelta:number;alerts:number;threshold:number;holdSeconds:number;alertMode:'off'|'beep'|'voice';baseline:number};
export function validDeskReport(d:unknown):d is DeskReport{
 if(!d||typeof d!=='object')return false;const r=d as DeskReport;
 const num=(v:unknown,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 return (r.measurementMode===undefined||['front','side'].includes(r.measurementMode))&&r.source==='camera'&&typeof r.startedAt==='string'&&typeof r.endedAt==='string'&&Number.isFinite(Date.parse(r.startedAt))&&Date.parse(r.endedAt)>=Date.parse(r.startedAt)&&num(r.totalMs,86400000)&&num(r.validMs,r.totalMs)&&r.validMs>=10000&&num(r.badMs,r.validMs)&&num(r.longestBadMs,r.badMs)&&num(r.averageDelta,180)&&num(r.maxDelta,180)&&num(r.alerts,10000)&&Number.isInteger(r.alerts)&&[8,12,16].includes(r.threshold)&&[5,8,15].includes(r.holdSeconds)&&['off','beep','voice'].includes(r.alertMode)&&Number.isFinite(r.baseline)&&Math.abs(r.baseline)<=90;
}
