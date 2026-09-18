export type Point={x:number;y:number;visibility?:number};
export function jointAngle(a:Point,b:Point,c:Point,width:number,height:number){
 const u=[(a.x-b.x)*width,(a.y-b.y)*height],v=[(c.x-b.x)*width,(c.y-b.y)*height];
 const den=Math.hypot(...u)*Math.hypot(...v);if(Math.hypot(...u)<20||Math.hypot(...v)<20)return null;
 return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/den)))*180/Math.PI;
}
export function visible(points:Point[],indices:number[]){return indices.every(i=>{const p=points[i];return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??0)>=.65&&p.x>.02&&p.x<.98&&p.y>.02&&p.y<.98;});}
export type BalanceState={phase:"prepare"|"ready"|"timing"|"done"|"invalid";since:number;liftAt:number;downAt:number;last:number;baseDiff:number;floor:number;seconds:number;driftAt:number};
export function freshBalance():BalanceState{return {phase:"prepare",since:0,liftAt:0,downAt:0,last:0,baseDiff:0,floor:0,seconds:0,driftAt:0};}
export function stepBalance(s:BalanceState,now:number,feet:{support:number;raised:number;scale:number}|null):BalanceState{
 if(s.phase==="done"||s.phase==="invalid")return s;
 // Brief detector dropout is recoverable; long gaps invalidate rather than inventing time.
 const gap=s.last>0?now-s.last:0;
 if(gap>500)return s.phase==="timing"?{...s,phase:"invalid",seconds:0}:freshBalance();
 if(!feet||!Number.isFinite(feet.scale)||feet.scale<.04){
  if(s.phase==="timing")return {...s,downAt:0,driftAt:0};
  return {...freshBalance(),last:s.last};
 }
 const n={...s,last:now};const {support,raised,scale}=feet;
 if(s.phase==="prepare"){
  if(Math.abs(support-raised)>scale*.18)return {...n,since:0};
  if(!s.since)return {...n,since:now,baseDiff:support-raised,floor:support};
  if(Math.abs(support-s.floor)>scale*.05)return {...n,since:now,floor:support,baseDiff:support-raised};
  if(now-s.since>=1000)return {...n,phase:"ready",floor:support,baseDiff:support-raised};
  return n;
 }
 if(Math.abs(support-s.floor)>scale*.14){
  if(s.driftAt&&now-s.driftAt>=300)return {...n,phase:"invalid",seconds:0};
  return {...n,driftAt:s.driftAt||now,liftAt:s.phase==="ready"?0:s.liftAt,downAt:0};
 }
 n.driftAt=0;
 const lift=(support-raised-s.baseDiff)/scale;
 if(s.phase==="ready"){
  if(lift<.12)return {...n,liftAt:0};
  if(!s.liftAt)return {...n,liftAt:now};
  if(now-s.liftAt>=300)return {...n,phase:"timing",seconds:(now-s.liftAt)/1000};
  return n;
 }
 n.seconds=(now-s.liftAt)/1000;
 if(n.seconds>180)return {...n,phase:"invalid",seconds:0};
 if(lift<.05){if(!s.downAt)return {...n,downAt:now};if(now-s.downAt>=200)return {...n,phase:"done",seconds:(s.downAt-s.liftAt)/1000};}
 else n.downAt=0;
 return n;
}

// Rolling median rejects isolated detector spikes without adding a long lag.
export function medianAngle(values:number[]) {
 const sorted=values.slice().sort((a,b)=>a-b);
 return sorted[Math.floor(sorted.length/2)];
}
export function balanceFeet(points:Point[],left:boolean) {
 // Toes are often hidden by footwear or overlap; ankles and torso establish height.
 if(!visible(points,[11,12,23,24,27,28]))return null;
 const scale=Math.abs((points[23].y+points[24].y-points[11].y-points[12].y)/2);
 return {support:points[left?27:28].y,raised:points[left?28:27].y,scale};
}
