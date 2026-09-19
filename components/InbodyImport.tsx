"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {CustomerLogin} from './CustomerAccess';
import {parseReport,type InbodyReport} from '@/lib/inbody-report';
const fields=[['weight','체중','kg',500],['muscle','골격근량','kg',150],['fat','체지방량','kg',300],['fatPercent','체지방률','%',100]] as const;
const localTime=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export default function InbodyImport({onSaved,onCancel}:{onSaved:()=>void;onCancel:()=>void}){
 const [date,setDate]=useState(localTime),[image,setImage]=useState(''),[values,setValues]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false),[login,setLogin]=useState(false);
 const operation=useRef(false),id=useRef(''),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 function changed(){id.current='';setConsent(false);}
 async function photo(file:File){if(operation.current)return;operation.current=true;setBusy(true);setError('');try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('20MB 이하 JPG·PNG·WebP 사진을 선택해 주세요.');
  const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let data='';for(const q of [.9,.8,.65,.5,.35]){data=canvas.toDataURL('image/jpeg',q);if(data.length<=1100000)break;}if(data.length>1100000)throw Error('결과지 부분만 잘라 다시 선택해 주세요.');
  if(alive.current){setImage(data);changed();}
 }catch(e){if(alive.current)setError(e instanceof Error?e.message:'사진을 열지 못했습니다.');}finally{operation.current=false;if(alive.current)setBusy(false);}}
 async function save(){if(operation.current||!consent)return;setError('');let report:InbodyReport|null=null;try{report=parseReport({version:1,confirmed:true,measuredAt:new Date(date).toISOString(),sex:'unknown',values:Object.fromEntries(fields.filter(([k])=>values[k]?.trim()).map(([k])=>[k,{value:Number(values[k])}])),segments:{muscle:{},fat:{}},cid:'',bodyType:'',...(image?{image}:{})});}catch{}
  if(!report){setError('검사일을 확인하고 사진 또는 수치를 한 개 이상 추가해 주세요.');return;}operation.current=true;setBusy(true);if(!id.current)id.current=crypto.randomUUID();try{
   const r=await fetch('/api/customer/inbody',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:id.current,data:report})});const body=await r.json();if(r.status===401){setLogin(true);return;}if(!r.ok)throw Error(body.error||'저장하지 못했습니다.');onSaved();
  }catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}finally{operation.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="ib-import"><h1>검사 기록 추가</h1><p>결과지 사진은 검사일별로 누적 보관합니다. 그래프에 표시할 네 가지 수치만 직접 입력해 주세요. 수치 없이 사진만 저장해도 됩니다.</p>
 <fieldset disabled={busy} className="care-card portal-form"><label>검사일시<input type="datetime-local" required value={date} onChange={e=>{setDate(e.target.value);changed();}}/></label><div className="ib-actions"><label className="care-primary">결과지 촬영<input type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void photo(f);e.target.value='';}}/></label><label className="care-secondary">사진 선택<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void photo(f);e.target.value='';}}/></label></div>
 {image&&<details open><summary>저장할 결과지 사진</summary><img src={image} alt="저장할 결과지" style={{width:'100%'}}/><button type="button" className="text-link" onClick={()=>{setImage('');changed();}}>선택한 사진 빼기</button></details>}
 <div className="ib-simple-fields">{fields.map(([key,label,unit,max])=><label key={key}>{label} ({unit})<input type="number" inputMode="decimal" min="0" max={max} step="any" placeholder="수치 입력 (선택)" value={values[key]??''} onChange={e=>{setValues(v=>({...v,[key]:e.target.value}));changed();}}/></label>)}</div><p className="muted small">입력한 수치만 그래프에 표시합니다. 사진에서 수치를 자동으로 추정하지 않습니다.</p>
 <label className="check-label"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>검사일과 입력값을 확인했으며 결과지 사진·수치를 내 계정에 저장하고 센터 관리자가 조회하는 데 동의합니다.</label></fieldset>
 <p role="alert">{error}</p>{login&&<CustomerLogin onLogin={()=>{setLogin(false);void save();}}/>}<button className="care-primary" disabled={busy||!consent} onClick={()=>void save()}>{busy?'처리 중…':'검사 기록 저장'}</button><button className="care-secondary" disabled={busy} onClick={onCancel}>취소</button></section>;
}
