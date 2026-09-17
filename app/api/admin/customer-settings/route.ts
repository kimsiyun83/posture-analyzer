import {NextResponse} from "next/server";
import {portalAdmin,sameOrigin} from "@/lib/customer";
import {prisma} from "@/lib/db";
export async function POST(req:Request){if(!sameOrigin(req)||!await portalAdmin())return NextResponse.json({error:"관리자 권한이 필요합니다."},{status:403});const b=await req.json().catch(()=>null);if(!b||typeof b.signupEnabled!=="boolean"||typeof b.cameraEnabled!=="boolean")return NextResponse.json({error:"설정값을 확인해 주세요."},{status:400});await prisma.portalSettings.upsert({where:{id:"main"},create:{id:"main",signupEnabled:b.signupEnabled,cameraEnabled:b.cameraEnabled},update:{signupEnabled:b.signupEnabled,cameraEnabled:b.cameraEnabled}});return NextResponse.json({ok:true});}
