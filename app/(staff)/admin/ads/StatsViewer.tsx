"use client";

import { useActionState } from "react";
import { viewStatsAction, type StatsActionState } from "./actions";
import type { CampaignTargetOption } from "@/lib/services/naverAds";

const DATE_PRESET_LABEL: Record<string, string> = {
  today: "오늘",
  yesterday: "어제",
  last7days: "최근 7일",
  last30days: "최근 30일",
};

export default function StatsViewer({
  accountId,
  targetOptions,
}: {
  accountId: string;
  targetOptions: CampaignTargetOption[];
}) {
  const boundAction = viewStatsAction.bind(null, accountId);
  const [state, formAction, pending] = useActionState<StatsActionState, FormData>(boundAction, {});

  if (targetOptions.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-900">성과 보기</h3>
        <p className="text-xs text-zinc-400">캠페인 목록을 불러오지 못해 성과 조회를 사용할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">성과 보기 (파워링크·플레이스 등 전체 캠페인 유형 지원)</h3>
      <form action={formAction} className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[280px] flex-1">
          <label className="text-xs text-zinc-500">대상 (캠페인/광고그룹)</label>
          <select
            name="naverTargetId"
            required
            className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {targetOptions.map((opt) => (
              <option key={opt.naverTargetId} value={opt.naverTargetId}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">기간</label>
          <select name="datePreset" defaultValue="yesterday" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {Object.entries(DATE_PRESET_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "조회 중…" : "조회"}
        </button>
      </form>

      {state.error && <p className="mb-2 text-sm text-rose-600">{state.error}</p>}

      {state.stats && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <StatTile label="노출수" value={state.stats.impCnt.toLocaleString("ko-KR")} />
          <StatTile label="클릭수" value={state.stats.clkCnt.toLocaleString("ko-KR")} />
          <StatTile label="소진액" value={`${Math.round(state.stats.salesAmt).toLocaleString("ko-KR")}원`} />
          <StatTile label="클릭률" value={`${state.stats.ctr.toFixed(2)}%`} />
          <StatTile label="평균 CPC" value={`${Math.round(state.stats.cpc).toLocaleString("ko-KR")}원`} />
          <StatTile label="전환수" value={state.stats.ccnt.toLocaleString("ko-KR")} />
        </div>
      )}
      {state.stats === null && <p className="text-sm text-zinc-400">해당 기간에 데이터가 없습니다.</p>}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
