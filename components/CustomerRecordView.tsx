import DetailedPostureReport from "./DetailedPostureReport";
import AssessmentExtra from "./AssessmentExtra";
import {parseReportMetrics} from "@/lib/pose/report-details";
import {recommend,type Goal} from "@/lib/assessment";
export default function CustomerRecordView({kind,data,date}:{kind:string;data:unknown;date:string}){
 const d=data as Record<string,unknown>;
 const m=kind==="posture"?parseReportMetrics(data):null;
 if(m){const goal:Goal=d.goal==="mobility"?"mobility":d.goal==="strength"?"strength":"balance";const rec=recommend({...m,goal,discomfort:d.discomfort===true});return <><AssessmentExtra front={m.front} side={m.side} extra={d}/><DetailedPostureReport front={m.front} side={m.side} programType={rec.program} dateLabel={new Date(date).toLocaleString("ko-KR")}/></>;}
 return <p>{kind==="chair"?`${d.count}회`:`왼쪽 ${d.left} / 오른쪽 ${d.right} ${kind==="balance"?"초":kind==="scratch"?"cm":"°"}`} · {d.source==="camera"?"카메라 측정":"수동 기록"}</p>;
}
