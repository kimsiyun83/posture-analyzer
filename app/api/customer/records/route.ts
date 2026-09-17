import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerSession,sameOrigin,portalSettings } from "@/lib/customer";
import { validCustomerRecord } from "@/lib/customer-record";
import type { Prisma } from "@/lib/generated/prisma/client";
export async function GET(req:Request){const c=await customerSession();if(!c)return NextResponse.json({error:"로그인이 필요합니다."},{status:401});const page=Math.max(0,Math.min(100000,Number(new URL(req.url).searchParams.get("page"))||0));return NextResponse.json({records:await prisma.customerRecord.findMany({where:{customerId:c.id},orderBy:{createdAt:"desc"},skip:Math.floor(page)*50,take:50})},{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:"허용되지 않은 요청"},{status:403});
 const c=await customerSession();if(!c)return NextResponse.json({error:"로그인 후 저장할 수 있습니다."},{status:401});
 const text=await req.text();if(text.length>50000)return NextResponse.json({error:"기록 크기가 너무 큽니다."},{status:413});
 let b;try{b=JSON.parse(text);}catch{return NextResponse.json({error:"올바르지 않은 기록"},{status:400});}
 if(!b||typeof b.clientId!=="string"||! /^[a-zA-Z0-9-]{10,80}$/.test(b.clientId)||!validCustomerRecord(b.kind,b.data))return NextResponse.json({error:"검사가 완료되지 않았거나 기록이 올바르지 않습니다."},{status:400});
 if(b.data.source==="camera"&&!(await portalSettings()).cameraEnabled)return NextResponse.json({error:"카메라 검사가 중단되었습니다."},{status:403});
 // Store only measurement fields; never arbitrary images, video, or extra payload fields.
 const d=b.data;
 const data=b.kind==="posture"?{front:d.front,side:d.side,right:d.right,back:d.back,goal:d.goal,discomfort:d.discomfort}:b.kind==="chair"?{count:d.count,seconds:30,source:d.source}:{left:d.left,right:d.right,source:d.source};
 const record=await prisma.customerRecord.upsert({where:{customerId_clientId:{customerId:c.id,clientId:b.clientId}},create:{customerId:c.id,clientId:b.clientId,kind:b.kind,data:data as Prisma.InputJsonValue},update:{}});
 return NextResponse.json({id:record.id});
}
