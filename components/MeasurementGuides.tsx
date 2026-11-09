"use client";
import {useState, type Dispatch, type SetStateAction} from "react";
export type GuideSettings={grid:boolean;horizontal:boolean;vertical:boolean;skeleton:boolean;x:number;y:number};
export const DEFAULT_GUIDES:GuideSettings={grid:false,horizontal:false,vertical:false,skeleton:true,x:50,y:50};
export function useMeasurementGuides(){return useState<GuideSettings>({...DEFAULT_GUIDES});}
type Props={settings:GuideSettings;onChange:Dispatch<SetStateAction<GuideSettings>>};
export function MeasurementGuides({settings:s,onChange}:Props){
 function drag(e:React.PointerEvent<HTMLButtonElement>,axis:"x"|"y"){
  const bounds=e.currentTarget.parentElement!.getBoundingClientRect();
  e.currentTarget.setPointerCapture(e.pointerId);
  const update=(ev:{clientX:number;clientY:number})=>onChange(v=>({...v,[axis]:Math.max(5,Math.min(95,axis==="x"?(ev.clientX-bounds.left)/bounds.width*100:(ev.clientY-bounds.top)/bounds.height*100))}));
  update(e);
 }
 return <div className="measurement-guides" aria-label="촬영 기준선">
  {s.grid&&<div className="measurement-grid" data-testid="measurement-grid"/>}
  {s.horizontal&&<><div className="measurement-line horizontal" style={{top:`${s.y}%`}}/><button type="button" className="guide-handle horizontal" style={{top:`${s.y}%`}} aria-label="가로 기준선 이동" onPointerDown={e=>drag(e,"y")} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const b=e.currentTarget.parentElement!.getBoundingClientRect();onChange(v=>({...v,y:Math.max(5,Math.min(95,(e.clientY-b.top)/b.height*100))}));}}}>↕</button></>}
  {s.vertical&&<><div className="measurement-line vertical" style={{left:`${s.x}%`}}/><button type="button" className="guide-handle vertical" style={{left:`${s.x}%`}} aria-label="세로 기준선 이동" onPointerDown={e=>drag(e,"x")} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const b=e.currentTarget.parentElement!.getBoundingClientRect();onChange(v=>({...v,x:Math.max(5,Math.min(95,(e.clientX-b.left)/b.width*100))}));}}}>↔</button></>}
 </div>;
}
export function GuideControls({settings:s,onChange}:Props){
 const items=[["grid","격자"],["horizontal","가로선"],["vertical","세로선"],["skeleton","관절 표시"]] as const;
 return <div className="guide-controls"><div className="guide-toggles" role="group" aria-label="측정 표시 설정">{items.map(([key,label])=><button key={key} type="button" aria-pressed={s[key]} onClick={()=>onChange(v=>({...v,[key]:!v[key]}))}>{label} <span>{s[key]?"켜짐":"꺼짐"}</span></button>)}</div>{(s.horizontal||s.vertical)&&<details className="guide-adjust"><summary>기준선 위치 조절</summary><p>붉은 손잡이를 끌거나 아래 슬라이더로 이동하세요. 기준선은 화면 확인용이며 측정값에는 영향을 주지 않습니다.</p>{s.horizontal&&<label>가로선 높이<input aria-label="가로선 높이" type="range" min="5" max="95" value={s.y} onChange={e=>onChange(v=>({...v,y:+e.target.value}))}/></label>}{s.vertical&&<label>세로선 위치<input aria-label="세로선 위치" type="range" min="5" max="95" value={s.x} onChange={e=>onChange(v=>({...v,x:+e.target.value}))}/></label>}<button type="button" onClick={()=>onChange(v=>({...v,x:50,y:50}))}>기준선 중앙으로</button></details>}</div>;
}
