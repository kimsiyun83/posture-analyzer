"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef} from "react";
import {drawPose} from "@/lib/pose/live-draw";
import type {PoseLandmarks} from "@/lib/pose/landmarks";
import {GuideControls,MeasurementGuides,useMeasurementGuides} from "./MeasurementGuides";
export default function MeasurementPhoto({src,landmarks,alt}:{src:string;landmarks:PoseLandmarks;alt:string}){
 const [settings,onChange]=useMeasurementGuides();const canvas=useRef<HTMLCanvasElement>(null);
 function draw(width:number,height:number){const cv=canvas.current;if(!cv)return;cv.width=width;cv.height=height;const ctx=cv.getContext("2d");if(ctx)drawPose(ctx,landmarks,width,height);}
 useEffect(()=>{const image=new Image();image.onload=()=>draw(image.naturalWidth,image.naturalHeight);image.src=src;return()=>{image.onload=null;};},[src,landmarks]); // eslint-disable-line react-hooks/exhaustive-deps
 return <div className="measurement-photo"><div className="measurement-photo-stage"><img src={src} alt={alt} onLoad={e=>draw(e.currentTarget.naturalWidth,e.currentTarget.naturalHeight)}/><canvas ref={canvas} aria-hidden="true" style={{visibility:settings.skeleton?"visible":"hidden"}}/><MeasurementGuides settings={settings} onChange={onChange}/></div><GuideControls settings={settings} onChange={onChange}/></div>;
}
