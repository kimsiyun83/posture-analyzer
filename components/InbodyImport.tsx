"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {CustomerLogin} from './CustomerAccess';
import {parseReport,mergeReportReadings,type InbodyReport} from '@/lib/inbody-report';
import {readInbodyBasics} from '@/lib/inbody-ocr';
const fields=[['weight','체중','kg',500],['muscle','골격근량','kg',150],['fat','체지방량','kg',300],['fatPercent','체지방률','%',100]] as const;
const localTime=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export default function InbodyImport({onSaved,onCancel}:{onSaved:()=>void;onCancel:()=>void}){
 const [date,setDate]=useState(localTime),[image,setImage]=useState(''),[values,setValues]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false),[login,setLogin]=useState(false),[progress,setProgress]=useState(''),[recognizing,setRecognizing]=useState(false);
 const worker=useRef<Awaited<ReturnType<typeof import('tesseract.js').createWorker>>|null>(null),ocrCanvas=useRef<HTMLCanvasElement|null>(null),cancelled=useRef(false),cancelPending=useRef<(()=>void)|null>(null);
 const operation=useRef(false),id=useRef(''),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancelled.current=true;cancelPending.current?.();void worker.current?.terminate().catch(()=>{});};},[]);
 function changed(){id.current='';setConsent(false);}
 function stopRecognition(){cancelled.current=true;cancelPending.current?.();void worker.current?.terminate().catch(()=>{});setProgress('자동 인식을 중단했습니다. 사진은 유지되며 수치를 직접 입력할 수 있습니다.');}
 async function recognize(canvas:HTMLCanvasElement){
  let stopped=false;setRecognizing(true);
  const cancellation=new Promise<never>((_,reject)=>{cancelPending.current=()=>{stopped=true;reject(new Error('cancelled'));};});
  const waitFor=<T,>(p:Promise<T>)=>Promise.race([p,cancellation]);
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   setProgress('결과지 숫자 인식 준비 중…');const {createWorker,PSM}=await waitFor(import('tesseract.js'));let stage='전체 결과지';
   timer=setTimeout(()=>{stopped=true;cancelPending.current?.();void worker.current?.terminate().catch(()=>{});if(alive.current)setProgress('인식 시간이 초과되었습니다. 다시 인식하거나 수치를 직접 입력해 주세요.');},90000);
   const w=await waitFor(createWorker('kor+eng',1,{logger:m=>{if(alive.current&&!stopped)setProgress(`${stage} 인식 중 ${Math.round((m.progress||0)*100)}%`);}}).then(async w=>{if(!alive.current||stopped){await w.terminate();throw Error('cancelled');}return w;}));worker.current=w;
   if(!alive.current||stopped)return;
   await waitFor(w.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'}));
   const first=await waitFor(w.recognize(canvas,{}, {text:true,tsv:true}));const passes=[readInbodyBasics(first.data.text,first.data.tsv??'')];
   if(Object.keys(passes[0]).length<4){
    await waitFor(w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT}));
    for(const [index,left,width] of [[1,0,.67],[2,.64,.36]]){
     if(!alive.current||stopped)return;stage=`상세 영역 ${index}/2`;
     const r=await waitFor(w.recognize(canvas,{rectangle:{left:Math.floor(canvas.width*left),top:0,width:Math.floor(canvas.width*width),height:canvas.height}},{text:true,tsv:true}));passes.push(readInbodyBasics(r.data.text,r.data.tsv??''));
    }
   }
   if(!alive.current||stopped)return;
   const found=mergeReportReadings(passes);const entries=fields.flatMap(([k])=>found[k]?[[k,String(found[k]!.value)]]:[]);
   setValues(Object.fromEntries(entries));changed();setProgress(entries.length?`4개 중 ${entries.length}개 항목을 자동 입력했습니다. 결과지와 비교해 확인해 주세요.`:'수치를 읽지 못했습니다. 사진은 저장할 수 있으며, 결과지를 더 선명하게 찍거나 수치를 직접 입력해 주세요.');
  }catch{if(alive.current&&!stopped)setProgress('자동 인식에 실패했습니다. 사진은 유지됩니다. 다시 인식하거나 수치를 직접 입력해 주세요.');}
  finally{cancelPending.current=null;if(timer)clearTimeout(timer);await worker.current?.terminate().catch(()=>{});worker.current=null;if(alive.current)setRecognizing(false);}
 }
 async function retry(){if(operation.current||!ocrCanvas.current)return;operation.current=true;setBusy(true);try{await recognize(ocrCanvas.current);}finally{operation.current=false;if(alive.current)setBusy(false);}}
 async function photo(file:File){if(operation.current)return;operation.current=true;setBusy(true);setError('');try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('20MB 이하 JPG·PNG·WebP 사진을 선택해 주세요.');
  const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,2800/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let data='';for(const q of [.9,.8,.65,.5,.35]){data=canvas.toDataURL('image/jpeg',q);if(data.length<=1100000)break;}if(data.length>1100000)throw Error('결과지 부분만 잘라 다시 선택해 주세요.');
  if(alive.current){setImage(data);setValues({});changed();ocrCanvas.current=canvas;await recognize(canvas);}
 }catch(e){if(alive.current)setError(e instanceof Error?e.message:'사진을 열지 못했습니다.');}finally{operation.current=false;if(alive.current)setBusy(false);}}
 async function save(){if(operation.current||!consent)return;setError('');let report:InbodyReport|null=null;try{report=parseReport({version:1,confirmed:true,measuredAt:new Date(date).toISOString(),sex:'unknown',values:Object.fromEntries(fields.filter(([k])=>values[k]?.trim()).map(([k])=>[k,{value:Number(values[k])}])),segments:{muscle:{},fat:{}},cid:'',bodyType:'',...(image?{image}:{})});}catch{}
  if(!report){setError('검사일을 확인하고 사진 또는 수치를 한 개 이상 추가해 주세요.');return;}operation.current=true;setBusy(true);if(!id.current)id.current=crypto.randomUUID();try{
   const r=await fetch('/api/customer/inbody',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:id.current,data:report})});const body=await r.json();if(r.status===401){setLogin(true);return;}if(!r.ok)throw Error(body.error||'저장하지 못했습니다.');onSaved();
  }catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}finally{operation.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="ib-import"><h1>검사 기록 추가</h1><p>결과지 사진은 검사일별로 누적 보관합니다. 사진에서 체중·골격근량·체지방량·체지방률을 찾아 자동 입력합니다. 수치 없이 사진만 저장해도 됩니다.</p>
 <p role="status" aria-live="polite">{progress}</p>{recognizing&&<button type="button" className="care-secondary" onClick={stopRecognition}>인식 중단 · 직접 입력</button>}
 <fieldset disabled={busy} className="care-card portal-form"><label>검사일시<input type="datetime-local" required value={date} onChange={e=>{setDate(e.target.value);changed();}}/></label><div className="ib-actions"><label className="care-primary">결과지 촬영<input type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void photo(f);e.target.value='';}}/></label><label className="care-secondary">사진 선택<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void photo(f);e.target.value='';}}/></label></div>
 {image&&<details open><summary>저장할 결과지 사진</summary><img src={image} alt="저장할 결과지" style={{width:'100%'}}/><button type="button" className="text-link" onClick={()=>{setImage('');ocrCanvas.current=null;setProgress('');changed();}}>선택한 사진 빼기</button></details>}
 {image&&<button type="button" className="care-secondary" onClick={()=>void retry()}>사진 수치 다시 인식</button>}<div className="ib-simple-fields">{fields.map(([key,label,unit,max])=><label key={key}>{label} ({unit})<input type="number" inputMode="decimal" min="0" max={max} step="any" placeholder="자동 인식 또는 직접 입력" value={values[key]??''} onChange={e=>{setValues(v=>({...v,[key]:e.target.value}));changed();}}/></label>)}</div><p className="muted small">자동 입력한 수치는 수정할 수 있습니다. 읽지 못한 값은 비워두며, 확인한 수치만 그래프에 표시합니다.</p>
 <label className="check-label"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>검사일과 입력값을 확인했으며 결과지 사진·수치를 내 계정에 저장하고 센터 관리자가 조회하는 데 동의합니다.</label></fieldset>
 <p role="alert">{error}</p>{login&&<CustomerLogin onLogin={()=>{setLogin(false);void save();}}/>}<button className="care-primary" disabled={busy||!consent} onClick={()=>void save()}>{busy?'처리 중…':'검사 기록 저장'}</button><button className="care-secondary" disabled={busy} onClick={onCancel}>취소</button></section>;
}
