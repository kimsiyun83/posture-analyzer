import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { customerSession, setCustomerSession, sameOrigin, portalSettings } from "@/lib/customer";
import { customerRateLimit } from "@/lib/customer-rate-limit";
export async function GET(){return NextResponse.json({customer:await customerSession(),settings:await portalSettings()},{headers:{"Cache-Control":"no-store"}});}
export async function DELETE(req:Request){if(!sameOrigin(req))return NextResponse.json({error:"허용되지 않은 요청"},{status:403});(await cookies()).delete("customer_session");return NextResponse.json({ok:true});}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:"허용되지 않은 요청"},{status:403});
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";
 if(!await customerRateLimit(`ip:${ip}`,30))return NextResponse.json({error:"잠시 후 다시 시도해 주세요."},{status:429});
 const b=await req.json().catch(()=>null);
 if(!b || typeof b.email!=="string" || typeof b.password!=="string")return NextResponse.json({error:"입력값을 확인하세요."},{status:400});
 const email=b.email.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||b.password.length<8||new TextEncoder().encode(b.password).length>72)return NextResponse.json({error:"이메일과 8~72자 비밀번호를 입력하세요."},{status:400});
 if(!await customerRateLimit(`email:${email}`,10))return NextResponse.json({error:"로그인 시도가 많습니다. 5분 뒤 다시 시도해 주세요."},{status:429});
 if(b.mode==="signup"){
  if(!(await portalSettings()).signupEnabled)return NextResponse.json({error:"신규 가입을 잠시 중단했습니다."},{status:403});
  if(typeof b.name!=="string"||!b.name.trim()||b.name.length>50||b.consent!==true)return NextResponse.json({error:"이름과 기록 관리 동의를 확인해 주세요."},{status:400});
  try{const c=await prisma.customer.create({data:{email,name:b.name.trim(),passwordHash:await hashPassword(b.password)}});await setCustomerSession(c.id);return NextResponse.json({ok:true});}
  catch(e){if((e as {code?:string}).code==="P2002")return NextResponse.json({error:"가입할 수 없는 이메일입니다. 기존 계정으로 로그인해 주세요."},{status:409});throw e;}
 }
 const c=await prisma.customer.findUnique({where:{email}});
 if(!c||!c.active||!await verifyPassword(b.password,c.passwordHash))return NextResponse.json({error:"이메일 또는 비밀번호를 확인해 주세요."},{status:401});
 await setCustomerSession(c.id);return NextResponse.json({ok:true});
}
