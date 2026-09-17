"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
export function CustomerLogin({onLogin}:{onLogin:()=>void}){
 const [signup,setSignup]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 return <section className="care-card"><h2>{signup?"간편 회원가입":"고객 로그인"}</h2><p>검사 결과는 내 계정에 저장되며 센터 관리자가 상담에 활용합니다.</p><form className="portal-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);try{const r=await fetch("/api/customer/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:signup?"signup":"login",name:f.get("name"),email:f.get("email"),password:f.get("password"),consent:f.get("consent")==="on"})});const d=await r.json();if(!r.ok)throw Error(d.error);onLogin();}catch(e){setError(e instanceof Error?e.message:"연결을 확인해 주세요.");}finally{setBusy(false);}}}>
 {signup&&<label>이름<input name="name" autoComplete="name" maxLength={50} required/></label>}
 <label>이메일<input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label>비밀번호<input name="password" type="password" autoComplete={signup?"new-password":"current-password"} minLength={8} maxLength={72} required/></label>
 {signup&&<label className="check-label"><input type="checkbox" name="consent" required/>이름·이메일·검사 수치·검사일시를 계정 및 센터 상담 관리 목적으로 보관하고 관리자가 조회하는 데 동의합니다. 촬영 영상은 서버에 저장하지 않습니다. 삭제 요청은 센터에 문의해 주세요.</label>}
 <button className="care-primary" disabled={busy}>{busy?"처리 중…":signup?"가입하고 시작":"로그인"}</button><p role="alert">{error}</p></form><button className="care-secondary" onClick={()=>{setSignup(!signup);setError("");}}>{signup?"기존 계정으로 로그인":"처음이신가요? 간편 가입"}</button><Link href="/login">직원·관리자 로그인</Link></section>;
}
export function CustomerSave({kind,data,clientId}:{kind:string;data:unknown;clientId:string}){
 const [auth,setAuth]=useState<boolean|null>(null),[status,setStatus]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;fetch("/api/customer/auth").then(r=>r.json()).then(d=>{if(active)setAuth(!!d.customer);}).catch(()=>{if(active)setStatus("로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.");});return()=>{active=false;};},[retry]);
 useEffect(()=>{if(!auth)return;let active=true;fetch("/api/customer/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,data,clientId})}).then(async r=>{const d=await r.json();if(r.status===401&&active)setAuth(false);if(!r.ok)throw Error(d.error);if(active)setStatus("✓ 내 계정에 저장했습니다. 관리자가 결과를 확인할 수 있습니다.");}).catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[auth,kind,data,clientId,retry]);
 return <section>{auth===false?<CustomerLogin onLogin={()=>{setAuth(true);setRetry(x=>x+1);}}/>:<div className="care-card"><p role="status">{status||"검사 결과 저장 중…"}</p>{!status.startsWith("✓")&&<button className="care-secondary" onClick={()=>setRetry(x=>x+1)}>다시 시도</button>}<Link href="/customer">내 전체 검사 기록 보기 →</Link></div>}</section>;
}
