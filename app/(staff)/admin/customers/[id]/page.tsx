import {notFound,redirect} from "next/navigation";
import Link from "next/link";
import {portalAdmin} from "@/lib/customer";
import {prisma} from "@/lib/db";
import {RECORD_LABELS} from "@/lib/customer-record";
import CustomerRecordView from "@/components/CustomerRecordView";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){if(!await portalAdmin())redirect("/login");const {id}=await params;const page=Math.max(0,Math.floor(Number((await searchParams).page)||0));const c=await prisma.customer.findUnique({where:{id}});if(!c)notFound();const rows=await prisma.customerRecord.findMany({where:{customerId:id},orderBy:{createdAt:"desc"},skip:page*50,take:50});return <div><Link href="/admin/customers">← 고객 관리</Link><h1>{c.name} · {c.email}</h1>{rows.map(r=>{return <details className="care-card" key={r.id}><summary>{RECORD_LABELS[r.kind]} · {r.createdAt.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</summary><CustomerRecordView kind={r.kind} data={r.data} date={r.createdAt.toISOString()}/></details>;})}{page>0&&<Link href={`?page=${page-1}`}>이전 </Link>}{rows.length===50&&<Link href={`?page=${page+1}`}> 다음</Link>}</div>;}
