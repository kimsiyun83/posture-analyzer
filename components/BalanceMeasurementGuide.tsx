export default function BalanceMeasurementGuide({side}:{side:"left"|"right"}){
 const support=side==="left"?"왼발":"오른발",lift=side==="left"?"오른발":"왼발";
 const steps=[["양발로 준비","‘준비 완료’ 표시까지 기다려요."],[`${lift} 들기`,`${support}은 바닥에 두고 반대 발만 들어요.`],["발을 내려 종료","든 발을 바닥에 내리면 시간이 기록돼요."]];
 return <section className="care-card"><h2>한발서기 · 이렇게 측정해요</h2>
 <p><strong>지지발 = 바닥에 남겨 둘 발</strong>입니다. 지금은 {support}로 서서 {lift}을 듭니다. 좌우는 내 몸 기준입니다.</p>
 <div className="joint-guide-steps">{steps.map(([title,hint],i)=><figure key={title}>
 <svg viewBox="0 0 160 220" role="img" aria-label={title+" · "+hint}>
 <rect width="160" height="220" rx="16" fill="#eef7f3"/>
 <g transform={side==="left"?"translate(160 0) scale(-1 1)":undefined}>
 <circle cx="80" cy="34" r="17" fill="#dfb99a"/>
 <path d="M80 60V117M61 66L48 106M99 66L112 106" stroke="#76aaa0" strokeWidth="15" strokeLinecap="round"/>
 <path d="M69 120L65 186" stroke="#009d85" strokeWidth="12" strokeLinecap="round"/>
 <path d={i===1?"M91 120L111 149L95 164":"M91 120L98 186"} stroke="#de9836" strokeWidth="12" strokeLinecap="round" fill="none"/>
 <path d="M35 194H128" stroke="#9db5ab" strokeWidth="3"/>
 <ellipse cx="65" cy="197" rx="15" ry="4" fill="#009d85"/>
 </g>
 </svg><figcaption><strong>{i+1}. {title}</strong><span>{hint}</span></figcaption>
 </figure>)}</div><p className="muted small">초록 다리: 지지발 · 주황 다리: 들 발. 정면에서 어깨·골반·양쪽 발목이 보이게 서고, 두 발이 겹치지 않게 해 주세요.</p></section>;
}
