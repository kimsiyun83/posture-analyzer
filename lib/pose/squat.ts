import {jointAngle,type Point} from "./live";
export type SquatView="front"|"side";
export type SquatReading={leftKnee:number;rightKnee:number;kneeFlexion:number;torsoTilt:number;armAngle:number;shoulderTilt:number;hipTilt:number;kneeShiftLeft:number;kneeShiftRight:number;hipY:number;scale:number;side:"left"|"right";centerX:number};
export type SquatRep={seconds:number;depthRatio:number;leftKnee:number;rightKnee:number;kneeFlexion:number;torsoTilt:number;armAngle:number;shoulderTilt:number;hipTilt:number;kneeShiftLeft:number;kneeShiftRight:number};
export type SquatReport={version:1;source:"camera";front:{reps:SquatRep[]};side:{reps:SquatRep[]}};
const round=(n:number)=>Math.round(n*10)/10;
function visible(p:Point|undefined){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??0)>=.6&&p.x>.015&&p.x<.985&&p.y>.015&&p.y<.985;}
export function readSquat(points:Point[],view:SquatView,width:number,height:number,lockedSide?:"left"|"right"):SquatReading|null{
 if(width<=0||height<=0)return null;
 const confidence=(indices:number[])=>Math.min(...indices.map(i=>visible(points[i])?(points[i].visibility??0):0));
 const left=[11,13,15,23,25,27],right=[12,14,16,24,26,28];
 const side=lockedSide??(confidence(left)>=confidence(right)?"left":"right");
 const ids=view==="front"?[...left,...right]:side==="left"?left:right;
 if(ids.some(i=>!visible(points[i])))return null;
 const p=(i:number)=>({x:points[i].x*width,y:points[i].y*height});
 const average=(a:number,b:number)=>({x:(points[a].x+points[b].x)/2*width,y:(points[a].y+points[b].y)/2*height});
 const offset=side==="left"?0:1;
 const shoulder=view==="front"?average(11,12):p(11+offset),hip=view==="front"?average(23,24):p(23+offset);
 const ankle=view==="front"?average(27,28):p(27+offset);
 const scale=Math.hypot(hip.x-ankle.x,hip.y-ankle.y);
 if(scale<height*.14||Math.hypot(shoulder.x-hip.x,shoulder.y-hip.y)<height*.1)return null;
 const torsoLength=Math.hypot(shoulder.x-hip.x,shoulder.y-hip.y);
 if(view==="front"&&Math.abs(p(11).x-p(12).x)<torsoLength*.35)return null;
 // Reject an obviously frontal view during the side test, while allowing the far shoulder to be occluded.
 if(view==="side"&&visible(points[11])&&visible(points[12])&&Math.abs(p(11).x-p(12).x)>torsoLength*.8)return null;
 const angle=(a:number,b:number,c:number)=>jointAngle(points[a],points[b],points[c],width,height);
 const lk=view==="front"||side==="left"?angle(23,25,27):null;
 const rk=view==="front"||side==="right"?angle(24,26,28):null;
 const arms=view==="front"?[angle(23,11,15),angle(24,12,16)]:[angle(23+offset,11+offset,15+offset)];
 if(arms.some(a=>a===null)||(view==="front"&&(lk===null||rk===null))||(side==="left"?lk===null:rk===null))return null;
 const knee=side==="left"?lk!:rk!;
 const tilt=(a:number,b:number)=>Math.atan2(Math.abs(p(a).y-p(b).y),Math.abs(p(a).x-p(b).x))*180/Math.PI;
 // Front camera angles describe projected leg alignment, never sagittal knee flexion.
 const kneeShift=(o:number)=>{const h=p(23+o),k=p(25+o),a=p(27+o);const t=(k.y-h.y)/(a.y-h.y||1);const axis=h.x+(a.x-h.x)*t;const inward=o===0?(p(24).x>h.x?1:-1):(p(23).x>h.x?1:-1);return (k.x-axis)*inward/scale*100;};
 return {leftKnee:lk??knee,rightKnee:rk??knee,kneeFlexion:180-knee,torsoTilt:Math.atan2(Math.abs(shoulder.x-hip.x),Math.abs(hip.y-shoulder.y))*180/Math.PI,armAngle:Math.min(...arms as number[]),shoulderTilt:view==="front"?tilt(11,12):0,hipTilt:view==="front"?tilt(23,24):0,kneeShiftLeft:view==="front"?kneeShift(0):0,kneeShiftRight:view==="front"?kneeShift(1):0,hipY:hip.y/height,scale:scale/height,side,centerX:hip.x/width};
}
export type SquatState={phase:"calibrate"|"ready"|"down"|"done";since:number;last:number;start:number;downSince:number;upSince:number;baseHip:number;baseScale:number;baseX:number;peak:SquatReading|null;peakDepth:number;reps:SquatRep[]};
export function freshSquat(reps:SquatRep[]=[]):SquatState{return {phase:"calibrate",since:0,last:0,start:0,downSince:0,upSince:0,baseHip:0,baseScale:0,baseX:0,peak:null,peakDepth:0,reps};}
export function stepSquat(s:SquatState,now:number,r:SquatReading|null,view:SquatView):SquatState{
 if(s.phase==="done")return s;
 if(!r||s.last>0&&now-s.last>800)return freshSquat(s.reps);
 const n={...s,last:now};
 if(s.phase==="calibrate"){
  const standing=view==="side"?r.kneeFlexion<25:Math.min(r.leftKnee,r.rightKnee)>150;
  if(!standing||r.armAngle<140)return {...n,since:0};
  if(!s.since||Math.abs(r.hipY-s.baseHip)>r.scale*.05)return {...n,since:now,baseHip:r.hipY,baseScale:r.scale,baseX:r.centerX};
  if(now-s.since>=1200)return {...n,phase:"ready",baseHip:r.hipY,baseScale:r.scale,baseX:r.centerX};
  return n;
 }
 if(Math.abs(r.centerX-s.baseX)>s.baseScale*.8)return freshSquat(s.reps);
 const depth=Math.max(0,(r.hipY-s.baseHip)/s.baseScale);
 const descending=depth>=.16&&(view==="front"||r.kneeFlexion>=35);
 const standing=depth<.08&&(view==="front"||r.kneeFlexion<25);
 if(s.phase==="ready"){
  if(!descending)return {...n,downSince:0};
  if(!s.downSince)return {...n,downSince:now};
  if(now-s.downSince>=180)return {...n,phase:"down",start:s.downSince,peak:r,peakDepth:depth,upSince:0};
  return n;
 }
 if(now-s.start>15000)return freshSquat(s.reps);
 if(depth>s.peakDepth){n.peakDepth=depth;n.peak=r;}
 if(!standing)return {...n,upSince:0};
 if(!s.upSince)return {...n,upSince:now};
 if(now-s.upSince<300)return n;
 const duration=(s.upSince-s.start)/1000;
 if(duration<.8||s.peakDepth<.23||!s.peak)return {...n,phase:"ready",downSince:0,upSince:0,peak:null,peakDepth:0};
 const b=s.peak;
 const rep:SquatRep={seconds:round(duration),depthRatio:Math.round(s.peakDepth*1000)/1000,leftKnee:round(b.leftKnee),rightKnee:round(b.rightKnee),kneeFlexion:round(b.kneeFlexion),torsoTilt:round(b.torsoTilt),armAngle:round(b.armAngle),shoulderTilt:round(b.shoulderTilt),hipTilt:round(b.hipTilt),kneeShiftLeft:round(b.kneeShiftLeft),kneeShiftRight:round(b.kneeShiftRight)};
 const reps=[...s.reps,rep];return {...n,phase:reps.length>=3?"done":"ready",downSince:0,upSince:0,peak:null,peakDepth:0,reps};
}
export function validSquatReport(value:unknown):value is SquatReport{
 if(!value||typeof value!=="object")return false;const d=value as Record<string,unknown>;
 if(d.version!==1||d.source!=="camera")return false;
 const bounds:Record<keyof SquatRep,[number,number]>={seconds:[.8,15],depthRatio:[.23,2],leftKnee:[0,180],rightKnee:[0,180],kneeFlexion:[0,180],torsoTilt:[0,90],armAngle:[0,180],shoulderTilt:[0,90],hipTilt:[0,90],kneeShiftLeft:[-200,200],kneeShiftRight:[-200,200]};
 return [d.front,d.side].every(v=>{if(!v||typeof v!=="object")return false;const reps=(v as {reps?:unknown}).reps;return Array.isArray(reps)&&reps.length===3&&reps.every(rep=>rep&&typeof rep==="object"&&Object.entries(bounds).every(([key,[min,max]])=>typeof rep[key]==="number"&&Number.isFinite(rep[key])&&rep[key]>=min&&rep[key]<=max));});
}
export function cleanSquatReport(d:SquatReport):SquatReport{
 const clean=(reps:SquatRep[])=>reps.map(r=>({seconds:r.seconds,depthRatio:r.depthRatio,leftKnee:r.leftKnee,rightKnee:r.rightKnee,kneeFlexion:r.kneeFlexion,torsoTilt:r.torsoTilt,armAngle:r.armAngle,shoulderTilt:r.shoulderTilt,hipTilt:r.hipTilt,kneeShiftLeft:r.kneeShiftLeft,kneeShiftRight:r.kneeShiftRight}));
 return {version:1,source:"camera",front:{reps:clean(d.front.reps)},side:{reps:clean(d.side.reps)}};
}
