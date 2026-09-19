export const METRICS = [
 ['weight','체중','kg',500,'골격근·지방 분석',['Weight']],['muscle','골격근량','kg',150,'골격근·지방 분석',['Skeletal Muscle Mass','SMM']],['fat','체지방량','kg',300,'골격근·지방 분석',['Body Fat Mass']],
 ['bmi','BMI','kg/m²',100,'비만 분석',['체질량지수']],['fatPercent','체지방률','%',100,'비만 분석',['Percent Body Fat','PBF']],['whr','복부지방률','',3,'복부 분석',['Waist-Hip Ratio','WHR']],['visceral','내장지방레벨','Lv',60,'복부 분석',['Visceral Fat Level']],
 ['water','체수분','L',150,'체수분 분석',['Total Body Water']],['icw','세포내수분','L',100,'체수분 분석',['Intracellular Water']],['ecw','세포외수분','L',100,'체수분 분석',['Extracellular Water']],['ecwRatio','세포외수분비','',1,'체수분 분석',['ECW/TBW']],
 ['bmr','기초대사량','kcal',6000,'종합 분석',['Basal Metabolic Rate','BMR']],['score','인바디점수','점',200,'종합 분석',['InBody Score']],['bodyAge','인바디나이','세',150,'종합 분석',['Body Age']],['age','실제나이','세',150,'종합 분석',['Age']],['height','신장','cm',250,'종합 분석',['Height']],
 ['protein','단백질','kg',60,'체성분 분석',['Protein']],['minerals','무기질','kg',30,'체성분 분석',['Minerals']],['bone','골무기질량','kg',20,'체성분 분석',['Bone Mineral Content']],['bcm','체세포량','kg',150,'체성분 분석',['Body Cell Mass']],['smi','SMI','kg/m²',30,'체성분 분석',[]],['phase','전신위상각','°',20,'체성분 분석',['Phase Angle']],
] as const;
export type MetricKey=typeof METRICS[number][0];
export const SEGMENTS=['trunk','leftArm','rightArm','leftLeg','rightLeg'] as const;
export type SegmentKey=typeof SEGMENTS[number];
export const SEGMENT_LABELS:Record<SegmentKey,string>={trunk:'몸통',leftArm:'왼팔',rightArm:'오른팔',leftLeg:'왼다리',rightLeg:'오른다리'};
export type Reading={value:number;low?:number;high?:number};
export type InbodyReport={version:1;measuredAt:string;sex:'male'|'female'|'unknown';values:Partial<Record<MetricKey,Reading>>;segments:{muscle:Partial<Record<SegmentKey,{kg?:number;percent?:number}>>;fat:Partial<Record<SegmentKey,{kg?:number;percent?:number}>>};cid:string;bodyType:string;image?:string;confirmed:true;archived?:boolean};
export function parseReport(value:unknown):InbodyReport|null{
 if(!value||typeof value!=='object')return null;const d=value as InbodyReport;
 if(d.version!==1||d.confirmed!==true||typeof d.measuredAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(d.measuredAt)||!Number.isFinite(Date.parse(d.measuredAt))||!['male','female','unknown'].includes(d.sex)||!d.values||typeof d.values!=='object'||!d.segments)return null;
 const num=(v:unknown,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 const values:InbodyReport['values']={};
 for(const [key,,,max] of METRICS){const r=d.values[key];if(r===undefined)continue;if(!r||typeof r!=='object'||!num(r.value,max)||(r.low!==undefined&&!num(r.low,max))||(r.high!==undefined&&!num(r.high,max))||(r.low!==undefined&&r.high!==undefined&&r.low>=r.high))return null;values[key]={value:r.value,...(r.low!==undefined?{low:r.low}:{}),...(r.high!==undefined?{high:r.high}:{})};}
 if(!Object.keys(values).length)return null;
 const segments:InbodyReport['segments']={muscle:{},fat:{}};
 for(const type of ['muscle','fat'] as const){if(!d.segments[type]||typeof d.segments[type]!=='object')return null;for(const key of SEGMENTS){const r=d.segments[type][key];if(r===undefined)continue;if(!r||typeof r!=='object'||(r.kg!==undefined&&!num(r.kg,300))||(r.percent!==undefined&&!num(r.percent,1000)))return null;segments[type][key]={...(r.kg!==undefined?{kg:r.kg}:{}),...(r.percent!==undefined?{percent:r.percent}:{})};}}
 if(typeof d.cid!=='string'||d.cid.length>80||typeof d.bodyType!=='string'||d.bodyType.length>80)return null;
 if(d.image!==undefined&&(typeof d.image!=='string'||d.image.length>1100000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(d.image)))return null;
 return {version:1,confirmed:true,measuredAt:d.measuredAt,sex:d.sex,values,segments,cid:d.cid,bodyType:d.bodyType,...(d.image?{image:d.image}:{}),...(d.archived===true?{archived:true}:{})};
}
export function rangeLabel(r:Reading|undefined){if(!r)return '미기재';if(r.low===undefined||r.high===undefined)return '기준 미입력';return r.value<r.low?'표준이하':r.value>r.high?'표준이상':'표준';}
// Parse labelled cells without treating graph ticks or conflicting readings as results.
export function readReportText(raw:string){
 const values:InbodyReport['values']={};
 const normalize=(s:string)=>s.normalize('NFKC').replace(/\s/g,'').toLowerCase();
 const names=METRICS.flatMap(([key,label,,,,aliases])=>[label,...aliases].map(name=>({key,name:normalize(name)}))).sort((a,b)=>b.name.length-a.name.length);
 const escaped=names.map(x=>x.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const labels=new RegExp(escaped.join('|'),'g');
 const candidates=new Map<MetricKey,Reading[]>();
 const lines=raw.normalize('NFKC').split(/\r?\n/).map(normalize).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  const line=lines[i];const matches=[...line.matchAll(labels)];
  for(let j=0;j<matches.length;j++){
   const m=matches[j],key=names.find(x=>x.name===m[0])!.key;
   if(m.index!>0&&/[a-z가-힣]/.test(line[m.index!-1]))continue;
   // A Korean/English translation of the same label is one cell.
   let end=j+1;while(end<matches.length&&names.find(x=>x.name===matches[end][0])!.key===key)end++;
   let tail=line.slice(matches[end-1].index!+matches[end-1][0].length,matches[end]?.index);
   j=end-1;
   // Sparse OCR often puts a value on the next line. Never cross another label.
   if(!/\d/.test(tail.replace(/kg\/m[2²]/g,''))&&end===matches.length){
    const next=lines[i+1];
    if(next&&!names.some(x=>next.includes(x.name))&&/^[(:|]*\d/.test(next))tail+=next;
   }
   tail=tail.replace(/kg\/m[2²]/g,'');
   const range=tail.match(/\((\d+(?:[.,]\d+)?)[~～–—-](\d+(?:[.,]\d+)?)\)/);
   if(range)tail=tail.replace(range[0],'');
   // Text after a label such as '조절' is a different measurement.
   tail=tail.replace(/skeletalmusclemass|bodyfatmass|percentbodyfat/g,'');
   if(/조절|변화|이력|history|control/.test(tail))continue;
   const numbers=tail.match(/-?\d+(?:[.,]\d+)?/g);if(numbers?.length!==1)continue;
   const number=(n:string)=>Number(n.replace(',','.'));
   const value=number(numbers[0]),max=METRICS.find(m=>m[0]===key)![3];if(value<0||value>max)continue;
   const r:Reading={value};if(range&&number(range[1])<number(range[2])&&number(range[2])<=max){r.low=number(range[1]);r.high=number(range[2]);}
   candidates.set(key,[...(candidates.get(key)??[]),r]);
  }
 }
 for(const [key,items] of candidates){if(items.every(r=>r.value===items[0].value))values[key]=items.find(r=>r.low!==undefined)??items[0];}
 return values;
}

// Conflicting OCR passes require manual confirmation instead of guessing.
export function mergeReportReadings(passes:InbodyReport['values'][]){
 const result:InbodyReport['values']={};
 for(const [key] of METRICS){const items=passes.flatMap(p=>p[key]?[p[key]!]:[]);if(items.length&&items.every(r=>r.value===items[0].value))result[key]=items.find(r=>r.low!==undefined)??items[0];}
 return result;
}

export function readSegments(raw:string):InbodyReport['segments']{
 const result:InbodyReport['segments']={muscle:{},fat:{}};let mode:'muscle'|'fat'|null=null;
 const labels:Record<SegmentKey,string[]>={trunk:['몸통','trunk'],leftArm:['왼팔','좌측상지','leftarm'],rightArm:['오른팔','우측상지','rightarm'],leftLeg:['왼다리','좌측하지','leftleg'],rightLeg:['오른다리','우측하지','rightleg']};
 for(const original of raw.split(/\r?\n/)){const line=original.replace(/\s/g,'').toLowerCase();if(/부위별근육|segmentallean/.test(line)){mode='muscle';continue;}if(/부위별체지방|segmentalfat/.test(line)){mode='fat';continue;}if(!mode)continue;
  for(const key of SEGMENTS){const label=labels[key].find(l=>line.startsWith(l));if(!label)continue;const tail=line.slice(label.length);const kg=tail.match(/(\d+(?:\.\d+)?)kg/),pct=tail.match(/(\d+(?:\.\d+)?)%/);if(!kg||!pct||+kg[1]>300||+pct[1]>1000)continue;if(result[mode][key]){delete result[mode][key];continue;}result[mode][key]={kg:+kg[1],percent:+pct[1]};}
 }
 return result;
}
