export type Point={x:number;y:number;visibility?:number};
export function neckReading(p:Point[],width:number,height:number,side:'left'|'right'){
 const e=p[side==='left'?7:8],s=p[side==='left'?11:12],n=p[0],other=p[side==='left'?12:11];
 const visible=(q:Point|undefined)=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)&&(q.visibility??0)>=.7&&q.x>.02&&q.x<.98&&q.y>.02&&q.y<.98;
 if(!visible(e)||!visible(s)||!visible(n)||width<=0||height<=0)return null;
 const dx=(e.x-s.x)*width,dy=(s.y-e.y)*height,size=Math.hypot(dx,dy),facing=(n.x-e.x)*width;
 if(dy<25||size<45||Math.abs(facing)<size*.08)return null;
 if(visible(other)&&Math.abs(other.x-s.x)*width>size*.85)return null;
 return {angle:Math.atan2(Math.sign(facing)*dx,dy)*180/Math.PI,size,direction:Math.sign(facing)};
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
export type DeskReport={source:'camera';startedAt:string;endedAt:string;totalMs:number;validMs:number;badMs:number;longestBadMs:number;averageDelta:number;maxDelta:number;alerts:number;threshold:number;holdSeconds:number;alertMode:'off'|'beep'|'voice';baseline:number};
export function validDeskReport(d:unknown):d is DeskReport{
 if(!d||typeof d!=='object')return false;const r=d as DeskReport;
 const num=(v:unknown,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 return r.source==='camera'&&typeof r.startedAt==='string'&&typeof r.endedAt==='string'&&Number.isFinite(Date.parse(r.startedAt))&&Date.parse(r.endedAt)>=Date.parse(r.startedAt)&&num(r.totalMs,86400000)&&num(r.validMs,r.totalMs)&&r.validMs>=10000&&num(r.badMs,r.validMs)&&num(r.longestBadMs,r.badMs)&&num(r.averageDelta,180)&&num(r.maxDelta,180)&&num(r.alerts,10000)&&Number.isInteger(r.alerts)&&[8,12,16].includes(r.threshold)&&[5,8,15].includes(r.holdSeconds)&&['off','beep','voice'].includes(r.alertMode)&&Number.isFinite(r.baseline)&&Math.abs(r.baseline)<=90;
}
