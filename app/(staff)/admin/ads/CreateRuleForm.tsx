"use client";

import { useActionState } from "react";
import { createRuleAction, type ActionState } from "./actions";
import { AD_RULE_TYPE_LABEL_KO, type AdRuleType } from "@/lib/types";
import type { CampaignTargetOption } from "@/lib/services/naverAds";

export default function CreateRuleForm({
  accountId,
  targetOptions,
}: {
  accountId: string;
  targetOptions: CampaignTargetOption[];
}) {
  const boundAction = createRuleAction.bind(null, accountId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="mb-3 flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
      <div className="flex flex-wrap gap-2">
        <Field label="규칙 이름" name="name" placeholder="예: 파워링크 입찰가 상한" required />
        <div>
          <label className="text-xs text-zinc-500">규칙 유형</label>
          <select name="ruleType" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {(Object.entries(AD_RULE_TYPE_LABEL_KO) as [AdRuleType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {targetOptions.length > 0 ? (
          <div className="min-w-[280px] flex-1">
            <label className="text-xs text-zinc-500">대상 (캠페인/광고그룹)</label>
            <select
              name="targetChoice"
              required
              className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {targetOptions.map((opt) => (
                <option key={opt.naverTargetId} value={`${opt.targetLevel}::${opt.naverTargetId}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-zinc-500">대상 레벨</label>
              <select name="targetLevel" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
                <option value="ADGROUP">광고그룹</option>
                <option value="CAMPAIGN">캠페인</option>
              </select>
            </div>
            <Field label="네이버 캠페인/그룹 ID" name="naverTargetId" placeholder="cmp-a001-... / grp-a001-..." required />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-2">
        <Field label="최대 CPC(원) — 입찰가 상한용" name="maxCpc" type="number" />
        <Field label="인하 비율(%) — 입찰가 상한용" name="stepPercent" type="number" placeholder="10" />
        <Field label="최소 입찰가(원) — 입찰가 상한용" name="minBid" type="number" placeholder="70" />
        <Field label="조회 기간(7 또는 30일) — 무전환 정지용" name="lookbackDays" type="number" placeholder="7" />
        <Field label="소진액 기준(원) — 무전환 정지용" name="costThreshold" type="number" />
        <Field label="일 예산 상한(원) — 예산 초과 정지용" name="dailyBudgetCap" type="number" />
      </div>
      <p className="text-xs text-zinc-400">규칙 유형에 해당하는 항목만 입력하면 됩니다.</p>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "추가 중…" : "규칙 추가"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
