import type { Reading } from "@/lib/pose/metrics";

const SEVERITY_STYLE: Record<Reading["severity"], string> = {
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  mild: "bg-amber-50 text-amber-700 border-amber-200",
  notable: "bg-rose-50 text-rose-700 border-rose-200",
};

const SEVERITY_LABEL: Record<Reading["severity"], string> = {
  normal: "정상 범위",
  mild: "경도 편차",
  notable: "뚜렷한 편차",
};

function formatValue(r: Reading): string {
  if (r.unit === "deg") return `${r.value.toFixed(1)}°`;
  return `${(r.value * 100).toFixed(1)}%`;
}

export function ReadingRow({ reading }: { reading: Reading }) {
  return (
    <div className={`rounded-lg border p-3 ${SEVERITY_STYLE[reading.severity]}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{reading.label}</span>
        <span className="text-sm font-semibold whitespace-nowrap">
          {formatValue(reading)} · {SEVERITY_LABEL[reading.severity]}
        </span>
      </div>
      <p className="mt-1 text-xs opacity-80">{reading.note}</p>
    </div>
  );
}

export function ScoreGauge({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#e11d48";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border-8 text-2xl font-bold"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-sm text-zinc-600">{label}</span>
    </div>
  );
}
