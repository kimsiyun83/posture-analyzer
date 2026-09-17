export type Point={x:number;y:number;visibility?:number};
export function jointAngle(a:Point,b:Point,c:Point,width:number,height:number){
 const u=[(a.x-b.x)*width,(a.y-b.y)*height],v=[(c.x-b.x)*width,(c.y-b.y)*height];
 const den=Math.hypot(...u)*Math.hypot(...v);if(den<1)return null;
 return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/den)))*180/Math.PI;
}
export function visible(points:Point[],indices:number[]){return indices.every(i=>{const p=points[i];return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??0)>=.65&&p.x>.02&&p.x<.98&&p.y>.02&&p.y<.98;});}
export type BalanceState={phase:"prepare"|"ready"|"timing"|"done"|"invalid";since:number;liftAt:number;downAt:number;last:number;baseDiff:number;floor:number;seconds:number};
export function freshBalance():BalanceState{return {phase:"prepare",since:0,liftAt:0,downAt:0,last:0,baseDiff:0,floor:0,seconds:0};}
export function stepBalance(s:BalanceState,now:number,feet:{support:number;raised:number;scale:number}|null):BalanceState{
 if(s.phase==="done"||s.phase==="invalid")return s;
 if(!feet||!Number.isFinite(feet.scale)||feet.scale<.12||(s.last>0&&now-s.last>700))return s.phase==="timing"?{...s,phase:"invalid",seconds:0}:freshBalance();
 const n={...s,last:now};const {support,raised,scale}=feet;
 if(s.phase==="prepare"){
  if(Math.abs(support-raised)>scale*.09)return {...n,since:0};
  if(!s.since)return {...n,since:now,baseDiff:support-raised,floor:support};
  if(Math.abs(support-s.floor)>scale*.05)return {...n,since:now,floor:support,baseDiff:support-raised};
  if(now-s.since>=1000)return {...n,phase:"ready",floor:support,baseDiff:support-raised};
  return n;
 }
 if(Math.abs(support-s.floor)>scale*.14)return {...n,phase:"invalid",seconds:0};
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
