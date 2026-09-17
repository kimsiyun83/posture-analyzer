import { parseReportMetrics } from "./pose/report-details";
export const RECORD_LABELS:Record<string,string>={posture:"4방향 체형 검사",balance:"한발서기",chair:"의자 일어서기",scratch:"어깨 스크래치",shoulder:"어깨 각도",elbow:"팔꿈치 각도"};
export function validCustomerRecord(kind:unknown,d:unknown):boolean {
 if(typeof kind!=="string" || !Object.prototype.hasOwnProperty.call(RECORD_LABELS,kind)||!d||typeof d!=="object")return false;
 const r=d as Record<string,unknown>;
 const number=(v:unknown,max:number)=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=max;
 if(kind==="posture")return !!parseReportMetrics(r)&&!!parseReportMetrics({front:r.front,side:r.right})&&["balance","strength","mobility"].includes(String(r.goal))&&typeof r.discomfort==="boolean"&&!!r.back&&typeof r.back==="object"&&["shoulder","hip"].every(k=>{const v=(r.back as Record<string,unknown>)[k];return typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=180;});
 if(!["manual","camera"].includes(String(r.source)))return false;
 if(kind==="chair")return number(r.count,200)&&Number.isInteger(r.count)&&r.seconds===30;
 const max=kind==="shoulder"||kind==="elbow"?180:999;
 return number(r.left,max)&&number(r.right,max);
}
