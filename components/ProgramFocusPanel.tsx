import type { FrontResult, SideResult, Severity } from "@/lib/pose/metrics";
import { collectReadings } from "@/lib/pose/metrics";
import { PROGRAM_FOCUS, PROGRAM_META, type ProgramType } from "@/lib/pose/programs";

const SEVERITY_STYLE: Record<Severity, string> = {
  normal: "border-emerald-200 bg-emerald-50",
  mild: "border-amber-200 bg-amber-50",
  notable: "border-rose-200 bg-rose-50",
};

interface ProgramFocusPanelProps {
  programType: ProgramType;
  frontResult: FrontResult;
  sideResult: SideResult;
}

export default function ProgramFocusPanel({ programType, frontResult, sideResult }: ProgramFocusPanelProps) {
  const meta = PROGRAM_META[programType];
  const readings = collectReadings(frontResult, sideResult);
  const focusPoints = PROGRAM_FOCUS[programType];

  return (
    <section className="rounded-xl border border-zinc-200 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-zinc-900">{meta.label} 핵심 체크포인트</h3>
        <span className="text-xs text-zinc-500">{meta.short}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{meta.description}</p>

      <div className="mt-4 flex flex-col gap-3">
        {focusPoints.map((point) => {
          const reading = readings.find((r) => r.key === point.key);
          if (!reading) return null;
          const advice = point.advice[reading.severity] ?? point.advice.normal ?? "";
          return (
            <div key={point.key} className={`rounded-lg border p-3 ${SEVERITY_STYLE[reading.severity]}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-900">{reading.label}</span>
                <span className="text-xs text-zinc-500">{point.reason}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-700">{advice}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
