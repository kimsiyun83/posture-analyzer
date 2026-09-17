import Link from "next/link";
import DetailedPostureReport from "@/components/DetailedPostureReport";
import { DEMO_FRONT, DEMO_SIDE } from "@/lib/pose/report-details";

export default function DemoReportPage() {
  return <main className="report-page"><div className="report-page-toolbar report-no-print"><Link href="/">← LULU CARE 홈</Link><Link className="report-button" href="/analyze">내 체형 측정하기 →</Link></div><DetailedPostureReport front={DEMO_FRONT} side={DEMO_SIDE} programType="pt" dateLabel="예시 측정" name="체험 회원" demo/></main>;
}
