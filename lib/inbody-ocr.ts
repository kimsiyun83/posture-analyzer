import {readReportText,mergeReportReadings,type InbodyReport} from './inbody-report';
const basics=['weight','muscle','fat','fatPercent'] as const;
// Reconstruct visual rows: OCR paragraph order can separate the label and result columns.
export function visualRows(tsv:string){
 const words=tsv.split(/\r?\n/).slice(1).flatMap(line=>{const c=line.split('\t');if(c[0]!=='5'||!c[11]?.trim()||Number(c[10])<30)return [];const [x,y,w,h]=c.slice(6,10).map(Number);return [x,y,w,h].every(Number.isFinite)&&h>0?[{x,y:y+h/2,h,text:c.slice(11).join('\t')}]:[];}).sort((a,b)=>a.y-b.y||a.x-b.x);
 const rows:{y:number;h:number;words:typeof words}[]=[];
 for(const word of words){const row=rows.find(r=>Math.abs(r.y-word.y)<=Math.min(r.h,word.h)*.55);if(row)row.words.push(word);else rows.push({y:word.y,h:word.h,words:[word]});}
 return rows.map(r=>r.words.sort((a,b)=>a.x-b.x).map(w=>w.text).join(' ')).join('\n');
}
export function readInbodyBasics(text:string,tsv=''):InbodyReport['values']{
 const merged=mergeReportReadings([readReportText(text),readReportText(visualRows(tsv))]);
 return Object.fromEntries(basics.filter(k=>merged[k]).map(k=>[k,merged[k]]));
}
