import {createHash} from "node:crypto";
import {prisma} from "@/lib/db";
// One atomic counter per hashed key across all Vercel instances. No raw IP is stored.
export async function customerRateLimit(identity:string,limit:number){
 const key=createHash("sha256").update(identity).digest("hex");
 const rows=await prisma.$queryRaw<{count:number}[]>`
 INSERT INTO "PortalRateLimit" ("key","count","resetAt") VALUES (${key},1,NOW()+INTERVAL '5 minutes')
 ON CONFLICT ("key") DO UPDATE SET
 "count"=CASE WHEN "PortalRateLimit"."resetAt"<NOW() THEN 1 ELSE "PortalRateLimit"."count"+1 END,
 "resetAt"=CASE WHEN "PortalRateLimit"."resetAt"<NOW() THEN NOW()+INTERVAL '5 minutes' ELSE "PortalRateLimit"."resetAt" END
 RETURNING "count"`;
 // Keep only recent anti-abuse counters.
 await prisma.portalRateLimit.deleteMany({where:{resetAt:{lt:new Date(Date.now()-86400000)}}});
 return rows[0].count<=limit;
}
