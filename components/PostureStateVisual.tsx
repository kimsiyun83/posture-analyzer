import type { Reading } from "@/lib/pose/metrics";
import { METRIC_GUIDES, REPORT_LABEL } from "@/lib/pose/report-details";

const COLORS = { normal: "#087f68", mild: "#aa6400", notable: "#bc3653" };
/** Explanatory schematics, deliberately not a reconstruction of the user's body. */
export default function PostureStateVisual({ reading: r }: { reading: Reading }) {
  const front = METRIC_GUIDES[r.key].view === "front";
  const tilt = ["headTilt", "shoulderTilt", "hipTilt"].includes(r.key);
  const knee = r.key.startsWith("kneeAlignment");
  const amount = r.severity === "normal" ? 0 : r.severity === "mild" ? 9 : 17;
  const sign = r.value < 0 ? -1 : 1;
  const direction = knee ? (sign > 0 ? "안쪽" : "바깥쪽") : (sign > 0 ? "앞쪽" : "뒤쪽");
  const message = r.severity === "normal" ? "이 항목은 앱의 참고 범위 안에 있어요."
    : tilt ? "수평선에 비해 기울기가 보여요."
    : r.key === "forwardHeadAngle" ? "귀와 어깨를 잇는 선이 더 누워 있어요."
    : `기준선보다 ${direction}으로 벗어난 모습이에요.`;
  function figure(reference: boolean) {
    const d = reference ? 0 : amount;
    const color = reference ? "#087f68" : COLORS[r.severity];
    const offset = d * sign;
    const leftLeg = r.key === "kneeAlignmentLeft";
    const kneeX = leftLeg ? 100 : 60;
    const kneeOffset = (leftLeg ? -1 : 1) * offset;
    const shoulderX = 80 + (r.key === "shoulderPlumbOffset" ? offset : 0);
    const hipX = 80 + (r.key === "hipPlumbOffset" ? offset : 0);
    const sideKneeX = 80 + (r.key === "kneePlumbOffset" ? offset : 0);
    const headX = shoulderX + 12 + (r.key === "forwardHeadAngle" ? d : 0);
    return <svg viewBox="0 0 160 215" role="img" aria-label={`${METRIC_GUIDES[r.key].title} · ${reference ? "기준 정렬 예시" : REPORT_LABEL[r.severity] + " 설명 그림"}`} style={{width:"100%",maxHeight:215}}>
      <rect x="1" y="1" width="158" height="213" rx="16" fill={reference ? "#f3f8f6" : "#faf7f4"}/>
      {front ? <>
        <circle cx="80" cy="35" r="18" fill="#cedbd5"/>
        <path d="M60 65L100 65L97 120L63 120Z" fill="#dce6e0"/>
        <path d="M60 68L47 115M100 68L113 115M65 125L60 188M95 125L100 188" fill="none" stroke="#b4c7be" strokeWidth="10" strokeLinecap="round"/>
        {tilt ? (() => { const y = r.key === "headTilt" ? 35 : r.key === "shoulderTilt" ? 65 : 120; return <>
          <path d={`M30 ${y}H130`} stroke="#8a9892" strokeDasharray="4 4" strokeWidth="2"/>
          <path d={`M55 ${y-d}L105 ${y+d}`} stroke={color} strokeWidth="5" strokeLinecap="round"/>
          <circle cx="55" cy={y-d} r="5" fill={color}/><circle cx="105" cy={y+d} r="5" fill={color}/>
        </>; })() : <>
          <path d={`M${kneeX} 123V188`} stroke="#8a9892" strokeDasharray="4 4" strokeWidth="2"/>
          <path d={`M${kneeX} 123L${kneeX+kneeOffset} 155L${kneeX} 188`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"/>
          <circle cx={kneeX+kneeOffset} cy="155" r="6" fill={color}/>
        </>}
      </> : <>
        <path d="M80 20V190" stroke="#8a9892" strokeDasharray="4 4" strokeWidth="2"/>
        <circle cx={headX} cy="32" r="16" fill="#cedbd5"/>
        <path d={`M${headX+12} 27l9 8h-9`} fill="#cedbd5"/>
        <path d={`M${headX} 48L${shoulderX} 67L${hipX} 120L${sideKneeX} 155L80 188`} fill="none" stroke="#b4c7be" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
        {r.key === "forwardHeadAngle" ? <>
          <path d={`M${shoulderX} 67H137`} stroke="#8a9892" strokeDasharray="4 4" strokeWidth="2"/>
          <path d={`M${shoulderX} 67L${headX} 32`} stroke={color} strokeWidth="4"/>
          <circle cx={headX} cy="32" r="5" fill={color}/>
        </> : (() => {const y=r.key==="shoulderPlumbOffset"?67:r.key==="hipPlumbOffset"?120:155;return <>
          <path d={`M80 ${y}H${80+offset}`} stroke={color} strokeWidth="4"/>
          <circle cx={80+offset} cy={y} r="6" fill={color}/>
        </>;})()}
        <text x="120" y="205" textAnchor="middle" fontSize="11" fill="#67756e">앞쪽 →</text>
      </>}
    </svg>;
  }
  return <figure style={{margin:"16px 0",breakInside:"avoid"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,textAlign:"center"}}>
      <div>{figure(true)}<small>기준 정렬 예시</small></div>
      <div>{figure(false)}<small style={{color:COLORS[r.severity],fontWeight:700}}>내 결과 · {REPORT_LABEL[r.severity]}</small></div>
    </div>
    <figcaption style={{fontSize:13,lineHeight:1.7,marginTop:12}}>
      <strong>{message}</strong>
      <div style={{fontSize:11,color:"#687371"}}>점선: 기준선 · 색 선/점: 확인 부위<br/>상태를 이해하기 위한 그림이며 실제 체형·편차 크기를 재현한 이미지가 아닙니다.{tilt ? " 기울어진 좌우 방향은 이 수치로 구분하지 않습니다." : knee ? ` ${leftLegLabel(r)}만 강조했습니다.` : ""}</div>
    </figcaption>
  </figure>;
}
function leftLegLabel(r: Reading) { return r.key === "kneeAlignmentLeft" ? "내 몸의 왼쪽 다리" : "내 몸의 오른쪽 다리"; }
