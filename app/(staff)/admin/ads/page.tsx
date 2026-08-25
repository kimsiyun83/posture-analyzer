import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listAccounts, listKeywordSnapshots, listRules, listRunLogs } from "@/lib/services/naverAds";
import { AD_RULE_TYPE_LABEL_KO, type AdRuleType } from "@/lib/types";
import {
  analyzeKeywordsAction,
  connectAccountAction,
  createRuleAction,
  deleteAccountAction,
  deleteRuleAction,
  runNowAction,
  setAccountActiveAction,
  setAccountAutoExecuteAction,
  setRuleActiveAction,
} from "./actions";

export default async function NaverAdsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const accounts = await listAccounts();

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">네이버 검색광고 자동화</h1>
          <p className="mt-1 text-sm text-zinc-500">
            파워링크 키워드 분석과 규칙 기반 입찰가·예산·키워드 자동 관리. 계정을 연결하고 규칙을
            만들어도, <b>계정의 &quot;자동 실행&quot;이 꺼져 있으면 실제 광고비는 전혀 변경되지 않고
            제안만 기록</b>됩니다.
          </p>
        </div>
        <form action={runNowAction}>
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            지금 규칙 실행
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-zinc-900">광고 계정 연결</h2>
        <form action={connectAccountAction} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 p-3">
          <Field label="계정 이름" name="label" placeholder="OO스튜디오 네이버광고" required />
          <Field label="CUSTOMER_ID" name="customerId" required />
          <Field label="API_KEY (액세스 라이선스)" name="apiKey" required />
          <Field label="SECRET_KEY" name="secretKey" type="password" required />
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
            연결
          </button>
        </form>
        <p className="mb-4 text-xs text-zinc-500">
          네이버 검색광고 관리자센터 → 도구 → API 사용 관리에서 발급받을 수 있습니다. SECRET_KEY는 서버에 암호화되어
          저장되며 화면에 다시 표시되지 않습니다.
        </p>

        {accounts.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            아직 연결된 네이버 검색광고 계정이 없습니다.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">{account.label}</p>
                  <p className="text-xs text-zinc-500">
                    CUSTOMER_ID {account.customerId} · 규칙 {account._count.rules}개
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={setAccountActiveAction.bind(null, account.id, !account.active)}>
                    <button type="submit" className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-600">
                      {account.active ? "비활성화" : "활성화"}
                    </button>
                  </form>
                  <form action={deleteAccountAction.bind(null, account.id)}>
                    <button type="submit" className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600">
                      삭제
                    </button>
                  </form>
                </div>
              </div>

              <div
                className={`mt-3 flex items-center justify-between rounded-lg border p-3 text-sm ${
                  account.autoExecute ? "border-red-300 bg-red-50" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div>
                  <p className={`font-medium ${account.autoExecute ? "text-red-700" : "text-zinc-700"}`}>
                    자동 실행: {account.autoExecute ? "켜짐 (실제 입찰가/예산이 자동으로 변경됩니다)" : "꺼짐 (제안만 기록, 실제 반영 안 됨)"}
                  </p>
                  <p className="text-xs text-zinc-500">규칙별 &quot;활성화&quot; 스위치와 이 스위치가 모두 켜져 있어야 실제로 실행됩니다.</p>
                </div>
                <form action={setAccountAutoExecuteAction.bind(null, account.id, !account.autoExecute)}>
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                      account.autoExecute ? "bg-zinc-700" : "bg-red-600"
                    }`}
                  >
                    {account.autoExecute ? "자동 실행 끄기" : "자동 실행 켜기"}
                  </button>
                </form>
              </div>

              <KeywordTool accountId={account.id} />
              <RuleSection accountId={account.id} />
              <RunLogSection accountId={account.id} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function KeywordTool({ accountId }: { accountId: string }) {
  const snapshots = await listKeywordSnapshots(accountId, 30);
  const analyzeAction = analyzeKeywordsAction.bind(null, accountId);

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">파워링크 키워드 분석</h3>
      <form action={analyzeAction} className="mb-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs text-zinc-500">시드 키워드 (쉼표로 구분, 최대 5개)</label>
          <input
            name="seedKeywords"
            placeholder="필라테스, 자세교정, PT"
            className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
          분석
        </button>
      </form>

      {snapshots.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">키워드</th>
                <th className="px-3 py-1.5 font-medium">PC 월검색량</th>
                <th className="px-3 py-1.5 font-medium">모바일 월검색량</th>
                <th className="px-3 py-1.5 font-medium">경쟁정도</th>
                <th className="px-3 py-1.5 font-medium">평균노출광고수</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-t border-zinc-100">
                  <td className="px-3 py-1.5">{s.keyword}</td>
                  <td className="px-3 py-1.5">{s.monthlyPcSearches?.toLocaleString("ko-KR") ?? "-"}</td>
                  <td className="px-3 py-1.5">{s.monthlyMobileSearches?.toLocaleString("ko-KR") ?? "-"}</td>
                  <td className="px-3 py-1.5">{s.competitionLevel ?? "-"}</td>
                  <td className="px-3 py-1.5">{s.avgAdDepth?.toFixed(1) ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function RuleSection({ accountId }: { accountId: string }) {
  const rules = await listRules(accountId);
  const createAction = createRuleAction.bind(null, accountId);

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">자동화 규칙</h3>

      <form action={createAction} className="mb-3 flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
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
          <div>
            <label className="text-xs text-zinc-500">대상 레벨</label>
            <select name="targetLevel" className="mt-0.5 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="ADGROUP">광고그룹</option>
              <option value="CAMPAIGN">캠페인</option>
            </select>
          </div>
          <Field label="네이버 캠페인/그룹 ID" name="naverTargetId" placeholder="cmp-a001-... / grp-a001-..." required />
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

        <button type="submit" className="self-start rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
          규칙 추가
        </button>
      </form>

      {rules.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">이름</th>
                <th className="px-3 py-1.5 font-medium">유형</th>
                <th className="px-3 py-1.5 font-medium">대상</th>
                <th className="px-3 py-1.5 font-medium">상태</th>
                <th className="px-3 py-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-1.5">{r.name}</td>
                  <td className="px-3 py-1.5">{AD_RULE_TYPE_LABEL_KO[r.ruleType as AdRuleType] ?? r.ruleType}</td>
                  <td className="px-3 py-1.5 text-zinc-500">
                    {r.targetLevel} {r.naverTargetId}
                  </td>
                  <td className="px-3 py-1.5">{r.active ? "활성" : "비활성(제안만)"}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-2">
                      <form action={setRuleActiveAction.bind(null, r.id, !r.active)}>
                        <button type="submit" className="text-xs text-zinc-500 underline">
                          {r.active ? "비활성화" : "활성화"}
                        </button>
                      </form>
                      <form action={deleteRuleAction.bind(null, r.id)}>
                        <button type="submit" className="text-xs text-red-500 underline">
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function RunLogSection({ accountId }: { accountId: string }) {
  const logs = await listRunLogs(accountId, 20);
  if (logs.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">최근 실행 로그</h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-3 py-1.5 font-medium">시각</th>
              <th className="px-3 py-1.5 font-medium">규칙</th>
              <th className="px-3 py-1.5 font-medium">모드</th>
              <th className="px-3 py-1.5 font-medium">결과</th>
              <th className="px-3 py-1.5 font-medium">요약</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-zinc-100">
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {log.runAt.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-3 py-1.5">{log.rule?.name ?? "-"}</td>
                <td className="px-3 py-1.5">{log.mode === "LIVE" ? "실제 적용" : "시뮬레이션"}</td>
                <td className="px-3 py-1.5">{log.outcome}</td>
                <td className="px-3 py-1.5 text-zinc-500">{log.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
