import {
  formatReadingValue,
  type FrontResult,
  type SideResult,
} from "@/lib/pose/metrics";
import { parseReportMetrics } from "@/lib/pose/report-details";
import { recommend, type Goal } from "@/lib/assessment";
export default function AssessmentExtra({
  front,
  side,
  extra,
}: {
  front: FrontResult;
  side: SideResult;
  extra: unknown;
}) {
  if (!extra || typeof extra !== "object") return null;
  const r = extra as {
    right: SideResult;
    back: { shoulder: number; hip: number };
    goal: Goal;
    discomfort: boolean;
  };
  if (
    !parseReportMetrics({ front, side: r.right }) ||
    !Number.isFinite(r.back?.shoulder) ||
    !Number.isFinite(r.back?.hip) ||
    !["balance", "strength", "mobility"].includes(r.goal) ||
    typeof r.discomfort !== "boolean"
  )
    return null;
  const suggestion = recommend({
    front,
    side,
    goal: r.goal,
    discomfort: r.discomfort,
  });
  return (
    <>
      <section className="care-card recommendation">
        <span className="eyebrow">검사 후 강습 상담</span>
        <h2>{suggestion.title}</h2>
        <p>{suggestion.reason}</p>
      </section>
      <section className="care-card crosscheck">
        <h2>네 방향 교차 확인</h2>
        <table>
          <thead>
            <tr>
              <th>항목</th>
              <th>정면 / 오른쪽</th>
              <th>후면 / 왼쪽</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>어깨 수평 기울기</td>
              <td>{front.shoulderTilt.value.toFixed(1)}°</td>
              <td>{r.back.shoulder.toFixed(1)}°</td>
            </tr>
            <tr>
              <td>골반 수평 기울기</td>
              <td>{front.hipTilt.value.toFixed(1)}°</td>
              <td>{r.back.hip.toFixed(1)}°</td>
            </tr>
            {(
              [
                "forwardHeadAngle",
                "shoulderPlumbOffset",
                "hipPlumbOffset",
                "kneePlumbOffset",
              ] as const
            ).map((k) => (
              <tr key={k}>
                <td>{side[k].label.split(" (")[0]}</td>
                <td>{formatReadingValue(r.right[k])}</td>
                <td>{formatReadingValue(side[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          종합 점수는 정면·왼쪽 측면 기준입니다. 사진은 저장하지 않았습니다.
          촬영 방향의 차이를 질환으로 해석하지 않습니다.
        </p>
      </section>
    </>
  );
}
