"use client";

import { useActionState } from "react";
import { analyzeKeywordsAction, type ActionState } from "./actions";

export default function KeywordAnalysisForm({ accountId }: { accountId: string }) {
  const boundAction = analyzeKeywordsAction.bind(null, accountId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="mb-3 flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[240px]">
        <label className="text-xs text-zinc-500">시드 키워드 (쉼표로 구분, 최대 5개)</label>
        <input
          name="seedKeywords"
          placeholder="필라테스, 자세교정, PT"
          className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "분석 중…" : "분석"}
      </button>
      {state.error && <p className="w-full text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}
