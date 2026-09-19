"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {CustomerLogin} from './CustomerAccess';
import {METRICS,SEGMENTS,SEGMENT_LABELS,parseReport,readReportText,readSegments,mergeReportReadings,type InbodyReport,type MetricKey} from '@/lib/inbody-report';
const localTime=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export default function InbodyImport({onSaved,onCancel}:{onSaved:()=>void;onCancel:()=>void}){
 const [report,setReport]=useState<InbodyReport>({version:1,confirmed:true,measuredAt:'',sex:'unknown',values:{},segments:{muscle:{},fat:{}},cid:'',bodyType:''});
 const [date,setDate]=useState(localTime),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[raw,setRaw]=useState(''),[confirmed,setConfirmed]=useState(false),[savePhoto,setSavePhoto]=useState(false),[login,setLogin]=useState(false);
 const id=useRef(''),worker=useRef<Awaited<ReturnType<typeof import('tesseract.js').createWorker>>|null>(null),alive=useRef(true),operation=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;void worker.current?.terminate();};},[]);
 useEffect(()=>{id.current="";},[report,date,savePhoto]);
 function change(key:MetricKey,part:'value'|'low'|'high',text:string){setConfirmed(false);setReport(r=>{const values={...r.values};if(part==='value'&&text===''){delete values[key];}else{const old=values[key]??{value:0};values[key]={...old,[part]:text===''?undefined:Number(text)};}return {...r,values};});}
 async function read(file:File){if(operation.current)return;operation.current=true;setBusy(true);setError('');setConfirmed(false);setRaw('');setProgress('사진 준비 중…');
  try{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('20MB 이하 JPG·PNG·WebP 사진을 선택해 주세요.');
   const bitmap=await createImageBitmap(file);const cv=document.createElement('canvas');const ratio=Math.min(1,2800/Math.max(bitmap.width,bitmap.height));cv.width=bitmap.width*ratio;cv.height=bitmap.height*ratio;const ctx=cv.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(bitmap,0,0,cv.width,cv.height);bitmap.close();
   const preview=document.createElement('canvas');const previewRatio=Math.min(1,1600/Math.max(cv.width,cv.height));preview.width=cv.width*previewRatio;preview.height=cv.height*previewRatio;preview.getContext('2d')!.drawImage(cv,0,0,preview.width,preview.height);
   let image=preview.toDataURL('image/jpeg',.8);for(const quality of [.65,.5,.35]){if(image.length<=1100000)break;image=preview.toDataURL('image/jpeg',quality);}if(image.length>1100000)throw Error('사진 용량이 큽니다. 결과지 부분만 잘라 다시 선택해 주세요.');
   if(!alive.current)return;setReport(r=>({...r,image,values:{},segments:{muscle:{},fat:{}},cid:'',bodyType:'',sex:'unknown'}));const {createWorker,PSM}=await import('tesseract.js');let stage='전체 결과지';
   worker.current=await createWorker('kor+eng',1,{logger:m=>{if(alive.current)setProgress(`${stage} 인식 중 ${Math.round((m.progress||0)*100)}%`);}});if(!alive.current){await worker.current.terminate();return;}
   await worker.current.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});
   const result=await worker.current.recognize(cv);if(!alive.current)return;
   const texts=[result.data.text];const passes=[readReportText(result.data.text)];
   // Read columns separately when the full-page layout yields few labelled values.
   if(Object.keys(passes[0]).length<5){
    await worker.current.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
    for(const [index,left,width] of [[1,0,.67],[2,.64,.36]]){
     if(!alive.current)return;stage=`상세 영역 ${index}/2`;
     const part=await worker.current.recognize(cv,{rectangle:{left:Math.floor(cv.width*left),top:0,width:Math.floor(cv.width*width),height:cv.height}});
     if(!alive.current)return;texts.push(part.data.text);passes.push(readReportText(part.data.text));
    }
   }
   const values=mergeReportReadings(passes),count=Object.keys(values).length;
   setRaw(texts.join('\n\n--- 영역별 인식 ---\n'));setReport(r=>({...r,values,segments:readSegments(result.data.text)}));
   setProgress(count?`${count}개 항목을 인식했습니다. 결과지와 비교하여 수치를 확인해 주세요.`:'인식된 항목이 없습니다. 결과지의 글자와 숫자를 읽지 못했습니다.');
   if(!count)setError('결과지 바깥 여백을 줄이고, 밝은 곳에서 종이 전체가 선명하게 나오도록 다시 촬영해 주세요. 아래 ‘자동 인식한 원문 확인’에서 읽힌 글자를 확인하거나 직접 입력할 수 있습니다.');

  }catch(e){if(alive.current){setError(e instanceof Error?e.message:'문자 인식 실패');setProgress('자동 인식이 어려우면 아래에 직접 입력할 수 있습니다.');}}finally{await worker.current?.terminate().catch(()=>{});worker.current=null;operation.current=false;if(alive.current)setBusy(false);}
 }
 async function save(){if(operation.current)return;setError('');if(!confirmed)return;let d:InbodyReport|null=null;try{d=parseReport({...report,measuredAt:new Date(date).toISOString(),image:savePhoto?report.image:undefined});}catch{}if(!d){setError('검사일, 수치, 표준 범위를 확인해 주세요. 수치가 적어도 한 개 필요합니다.');return;}operation.current=true;setBusy(true);if(!id.current)id.current=crypto.randomUUID();try{const res=await fetch('/api/customer/inbody',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:id.current,data:d})});const b=await res.json();if(res.status===401){setLogin(true);return;}if(!res.ok)throw Error(b.error);onSaved();}catch(e){setError(e instanceof Error?e.message:'저장 실패');}finally{operation.current=false;setBusy(false);}}
 return <section className="ib-import"><h1>인바디 검사 기록 추가</h1><p className="muted">결과지가 평평하게 보이도록 촬영하세요. 인식 결과는 자동 저장되지 않으며 확인 후 저장합니다.</p><div className="ib-actions"><label className="care-primary">결과지 촬영<input type="file" capture="environment" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void read(f);e.target.value='';}}/></label><label className="care-secondary">사진 선택<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void read(f);e.target.value='';}}/></label></div><p role="status">{progress}</p>{error&&<p role="alert" className="care-card" style={{background:'#fff0e9',color:'#963e26'}}>{error}</p>}{report.image&&<details className="care-card"><summary>결과지 사진과 비교하기</summary><img src={report.image} alt="입력 수치와 비교할 결과지" style={{width:'100%'}}/></details>}
 <fieldset disabled={busy} className="portal-form care-card"><label>실제 검사일시<input type="datetime-local" required value={date} onChange={e=>{setDate(e.target.value);setConfirmed(false);}}/></label><label>결과지 성별<select value={report.sex} onChange={e=>{setReport(r=>({...r,sex:e.target.value as InbodyReport['sex']}));setConfirmed(false);}}><option value="unknown">미기재</option><option value="male">남성</option><option value="female">여성</option></select></label><p className="muted small">표준 범위는 검사지에 있는 경우에만 입력하세요. 입력하지 않은 항목은 ‘미기재’로 표시됩니다.</p>
 {[...new Set(METRICS.map(m=>m[4]))].map(group=><details key={group} open={group==='골격근·지방 분석'}><summary>{group}</summary>{METRICS.filter(m=>m[4]===group).map(([key,label,unit,max])=><div className="ib-field" key={key}><label>{label} ({unit||'비율'})<input aria-label={label} type="number" min="0" max={max} step="any" value={report.values[key]?.value??''} onChange={e=>change(key,'value',e.target.value)}/></label><label>표준 최소<input aria-label={`${label} 표준 최소`} disabled={!report.values[key]} type="number" min="0" max={max} step="any" value={report.values[key]?.low??''} onChange={e=>change(key,'low',e.target.value)}/></label><label>표준 최대<input aria-label={`${label} 표준 최대`} disabled={!report.values[key]} type="number" min="0" max={max} step="any" value={report.values[key]?.high??''} onChange={e=>change(key,'high',e.target.value)}/></label></div>)}</details>)}
 {(['muscle','fat'] as const).map(type=><details key={type}><summary>부위별 {type==='muscle'?'근육량':'체지방'} · 결과지에서 확인 후 입력</summary>{SEGMENTS.map(key=><div className="ib-field" key={key}><b>{SEGMENT_LABELS[key]}</b>{(['kg','percent'] as const).map(unit=><label key={unit}>{unit==='kg'?'중량 kg':'표준 대비 %'}<input aria-label={`${type} ${key} ${unit}`} type="number" min="0" max={unit==='kg'?300:1000} step="any" value={report.segments[type][key]?.[unit]??''} onChange={e=>{setConfirmed(false);const n=e.target.value===''?undefined:Number(e.target.value);setReport(r=>({...r,segments:{...r.segments,[type]:{...r.segments[type],[key]:{...r.segments[type][key],[unit]:n}}}}));}}/></label>)}</div>)}</details>)}
 <label>CID 유형 · 결과지 문구<input maxLength={80} value={report.cid} onChange={e=>{setReport(r=>({...r,cid:e.target.value}));setConfirmed(false);}} placeholder="미기재 시 비워두기"/></label><label>체형 분류 · 결과지 문구<input maxLength={80} value={report.bodyType} onChange={e=>{setReport(r=>({...r,bodyType:e.target.value}));setConfirmed(false);}}/></label></fieldset>
 {raw&&<details className="care-card"><summary>자동 인식한 원문 확인</summary><pre style={{whiteSpace:'pre-wrap'}}>{raw}</pre></details>}
 <label className="check-label"><input type="checkbox" checked={savePhoto} onChange={e=>setSavePhoto(e.target.checked)}/>결과지 사진도 내 계정에 보관하고 센터 관리자가 볼 수 있도록 저장합니다. 사진의 이름 등 개인정보가 함께 포함될 수 있습니다.</label><label className="check-label"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>검사일·수치를 결과지와 비교해 확인했으며 계정 저장 및 관리자 조회에 동의합니다.</label>{login&&<CustomerLogin onLogin={()=>{setLogin(false);void save();}}/>}<button className="care-primary" disabled={busy||!confirmed} onClick={()=>void save()}>{busy?'처리 중…':'확인한 검사 기록 저장'}</button><button className="care-secondary" disabled={busy} onClick={onCancel}>취소</button>
 </section>;
}
