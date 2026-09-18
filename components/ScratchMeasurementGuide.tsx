export default function ScratchMeasurementGuide(){
 return <section className="care-card"><h2>어깨 스크래치 · 자세 예시</h2>
 <p>아래 그림은 <strong>등을 뒤에서 본 모습</strong>입니다. 위로 올린 팔을 기준으로 왼쪽·오른쪽을 기록하세요.</p>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,margin:"16px 0"}}>
 {(["왼팔","오른팔"] as const).map((side,i)=><figure key={side} style={{margin:0}}>
 <svg viewBox="0 0 170 220" role="img" aria-label={side+"을 머리 위로 올리고 반대 손은 허리 뒤로 올려 손끝 간격 측정"}>
 <rect width="170" height="220" rx="18" fill="#eef7f3"/>
 <g transform={i?"translate(170 0) scale(-1 1)":undefined}>
 <circle cx="85" cy="35" r="18" fill="#dbb99e"/>
 <path d="M58 66Q85 56 112 66L110 170H60Z" fill="#a8c9bf"/>
 <path d="M65 175V205M104 175V205" stroke="#61796f" strokeWidth="16"/>
 <path d="M58 70L41 40Q39 26 49 27L76 62L80 101" fill="none" stroke="#009d85" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M112 73L135 139L108 148L81 126" fill="none" stroke="#d28a2d" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
 <circle cx="80" cy="101" r="5" fill="#007362"/><circle cx="81" cy="126" r="5" fill="#996019"/>
 <path d="M88 101H103M88 126H103M99 101V126" stroke="#ad3650" strokeWidth="2" strokeDasharray="3 2"/>
 </g>
 </svg><figcaption style={{fontSize:13,lineHeight:1.7}}><strong>{i?"오른쪽 기록":"왼쪽 기록"}</strong><br/>{side} 위로 · 반대 손 허리 뒤로</figcaption>
 </figure>)}
 </div>
 <ol style={{paddingLeft:20,fontSize:14,lineHeight:1.9,listStyle:"decimal"}}>
 <li>한 손을 머리 위로 넘겨 등 아래쪽으로 뻗습니다.</li>
 <li>반대 손은 허리 뒤에서 등 위쪽으로 뻗습니다. 손을 잡아당기지 마세요.</li>
 <li>직원이 양쪽 가운데 손가락 끝 사이 간격을 줄자로 재고 cm로 입력합니다.</li>
 </ol>
 <p><strong>기록 예시:</strong> 손끝이 5cm 떨어지면 <strong>5</strong>, 닿거나 겹치면 현재 기록 방식에서는 <strong>0</strong>을 입력합니다. 겹치는 길이는 따로 구분하지 않습니다.</p>
 <p className="muted small">그림은 자세 설명용입니다. 통증 없는 범위에서 좌우를 같은 조건으로 측정하세요.</p>
 </section>;
}
