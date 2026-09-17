"use client";

import { useState, type ReactNode } from "react";
import PostureStateVisual from "@/components/PostureStateVisual";
import { collectReadings, formatReadingValue, type FrontResult, type SideResult } from "@/lib/pose/metrics";
import { PROGRAM_META, PROGRAM_ORDER, type ProgramType } from "@/lib/pose/programs";
import { COACHING, METRIC_GUIDES, REPORT_LABEL, readingInterpretation, summarizeReport } from "@/lib/pose/report-details";

export interface ReportHistoryEntry { date: string; frontScore: number; sideScore: number }
interface Props {
  front: FrontResult;
  side: SideResult;
  programType: ProgramType;
  dateLabel: string;
  name?: string;
  demo?: boolean;
  photos?: ReactNode;
  history?: ReportHistoryEntry[];
}
const checklist = ["카메라 높이·거리·수평을 동일하게 맞추기", "같은 발 간격과 편안한 선 자세 유지하기", "몸의 주요 지점이 가려지지 않게 촬영하기", "운동 전후 여부와 불편감을 함께 기록하기"];

export default function DetailedPostureReport({ front, side, programType, dateLabel, name, demo=false, photos, history=[] }: Props) {
  const [view, setView] = useState<"all" | "front" | "side">("all");
  const [program, setProgram] = useState(programType);
  const [checked, setChecked] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [printError, setPrintError] = useState("");
  const summary = summarizeReport(front,side);
  const coaching = COACHING[program];
  const all = collectReadings(front,side);
  const historyRows = history.filter(h=>Number.isFinite(h.frontScore)&&Number.isFinite(h.sideScore));

  function printReport() {
    setPrintError("");
    document.body.classList.add("printing-posture-report");
    const clean = () => { document.body.classList.remove("printing-posture-report"); window.removeEventListener("afterprint",clean); };
    window.addEventListener("afterprint",clean);
    try { window.print(); } catch { clean(); setPrintError("인쇄 창을 열지 못했습니다. 브라우저의 인쇄 메뉴를 이용해 주세요."); }
  }

  return <article className="posture-report" aria-label="상세 체형 분석 리포트">
    <div className="report-topline"><span className="report-brand">LULU<span> CARE</span></span><span>POSTURE ANALYSIS REPORT</span></div>
    {demo && <div className="report-demo" role="note"><strong>DEMO · 예시 리포트</strong><span>가상의 측정 데이터입니다. 실제 회원 기록으로 저장되지 않습니다.</span></div>}
    <header className="report-heading">
      <div><p className="report-eyebrow">몸을 이해하는 첫 번째 기록</p><h1>체형·자세 분석 리포트</h1><p>{name ? `${name} · ` : ""}{dateLabel} · 정면 5항목 / 측면 4항목</p></div>
      <button type="button" onClick={printReport} className="report-button report-print">인쇄 / PDF 저장</button>
    </header>
    {printError && <p role="alert">{printError}</p>}
    <p className="report-print-hint report-no-print">PDF로 보관하려면 인쇄 창에서 ‘PDF로 저장’을 선택하세요.</p>
    <nav aria-label="리포트 목차" className="report-nav report-no-print">{[["summary","분석 요약"],["metrics","항목별 분석"],["balance","좌우 비교"],["coaching","수업 가이드"],["followup","변화 기록"]].map(([id,label])=><a key={id} href={`#report-${id}`}>{label}</a>)}</nav>

    <section id="report-summary" className="report-summary">
      <div className="report-score"><span>종합 정렬 지표</span><div><strong>{summary.score}</strong><span>/ 100</span></div><p>정면·측면 점수의 평균</p><small>앱 내부 참고 점수 · 건강 점수 아님</small></div>
      <div className="report-summary-body"><p className="report-eyebrow">YOUR POSTURE, AT A GLANCE</p><h2>{summary.priorities.length ? `${summary.priorities.length}개 항목을 함께 확인해 보세요.` : "모든 항목이 앱 참고 범위에 있습니다."}</h2><p>{summary.priorities.length ? "표시된 편차가 반복되는지 먼저 확인하고, 실제 움직임과 불편감을 함께 살펴보세요." : "참고 범위라고 해서 통증이나 기능 문제가 없다는 뜻은 아닙니다. 현재 기록을 다음 측정의 비교 기준으로 활용하세요."}</p><div className="report-counts">{(["normal","mild","notable"] as const).map(s=><div key={s} className={`status-${s}`}><b>{summary.counts[s]}</b><span>{REPORT_LABEL[s]}</span></div>)}</div><div className="report-sub-scores"><span>정면 정렬 <b>{front.overallScore}점</b></span><span>측면 정렬 <b>{side.overallScore}점</b></span></div></div>
    </section>
    <div className="report-note"><b>리포트를 읽기 전에</b><p>사진에서 추정한 관절 위치로 계산한 2D 참고 지표입니다. 촬영 각도·거리·복장에 따라 값이 달라집니다. 수치만으로 질환, 근육 단축, 근력 저하 또는 운동 가능 여부를 판단하지 않습니다.</p></div>

    <section className="report-section"><div className="report-section-title"><span>01</span><div><h2>먼저 살펴볼 포인트</h2><p>앱의 편차 등급 순서로 정리한 재확인 항목입니다.</p></div></div>
      <div className="report-priorities">{(summary.priorities.length ? summary.priorities.slice(0,3) : summary.readings.slice(0,3)).map((r,i)=><a key={r.key} href={`#metric-${r.key}`} onClick={()=>setView("all")} className="report-priority"><span className="report-priority-index">0{i+1}</span><span className={`report-badge status-${r.severity}`}>{REPORT_LABEL[r.severity]}</span><h3>{METRIC_GUIDES[r.key].title}</h3><strong>{formatReadingValue(r)}</strong><p>{METRIC_GUIDES[r.key].check}</p><span className="report-text-link">상세 해설 보기 ↗</span></a>)}</div>
    </section>
    {photos && <section className="report-section"><div className="report-section-title"><span>02</span><div><h2>촬영 이미지와 정렬선</h2><p>실제 촬영 사진 위에 추정 지점과 기준선을 표시합니다.</p></div></div>{photos}</section>}

    <section id="report-metrics" className="report-section"><div className="report-section-title"><span>{photos ? "03":"02"}</span><div><h2>9개 항목, 자세히 읽기</h2><p>측정값 · 앱 참고 범위 · 해석 · 재확인 방법</p></div></div>
      <div className="report-filters report-no-print" role="group" aria-label="촬영 방향 필터">{(["all","front","side"] as const).map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{v==="all"?"전체 9":v==="front"?"정면 5":"측면 4"}</button>)}</div>
      <div className="report-metrics">{all.map(r=>{const g=METRIC_GUIDES[r.key];const displayed=r.unit==="ratio"?r.value*100:r.value;return <section id={`metric-${r.key}`} key={r.key} className={`report-metric ${view!=="all"&&view!==g.view?"report-filtered":""}`}>
        <div className="report-metric-top"><span>{g.view==="front"?"정면":"측면"}</span><span className={`report-badge status-${r.severity}`}>{REPORT_LABEL[r.severity]}</span></div><h3>{g.title}</h3><div className="report-value"><strong>{formatReadingValue(r)}</strong><span>참고 범위: {g.range}</span></div>
        <PostureStateVisual reading={r}/><meter min={0} max={g.max} value={Math.min(Math.abs(displayed),g.max)} aria-label={`${g.title} 측정 절댓값`} className={`report-meter status-${r.severity}`}/><p className="report-interpretation">{readingInterpretation(r)}</p>
        <dl><div><dt>무엇을 측정하나요?</dt><dd>{g.meaning}</dd></div><div><dt>다음 확인</dt><dd>{g.check}</dd></div></dl>
        <details><summary>해석 시 알아둘 한계</summary><p>{g.limit}</p></details><p className="report-print-limit">{g.limit}</p>
      </section>;})}</div>
      <p className="report-footnote">범위와 등급은 기존 앱 계산식의 분류 기준이며 임상 정상치가 아닙니다. 막대는 수치의 크기를 보여주며 위험 확률이 아닙니다. %는 cm나 관절 각도가 아닙니다.</p>
    </section>

    <section id="report-balance" className="report-section"><div className="report-section-title"><span>{photos?"04":"03"}</span><div><h2>좌우 무릎 정렬 비교</h2><p>같은 정면 사진에서 측정한 좌우 상대 편차입니다.</p></div></div><div className="report-balance"><div><span>LEFT · 왼쪽</span><strong>{formatReadingValue(front.kneeAlignmentLeft)}</strong><span className={`report-badge status-${front.kneeAlignmentLeft.severity}`}>{REPORT_LABEL[front.kneeAlignmentLeft.severity]}</span></div><div className="report-balance-diff"><span>부호를 포함한 좌우 차이</span><strong>{summary.kneeDifference.toFixed(1)}<small>%p</small></strong><p>양수: 안쪽 / 음수: 바깥쪽</p></div><div><span>RIGHT · 오른쪽</span><strong>{formatReadingValue(front.kneeAlignmentRight)}</strong><span className={`report-badge status-${front.kneeAlignmentRight.severity}`}>{REPORT_LABEL[front.kneeAlignmentRight.severity]}</span></div></div><p className="report-footnote">좌우 가동범위·근력 차이를 측정한 검사가 아닙니다. 정렬 편차의 방향이 다르면 차이가 커질 수 있습니다.</p></section>

    <section id="report-coaching" className="report-section"><div className="report-section-title"><span>{photos?"05":"04"}</span><div><h2>분석에서 수업으로</h2><p>측정 결과를 상담과 수업 설계의 출발점으로 활용하세요.</p></div></div><div className="report-filters report-no-print" role="group" aria-label="수업 유형">{PROGRAM_ORDER.map(p=><button type="button" key={p} aria-pressed={program===p} onClick={()=>setProgram(p)}>{p==="pt"?"PT":PROGRAM_META[p].label}</button>)}</div><div className="report-coaching"><div><span className="report-eyebrow">COACHING GUIDE</span><h3>{coaching.title}</h3><p>{coaching.intro}</p><p className="report-coaching-focus">오늘의 확인 항목<br/><b>{summary.priorities.slice(0,3).map(r=>METRIC_GUIDES[r.key].title).join(" · ")||"현재 정렬 유지와 실제 움직임 관찰"}</b></p></div><ol>{coaching.steps.map((s,i)=><li key={s}><span>0{i+1}</span>{s}</li>)}</ol></div><p className="report-footnote">운동 종류·횟수·강도는 병력, 통증, 움직임 평가 후 담당 강사가 결정합니다. 자동 운동 처방이 아닙니다.</p></section>

    <section id="report-followup" className="report-section"><div className="report-section-title"><span>{photos?"06":"05"}</span><div><h2>다음 기록을 위한 준비</h2><p>같은 조건으로 반복해야 변화를 비교하기 좋습니다.</p></div></div>
    <div className="report-followup"><div className="report-checklist"><h3>재측정 체크리스트</h3>{checklist.map(c=><label key={c}><input type="checkbox" checked={checked.includes(c)} onChange={()=>setChecked(v=>v.includes(c)?v.filter(x=>x!==c):[...v,c])}/><span>{c}</span></label>)}<small>{checked.length} / 4 확인 · 체크 상태는 현재 화면에서만 유지됩니다.</small></div><div className="report-history"><h3>측정 변화 기록</h3>{historyRows.length>0?<table><caption className="sr-only">이전 실제 측정의 정면·측면 점수</caption><thead><tr><th>측정일</th><th>정면</th><th>측면</th></tr></thead><tbody>{historyRows.slice(0,6).map((h,i)=><tr key={`${h.date}-${i}`}><td>{h.date}</td><td>{h.frontScore}점</td><td>{h.sideScore}점</td></tr>)}</tbody></table>:<><p className="report-empty-title">비교할 이전 기록이 없습니다.</p><p>{demo?"데모에는 가상의 개선 추이를 만들지 않았습니다.":"이번 결과를 회원 기록에 저장한 뒤, 다음 측정과 비교하세요."}</p></>}<p className="report-footnote">점수 상승만으로 기능 회복이나 치료 효과를 판단하지 않습니다.</p></div></div>
    <label className="report-memo"><span>상담 메모 <small>선택 · 인쇄에 포함 / 서버에 저장되지 않음</small></span><textarea value={memo} onChange={e=>setMemo(e.target.value)} maxLength={1500} rows={4} placeholder="오늘 확인한 불편감, 촬영 조건, 다음 상담에서 확인할 내용을 적어주세요."/><span className="report-memo-print">{memo||"작성된 상담 메모 없음"}</span></label></section>
    <footer className="report-footer"><strong>LULU CARE</strong><p>이 리포트는 의료 진단서가 아닙니다. 통증이나 이상 증상이 있다면 의료 전문가의 평가를 받으세요.</p><span>{demo?"DEMO / 가상 데이터":"정면·측면 사진 기반 참고용 스크리닝"}</span></footer>
  </article>;
}
