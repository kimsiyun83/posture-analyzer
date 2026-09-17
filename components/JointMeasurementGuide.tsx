const STEPS = {
  shoulder: [
    { title: "팔을 아래로", hint: "몸통을 세우고 팔을 편안하게 내려요.", angle: 0 },
    { title: "앞으로 천천히", hint: "팔꿈치를 편 채 팔을 앞으로 올려요.", angle: 90 },
    { title: "가능한 만큼 올리기", hint: "몸통을 젖히지 않고 최대 각도를 기록해요.", angle: 135 },
  ],
  elbow: [
    { title: "팔을 펴고 시작", hint: "위팔을 몸통 옆에 두고 팔을 펴요.", angle: 0 },
    { title: "팔꿈치 굽히기", hint: "위팔은 고정하고 아래팔만 들어요.", angle: 90 },
    { title: "손을 어깨 쪽으로", hint: "통증 없는 범위에서 굽힌 각도를 기록해요.", angle: 135 },
  ],
};
export default function JointMeasurementGuide({ kind }: { kind: "shoulder" | "elbow" }) {
  return <section className="care-card joint-guide">
    <h2>측정 자세 예시</h2>
    <p>측정할 팔이 카메라를 향하도록 <strong>옆으로 서세요.</strong> 왼쪽·오른쪽은 화면이 아닌 내 몸 기준입니다.</p>
    <div className="joint-guide-steps">
      {STEPS[kind].map((step, index) => {
        const rad = step.angle * Math.PI / 180;
        const shoulder = { x: 76, y: 64 };
        const elbow = kind === "shoulder" ? { x: 76 + 36 * Math.sin(rad), y: 64 + 36 * Math.cos(rad) } : { x: 76, y: 100 };
        const wrist = kind === "shoulder" ? { x: 76 + 72 * Math.sin(rad), y: 64 + 72 * Math.cos(rad) } : { x: 76 + 36 * Math.sin(rad), y: 100 + 36 * Math.cos(rad) };
        return <figure key={step.title}>
          <svg viewBox="0 0 170 220" role="img" aria-label={`${kind === "shoulder" ? "어깨 올림" : "팔꿈치 굽힘"} ${step.angle}도 예시: ${step.title}`}>
            <rect x="4" y="4" width="162" height="212" rx="20" fill="#f0f8f5" />
            <path d="M25 195H145" stroke="#cbdcd5" strokeWidth="2" />
            <circle cx="76" cy="38" r="16" fill="#dfb99a" />
            <path d="M86 31L99 39L86 43" fill="#dfb99a" />
            <path d="M76 64L76 127" stroke="#9ab6ab" strokeWidth="25" strokeLinecap="round" />
            <path d="M72 130L63 186M81 130L92 186" stroke="#637b72" strokeWidth="12" strokeLinecap="round" />
            <path d="M76 64L76 145" stroke="#afc9be" strokeDasharray="4 4" strokeWidth="2" />
            <path d={`M${shoulder.x} ${shoulder.y}L${elbow.x} ${elbow.y}L${wrist.x} ${wrist.y}`} fill="none" stroke="#009d85" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            {[shoulder, elbow, wrist].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#007b69" strokeWidth="2" />)}
            <text x="132" y="205" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#007b69">{step.angle}°</text>
          </svg>
          <figcaption><strong>{index + 1}. {step.title}</strong><span>{step.hint}</span></figcaption>
        </figure>;
      })}
    </div>
    <p className="muted small">그림의 각도는 동작 설명용 예시이며 달성 목표가 아닙니다. 어깨는 팔을 내렸을 때 0°, 팔꿈치는 편 상태를 굽힘 0°로 표시합니다.</p>
    <p className="muted small">어깨·팔꿈치·손목과 골반이 화면 안에 보이도록 거리를 맞추고, 검사 후 ‘이번 최대 각도 기록’을 누르세요.</p>
  </section>;
}
