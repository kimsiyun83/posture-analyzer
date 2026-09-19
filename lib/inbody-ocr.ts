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
 const merged=mergeReportReadings([readReportText(text),readReportText(visualRows(tsv)),readCardValues(tsv)]);
 return Object.fromEntries(basics.filter(k=>merged[k]).map(k=>[k,merged[k]]));
}

// App screenshots place large numbers below their labels rather than in a table row.
export function readCardValues(tsv:string):InbodyReport['values']{
 const words=tsv.split(/\r?\n/).slice(1).flatMap(line=>{const c=line.split('\t');const [x,y,w,h]=c.slice(6,10).map(Number);return c[0]==='5'&&Number(c[10])>=40&&c[11]?.trim()&&[x,y,w,h].every(Number.isFinite)&&w>0&&h>0?[{x,y,w,h,text:c.slice(11).join('\t').normalize('NFKC')}]:[];});
 const labels=[['weight','체중',500],['muscle','골격근량',150],['fat','체지방량',300],['fatPercent','체지방률',100]] as const;
 const anchors: {key:typeof basics[number];max:number;x:number;y:number;w:number;h:number}[]=[];
 for(const word of words){const row=words.filter(w=>w.x>=word.x&&Math.abs(w.y-word.y)<Math.min(w.h,word.h)*.5).sort((a,b)=>a.x-b.x);let text='';let end=word.x;
  for(const w of row.slice(0,5)){if(w.x-end>word.h*2)break;text+=w.text.replace(/\s/g,'');end=w.x+w.w;const label=labels.find(l=>l[1]===text);if(label){anchors.push({key:label[0],max:label[2],x:word.x,y:word.y,w:end-word.x,h:Math.max(word.h,w.h)});break;}}
 }
 const result:InbodyReport['values']={};
 for(const a of anchors){
  const below=words.filter(w=>w.y>=a.y+a.h*.8&&w.y<=a.y+a.h*6&&Math.abs((w.x+w.w/2)-(a.x+a.w/2))<=Math.max(a.w*.75,a.h*2)&&/^\d+(?:[.,]\d+)?(?:kg|%)?$/i.test(w.text));
  const candidates=below.filter(w=>!anchors.some(b=>b!==a&&b.y>a.y&&b.y<w.y&&Math.abs(b.x-a.x)<a.w));
  if(candidates.length!==1)continue;const v=Number(candidates[0].text.replace(/kg|%/gi,'').replace(',','.'));if(v<=0||v>a.max)continue;
  if(result[a.key]&&result[a.key]!.value!==v){delete result[a.key];continue;}result[a.key]={value:v};
 }
 return result;
}

export function readInbodyDate(raw:string):string|null{
 const lines=raw.normalize('NFKC').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const candidates:{date:string;priority:number}[]=[];
 for(let i=0;i<lines.length;i++){
  if(/생년|출생|birth/i.test(lines[i]))continue;
  const labelled=/검사\s*일|측정\s*일|검사\s*날짜|측정\s*날짜|test\s*date|measurement\s*date/i.test(lines[i]);
  const s=labelled?lines.slice(i,i+2).join(' '):lines[i];
  const matches=[...s.matchAll(/(?<!\d)(\d{4}|\d{2})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?\.?(?:\s*[.(]?\s*[월화수목금토일](?:요일)?\s*[.)]?)?\s*(?:(오전|오후|AM|PM)?\s*(\d{1,2})\s*:\s*(\d{2}))?/gi)];
  for(const m of matches){let year=+m[1];if(year<100)year+=2000;const month=+m[2],day=+m[3];let hour=m[5]?+m[5]:0;const minute=m[6]?+m[6]:0;
   if(m[4]){if(hour<1||hour>12)continue;hour=hour%12+(/오후|pm/i.test(m[4])?12:0);}
   const d=new Date(Date.UTC(year,month-1,day));if(year<2000||year>2099||d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day||hour>23||minute>59)continue;
   // Unlabelled historical dates without a time may be graph axes or birthdays.
   if(!labelled&&!m[5])continue;
   const pad=(v:number)=>String(v).padStart(2,'0');candidates.push({date:`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`,priority:labelled?2:1});
  }
 }
 const priority=Math.max(0,...candidates.map(c=>c.priority));const dates=[...new Set(candidates.filter(c=>c.priority===priority).map(c=>c.date))];return dates.length===1?dates[0]:null;
}
