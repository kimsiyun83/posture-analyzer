import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberDetail } from "@/lib/services/members";
import DetailedPostureReport from "@/components/DetailedPostureReport";
import { parseReportMetrics } from "@/lib/pose/report-details";
import { PROGRAM_ORDER, type ProgramType } from "@/lib/pose/programs";

export default async function SavedPostureReport({params}:{params:Promise<{id:string;resultId:string}>}) {
  const {id,resultId}=await params;
  const member=await getMemberDetail(id);
  if(!member) notFound();
  const result=member.postureResults.find(r=>r.id===resultId);
  if(!result) notFound();
  const metrics=parseReportMetrics(result.metricsJson);
  const program=PROGRAM_ORDER.includes(result.programType as ProgramType)?result.programType as ProgramType:"pt";
  return <main><div className="mb-6 report-no-print"><Link href={`/members/${id}`} className="text-sm text-zinc-600">← 회원 기록으로 돌아가기</Link></div>{metrics?<DetailedPostureReport front={metrics.front} side={metrics.side} programType={program} name={member.name} dateLabel={result.measuredAt.toLocaleDateString("ko-KR")} history={member.postureResults.filter(r=>r.measuredAt<=result.measuredAt).slice(0,6).map(r=>({date:r.measuredAt.toLocaleDateString("ko-KR"),frontScore:r.frontScore,sideScore:r.sideScore}))}/>:<p className="rounded-xl border border-zinc-200 p-6">이 기록에는 상세 리포트를 구성할 측정값이 충분하지 않습니다. 회원 기록에서 기존 점수를 확인하거나 새로 측정해 주세요.</p>}</main>;
}
