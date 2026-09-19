import InbodyReportView from "./InbodyReportView";
import {parseReport} from "@/lib/inbody-report";
import DetailedPostureReport from "./DetailedPostureReport";
import AssessmentExtra from "./AssessmentExtra";
import {parseReportMetrics} from "@/lib/pose/report-details";
import {recommend,type Goal} from "@/lib/assessment";
export default function CustomerRecordView({kind,data,date}:{kind:string;data:unknown;date:string}){
 if(kind==="inbody"){const r=parseReport(data);return r?<><p>{r.archived?"보관함 · ":""}{new Date(r.measuredAt).toLocaleString("ko-KR")}</p><InbodyReportView report={r} hasImage={!!(data as Record<string,unknown>).hasImage} sourceLink="/inbody"/></>:<p>인바디 기록을 읽을 수 없습니다.</p>;}
 const d=data as Record<string,unknown>;
 const m=kind==="posture"?parseReportMetrics(data):null;
 if(m){const goal:Goal=d.goal==="mobility"?"mobility":d.goal==="strength"?"strength":"balance";const rec=recommend({...m,goal,discomfort:d.discomfort===true});return <><AssessmentExtra front={m.front} side={m.side} extra={d}/><DetailedPostureReport front={m.front} side={m.side} programType={rec.program} dateLabel={new Date(date).toLocaleString("ko-KR")}/></>;}
 return <p>{kind==="chair"?`${d.count}회`:`왼쪽 ${d.left} / 오른쪽 ${d.right} ${kind==="balance"?"초":kind==="scratch"?"cm":"°"}`} · {d.source==="camera"?"카메라 측정":"수동 기록"}</p>;
}
