"use client";
/* eslint-disable react-hooks/set-state-in-effect -- load fetches account data asynchronously */
import {useEffect,useState} from "react";
import Link from "next/link";
import {CustomerLogin} from "@/components/CustomerAccess";
import {RECORD_LABELS} from "@/lib/customer-record";
import CustomerRecordView from "@/components/CustomerRecordView";
type Row={id:string;kind:string;createdAt:string;data:Record<string,unknown>};
export default function Page(){const [user,setUser]=useState<{name:string}|null>(null),[loaded,setLoaded]=useState(false),[rows,setRows]=useState<Row[]>([]),[page,setPage]=useState(0),[error,setError]=useState("");
 async function load(p=page){try{const a=await fetch("/api/customer/auth").then(r=>r.json());setUser(a.customer);if(a.customer){const r=await fetch(`/api/customer/records?page=${p}`);if(!r.ok)throw Error("기록을 불러오지 못했습니다.");setRows((await r.json()).records);}setLoaded(true);}catch(e){setError(String(e));}}// eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{void load(page);},[page]);
 return <div className="care-app"><header className="care-header"><Link href="/">← 홈</Link><b>내 계정 · 검사 기록</b></header><main className="care-main">{!loaded?<p>불러오는 중…</p>:!user?<CustomerLogin onLogin={()=>void load()}/>:<><h1>{user.name}님의 기록</h1><button className="care-secondary" onClick={async()=>{await fetch("/api/customer/auth",{method:"DELETE"});setRows([]);setUser(null);}}>로그아웃</button>{rows.map(r=>{return <details className="care-card" key={r.id}><summary>{RECORD_LABELS[r.kind]} · {new Date(r.createdAt).toLocaleString("ko-KR")}</summary><CustomerRecordView kind={r.kind} data={r.data} date={r.createdAt}/></details>;})}{!rows.length&&<p>저장한 검사가 없습니다.</p>}<div className="goal-options"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} 페이지</span><button disabled={rows.length<50} onClick={()=>setPage(p=>p+1)}>다음</button></div></>}<p role="alert">{error}</p></main></div>;
}
