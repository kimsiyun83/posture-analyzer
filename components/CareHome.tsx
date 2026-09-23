"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {House,ChartPie,Camera,Barbell,User,ArrowRight,PersonSimple,PersonSimpleWalk,Armchair,Desktop,FileImage} from '@phosphor-icons/react';
import {type AssessmentRecord,recommend} from '@/lib/assessment';
import {summarizeReport} from '@/lib/pose/report-details';
import DetailedPostureReport from './DetailedPostureReport';
import AssessmentExtra from './AssessmentExtra';
const services=[
 {title:'내 몸 검사하기',desc:'전신 자세부터 균형·관절 움직임까지',hint:'검사 선택',href:'/analyze/tests',Icon:PersonSimple,color:'mint'},
 {title:'업무 자세 알림',desc:'일하는 동안 고개와 상체 자세를 체크해요',hint:'카메라로 실시간 확인',href:'/analyze/desk',Icon:Desktop,color:'sage'},
 {title:'인바디 기록',desc:'결과지 사진을 모으고 수치 변화를 살펴요',hint:'사진 등록 · 변화 그래프',href:'/inbody',Icon:FileImage,color:'sand'}
];
export default function CareHome(){
 const [tab,setTab]=useState('home'),[records,setRecords]=useState<AssessmentRecord[]>([]),[selected,setSelected]=useState<AssessmentRecord|null>(null),[loading,setLoading]=useState(true),[recordMessage,setRecordMessage]=useState('');
 useEffect(()=>{let alive=true;fetch('/api/customer/records').then(async r=>{if(r.status===401){if(alive)setRecordMessage('로그인하면 이전 기록을 이어서 볼 수 있어요.');return;}if(!r.ok)throw Error();const d=await r.json();if(alive)setRecords(d.records.filter((r:{kind:string})=>r.kind==='posture').map((r:{id:string;createdAt:string;data:AssessmentRecord})=>({...r.data,id:r.id,date:r.createdAt})));}).catch(()=>{if(alive)setRecordMessage('기록을 불러오지 못했어요. 내 기록에서 다시 확인해 주세요.');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 const latest=records[0];
 return <div className="care-app care-home"><header className="care-header"><Link className="care-logo" href="/">LULU <small>CARE</small></Link><Link className="ux-account" href="/customer"><User size={18}/> 내 기록</Link></header>
 <main className="care-main">
 {tab==='home'&&<>
 <section className="ux-hero"><div><span className="ux-kicker">매일 조금 더 편안한 몸</span><h1>내 몸을 알고,<br/>나에게 맞게 움직여요.</h1><p>자세 확인부터 일상 속 관리까지.<br/>오늘 필요한 것부터 가볍게 시작하세요.</p><Link href="/analyze" className="care-primary">처음이라면, 전신 자세 검사 <ArrowRight size={20}/></Link><Link href="/analyze/demo" className="ux-quiet">검사 결과 예시 먼저 보기 ↗</Link></div><div className="ux-body-mark" aria-hidden="true"><PersonSimple size={136} weight="light"/><span>나를 위한 작은 체크</span></div></section>
 <section aria-labelledby="service-title"><div className="ux-section-head"><h2 id="service-title">오늘 무엇을 확인할까요?</h2><span>목적에 맞게 선택하세요</span></div><div className="ux-services">{services.map(({title,desc,hint,href,Icon,color})=><Link href={href} className={`ux-service ${color}`} key={href}><span className="ux-service-icon"><Icon size={32}/></span><span className="ux-service-copy"><small>{hint}</small><h3>{title}</h3><p>{desc}</p></span><ArrowRight size={20}/></Link>)}</div></section>
 <section className="ux-how"><h2>사용은 이렇게 간단해요</h2><ol><li><b>01</b><div><strong>골라요</strong><p>확인하고 싶은 검사를 선택해요.</p></div></li><li><b>02</b><div><strong>따라 해요</strong><p>준비 안내와 촬영 예시를 확인해요.</p></div></li><li><b>03</b><div><strong>기록해요</strong><p>결과를 보고, 로그인해 저장해요.</p></div></li></ol></section>
 <section className="care-card ux-recent"><div className="ux-section-head"><h2>지난 기록 이어보기</h2><Link href="/customer">전체 기록 →</Link></div>{loading?<p role="status">기록을 확인하고 있어요…</p>:latest?<><p>{new Date(latest.date).toLocaleDateString('ko-KR')} · 최근 전신 자세 검사</p><button className="care-secondary" onClick={()=>{setSelected(latest);setTab('reports');window.scrollTo(0,0);}}>최근 검사 결과 보기</button><button className="text-link" onClick={()=>{setSelected(null);setTab('reports');window.scrollTo(0,0);}}>체형 리포트 모아보기</button></>:<><p>{recordMessage||'아직 저장한 전신 자세 기록이 없어요. 첫 검사부터 차근차근 시작해 보세요.'}</p><Link href="/customer" className="ux-quiet">로그인 · 내 기록 확인 →</Link></>}</section>
 <p className="bottom-note">LULU CARE는 일상 속 몸의 변화를 살펴보는 참고 도구입니다.<br/>통증이나 불편감은 전문가와 상담해 주세요.</p>
 </>}
        {tab === "reports" && (
          <>
            <h1>내 리포트</h1>
            <p className="muted">로그인한 계정의 최근 측정 기록입니다.</p>
            {selected ? (
              <>
                <button className="text-link" onClick={() => setSelected(null)}>
                  ← 목록으로
                </button>
                <AssessmentExtra
                  front={selected.front}
                  side={selected.side}
                  extra={selected}
                />
                <DetailedPostureReport
                  front={selected.front}
                  side={selected.side}
                  programType={recommend(selected).program}
                  dateLabel={new Date(selected.date).toLocaleString("ko-KR")}
                />
              </>
            ) : records.length ? (
              records.map((r) => (
                <button
                  className="care-card record-row"
                  key={r.id}
                  onClick={() => setSelected(r)}
                >
                  <span>
                    {new Date(r.date).toLocaleString("ko-KR")}
                    <small>정면 · 양측면 · 후면</small>
                  </span>
                  <strong>{summarizeReport(r.front, r.side).score}점 →</strong>
                </button>
              ))
            ) : (
              <div className="care-card empty-panel">
                <ChartPie size={40} />
                <h2>아직 기록이 없어요</h2>
                <p>로그인하면 검사 완료 시 계정에 저장됩니다.</p>
                <Link href="/analyze" className="care-primary">
                  첫 검사 시작하기
                </Link>
              </div>
            )}
          </>
        )}
        {tab === "programs" && (
          <>
            <h1>내 몸에 맞는 강습</h1>
            {latest ? (
              <section className="care-card">
                <span className="eyebrow">검사 후 상담 가이드</span>
                <h2>{recommend(latest).title}</h2>
                <p>{recommend(latest).reason}</p>
                <p className="muted">
                  사진으로 근력이나 유연성을 진단하지 않습니다. 최종 강습은
                  움직임 평가 후 결정하세요.
                </p>
              </section>
            ) : (
              <section className="care-card empty-panel">
                <Barbell size={40} />
                <h2>먼저, 내 몸을 알아볼까요?</h2>
                <p>
                  검사를 마치면 결과와 운동 목표를 함께 확인하고 강습을 제안해
                  드려요.
                </p>
                <Link href="/analyze" className="care-primary">
                  검사 시작하기
                </Link>
              </section>
            )}
            <Link href="/analyze/tests" className="care-card record-row">
              움직임 검사 더하기 <ArrowRight />
            </Link>
          </>
        )}
</main><nav className="care-nav ux-nav" aria-label="주요 메뉴"><button className={tab==='home'?'active':''} onClick={()=>{setTab('home');setSelected(null);window.scrollTo(0,0);}} aria-current={tab==='home'?'page':undefined}><House size={24}/>홈</button><Link href="/analyze/tests"><Camera size={24}/>검사하기</Link><Link href="/customer"><ChartPie size={24}/>내 기록</Link><button className={tab==='programs'?'active':''} onClick={()=>{setTab('programs');window.scrollTo(0,0);}} aria-current={tab==='programs'?'page':undefined}><Barbell size={24}/>운동 안내</button></nav></div>;
}
export function TestCatalog(){
 const groups=[{title:'사진으로 자세 확인',hint:'처음이라면 여기서 시작하세요',items:[{name:'전신 자세 검사',desc:'정면·양측면·뒷모습 사진 4장으로 몸의 정렬을 확인해요.',badge:'사진 4장',href:'/analyze',Icon:PersonSimple}]},{title:'움직임을 직접 확인',hint:'카메라가 움직임을 따라가요',items:[{name:'한발 서기',desc:'발을 들면 시작, 내리면 종료. 양쪽 균형 시간을 기록해요.',badge:'자동 시간 측정',href:'/analyze/live?test=balance',Icon:PersonSimpleWalk},{name:'어깨 움직임',desc:'예시를 보고 팔을 움직이며 어깨 각도를 확인해요.',badge:'실시간 각도',href:'/analyze/live?test=shoulder',Icon:PersonSimple},{name:'팔꿈치 움직임',desc:'팔을 굽혔다 펴며 양쪽 팔꿈치 각도를 확인해요.',badge:'실시간 각도',href:'/analyze/live?test=elbow',Icon:PersonSimple}]},{title:'직원과 함께 기록',hint:'직원이 확인한 값을 직접 입력해요',items:[{name:'30초 의자 일어서기',desc:'30초 동안 일어선 횟수를 기록해요.',badge:'횟수 입력',href:'/analyze/movement?test=chair',Icon:Armchair},{name:'어깨 스크래치',desc:'등 뒤에서 양손 사이의 간격을 기록해요.',badge:'간격 입력',href:'/analyze/movement?test=scratch',Icon:PersonSimple}]}];
 return <div className="care-app care-catalog"><header className="care-header"><Link href="/">← 홈</Link><b>내 몸 검사하기</b><Link href="/customer">내 기록</Link></header><main className="care-main"><span className="ux-kicker">나에게 필요한 검사부터</span><h1>어디부터 확인할까요?</h1><p className="muted">검사를 선택하면 준비 방법과 예시를 먼저 보여드려요.</p><div className="ux-prep-strip"><span>밝은 공간</span><span>카메라 고정</span><span>움직이기 편한 복장</span></div>{groups.map(group=><section key={group.title} className="ux-test-group"><div className="ux-section-head"><h2>{group.title}</h2><span>{group.hint}</span></div>{group.items.map(({name,desc,badge,href,Icon})=><Link className="care-card test-row" href={href} key={name}><div className="test-icon"><Icon size={32}/></div><div><small className="ux-badge">{badge}</small><h3>{name}</h3><p>{desc}</p></div><ArrowRight size={20}/></Link>)}</section>)}<section className="ux-more"><h2>일상에서도 이어서 관리해요</h2><Link href="/analyze/desk">업무 자세 알림 <ArrowRight/></Link><Link href="/inbody">인바디 사진 · 변화 기록 <ArrowRight/></Link></section><p className="bottom-note">모든 검사는 참고용이며 의료 진단을 대신하지 않습니다.</p></main></div>;
}
