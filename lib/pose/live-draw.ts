import { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Point } from "./live";
// All paths and dots use the same intrinsic image coordinates as the video.
export function drawable(p:Point|undefined){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.65&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;}
export function drawPose(ctx:CanvasRenderingContext2D,points:Point[],width:number,height:number){
 ctx.clearRect(0,0,width,height);ctx.lineWidth=Math.max(1.5,width/480);ctx.strokeStyle="#ffffffcc";
 for(const {start,end} of PoseLandmarker.POSE_CONNECTIONS){const a=points[start],b=points[end];if(!drawable(a)||!drawable(b))continue;ctx.beginPath();ctx.moveTo(a.x*width,a.y*height);ctx.lineTo(b.x*width,b.y*height);ctx.stroke();}
 for(const p of points){if(!drawable(p))continue;ctx.beginPath();ctx.arc(p.x*width,p.y*height,Math.max(3,width/180),0,Math.PI*2);ctx.fillStyle="#08b49e";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.stroke();}
}
