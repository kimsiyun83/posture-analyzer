import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function customerSession() {
  const token = (await cookies()).get("customer_session")?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET), { audience: "customer", algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return await prisma.customer.findFirst({where:{id:payload.sub,active:true},select:{id:true,name:true,email:true}});
  } catch { return null; }
}
export async function setCustomerSession(id:string) {
  if (!process.env.JWT_SECRET) throw new Error("로그인 설정이 필요합니다.");
  const token=await new SignJWT({}).setSubject(id).setAudience("customer").setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  (await cookies()).set("customer_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:604800});
}
export async function portalAdmin() {
  const s=await getSession();
  if (!s || s.role!=="admin") return null;
  return prisma.user.findFirst({where:{id:s.sub,role:"admin",active:true},select:{id:true}});
}
export function sameOrigin(req:Request) {
  return req.headers.get("origin")===new URL(req.url).origin;
}
export async function portalSettings() {
  return (await prisma.portalSettings.findUnique({where:{id:"main"}})) ?? {signupEnabled:true,cameraEnabled:true};
}
