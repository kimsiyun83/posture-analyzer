"use client";
import {useEffect,type ReactNode} from "react";
export function useCameraScreen(active:boolean){useEffect(()=>{if(!active)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[active]);}
export default function CameraChrome({title,progress,onClose,children}:{title:string;progress:number;onClose:()=>void;children?:ReactNode}){
 return <><div className="camera-top"><span>{title}</span><button type="button" onClick={onClose} aria-label="카메라 닫기">×</button></div><progress className="camera-progress" value={progress} max={1} aria-label="검사 진행"/><div className="camera-brackets" aria-hidden="true"><i/><i/><i/><i/><b>＋</b></div>{children}</>;
}
