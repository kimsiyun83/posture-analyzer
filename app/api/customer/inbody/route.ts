import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {customerSession,sameOrigin} from '@/lib/customer';
import {parseReport} from '@/lib/inbody-report';
import type {Prisma} from '@/lib/generated/prisma/client';
export async function GET(req:Request){
 const c=await customerSession();if(!c)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});const q=new URL(req.url).searchParams,id=q.get('id');
 if(id){const record=await prisma.customerRecord.findFirst({where:{id,customerId:c.id,kind:'inbody'}});return record?NextResponse.json({record},{headers:{'Cache-Control':'no-store'}}):NextResponse.json({error:'기록을 찾을 수 없습니다.'},{status:404});}
 const page=Math.max(0,Math.min(10000,Math.floor(Number(q.get('page'))||0)));
 const rows=await prisma.customerRecord.findMany({where:{customerId:c.id,kind:'inbody'},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:page*30,take:31});
 return NextResponse.json({records:rows.slice(0,30).map(r=>{const d=r.data as Record<string,unknown>;const {image,...data}=d;return {...r,data,hasImage:!!image};}),hasMore:rows.length>30},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'허용되지 않은 요청'},{status:403});const c=await customerSession();if(!c)return NextResponse.json({error:'로그인 후 저장할 수 있습니다.'},{status:401});
 const text=await req.text();if(text.length>1200000)return NextResponse.json({error:'사진 크기를 줄여 주세요.'},{status:413});
 let b;try{b=JSON.parse(text);}catch{return NextResponse.json({error:'올바르지 않은 기록'},{status:400});}
 const data=parseReport(b?.data);if(!data||typeof b.clientId!=='string'||! /^[a-zA-Z0-9-]{10,80}$/.test(b.clientId))return NextResponse.json({error:'검사일과 수치를 확인해 주세요. 표준 범위는 최솟값보다 최댓값이 커야 합니다.'},{status:400});
 delete data.archived;
 const record=await prisma.customerRecord.upsert({where:{customerId_clientId:{customerId:c.id,clientId:b.clientId}},create:{customerId:c.id,clientId:b.clientId,kind:'inbody',data:data as unknown as Prisma.InputJsonValue},update:{}});
 if(record.kind!=='inbody')return NextResponse.json({error:'다른 검사에 사용된 기록 ID입니다.'},{status:409});return NextResponse.json({id:record.id});
}
export async function PATCH(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'허용되지 않은 요청'},{status:403});const c=await customerSession();if(!c)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const b=await req.json().catch(()=>null);if(!b||typeof b.id!=='string'||typeof b.archived!=='boolean')return NextResponse.json({error:'잘못된 요청'},{status:400});
 const r=await prisma.customerRecord.findFirst({where:{id:b.id,customerId:c.id,kind:'inbody'}});if(!r)return NextResponse.json({error:'기록을 찾을 수 없습니다.'},{status:404});
 await prisma.customerRecord.update({where:{id:r.id},data:{data:{...(r.data as Prisma.JsonObject),archived:b.archived}}});return NextResponse.json({ok:true});
}
