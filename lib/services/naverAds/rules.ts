import { prisma } from "@/lib/db";
import type { NaverAdAccount, AdAutomationRule } from "@/lib/generated/prisma/client";
import type { NaverAdCredentials } from "./client";
import { getStats, listKeywords, setCampaignStatus, setKeywordLock, updateKeywordBid } from "./client";

// The automation rule engine. Two independent switches gate every LIVE write to the
// Naver account — both must be on, or nothing but a proposal is ever written:
//   1. account.autoExecute (the account-wide kill switch, off by default)
//   2. rule.active (per-rule, also off by default)
// When either is off, evaluateRule still runs the same read-only analysis and records
// what it *would* have done as an AdRunLog with mode "SIMULATED" / outcome "PROPOSED",
// so staff can review proposals before ever turning autoExecute on.

interface BidCeilingParams {
  maxCpc: number;
  stepPercent: number; // e.g. 10 = lower bid by 10% when over maxCpc
  minBid: number;
}

interface PauseNoConversionParams {
  lookbackDays: 7 | 30;
  costThreshold: number; // 원
}

interface DailyBudgetGuardParams {
  dailyBudgetCap: number; // 원, today's spend
}

interface RuleAction {
  description: string;
  apply: () => Promise<void>;
}

async function planBidCeiling(
  creds: NaverAdCredentials,
  rule: AdAutomationRule,
): Promise<RuleAction[]> {
  const params = rule.paramsJson as unknown as BidCeilingParams;
  const keywords = await listKeywords(creds, rule.naverTargetId);
  if (keywords.length === 0) return [];

  const stats = await getStats(
    creds,
    keywords.map((k) => k.nccKeywordId),
    "yesterday",
  );
  const statsById = new Map(stats.map((s) => [s.id, s]));

  const actions: RuleAction[] = [];
  for (const kw of keywords) {
    const stat = statsById.get(kw.nccKeywordId);
    if (!stat || stat.cpc <= params.maxCpc) continue;

    const newBid = Math.max(params.minBid, Math.round(kw.bidAmt * (1 - params.stepPercent / 100)));
    if (newBid >= kw.bidAmt) continue;

    actions.push({
      description: `"${kw.keyword}" 입찰가 ${kw.bidAmt.toLocaleString("ko-KR")}원 → ${newBid.toLocaleString("ko-KR")}원 (CPC ${Math.round(stat.cpc).toLocaleString("ko-KR")}원 > 상한 ${params.maxCpc.toLocaleString("ko-KR")}원)`,
      apply: async () => {
        await updateKeywordBid(creds, kw.nccKeywordId, kw.nccAdgroupId, newBid);
      },
    });
  }
  return actions;
}

async function planPauseNoConversion(
  creds: NaverAdCredentials,
  rule: AdAutomationRule,
): Promise<RuleAction[]> {
  const params = rule.paramsJson as unknown as PauseNoConversionParams;
  const keywords = await listKeywords(creds, rule.naverTargetId);
  const activeKeywords = keywords.filter((k) => !k.userLock);
  if (activeKeywords.length === 0) return [];

  const datePreset = params.lookbackDays === 30 ? "last30days" : "last7days";
  const stats = await getStats(
    creds,
    activeKeywords.map((k) => k.nccKeywordId),
    datePreset,
  );
  const statsById = new Map(stats.map((s) => [s.id, s]));

  const actions: RuleAction[] = [];
  for (const kw of activeKeywords) {
    const stat = statsById.get(kw.nccKeywordId);
    if (!stat) continue;
    if (stat.ccnt > 0 || stat.salesAmt < params.costThreshold) continue;

    actions.push({
      description: `"${kw.keyword}" 일시정지 — 최근 ${params.lookbackDays}일간 ${Math.round(stat.salesAmt).toLocaleString("ko-KR")}원 소진, 전환 0건 (기준 ${params.costThreshold.toLocaleString("ko-KR")}원)`,
      apply: async () => {
        await setKeywordLock(creds, kw.nccKeywordId, kw.nccAdgroupId, true);
      },
    });
  }
  return actions;
}

async function planDailyBudgetGuard(
  creds: NaverAdCredentials,
  rule: AdAutomationRule,
): Promise<RuleAction[]> {
  const params = rule.paramsJson as unknown as DailyBudgetGuardParams;
  const stats = await getStats(creds, [rule.naverTargetId], "today");
  const todaySpend = stats[0]?.salesAmt ?? 0;
  if (todaySpend < params.dailyBudgetCap) return [];

  return [
    {
      description: `캠페인 오늘 소진액 ${Math.round(todaySpend).toLocaleString("ko-KR")}원 ≥ 일 예산 상한 ${params.dailyBudgetCap.toLocaleString("ko-KR")}원 — 캠페인 일시정지`,
      apply: async () => {
        await setCampaignStatus(creds, rule.naverTargetId, "PAUSED");
      },
    },
  ];
}

async function planForRule(creds: NaverAdCredentials, rule: AdAutomationRule): Promise<RuleAction[]> {
  switch (rule.ruleType) {
    case "BID_CEILING":
      return planBidCeiling(creds, rule);
    case "PAUSE_NO_CONVERSION":
      return planPauseNoConversion(creds, rule);
    case "DAILY_BUDGET_GUARD":
      return planDailyBudgetGuard(creds, rule);
    default:
      return [];
  }
}

export async function runRule(
  account: NaverAdAccount,
  creds: NaverAdCredentials,
  rule: AdAutomationRule,
): Promise<void> {
  const liveAllowed = account.autoExecute && rule.active;

  try {
    const actions = await planForRule(creds, rule);

    if (actions.length === 0) {
      await prisma.adRunLog.create({
        data: {
          accountId: account.id,
          ruleId: rule.id,
          mode: liveAllowed ? "LIVE" : "SIMULATED",
          outcome: "SKIPPED",
          summary: "조건에 해당하는 대상 없음",
        },
      });
      return;
    }

    if (liveAllowed) {
      for (const action of actions) await action.apply();
    }

    await prisma.adRunLog.create({
      data: {
        accountId: account.id,
        ruleId: rule.id,
        mode: liveAllowed ? "LIVE" : "SIMULATED",
        outcome: liveAllowed ? "APPLIED" : "PROPOSED",
        summary: `${actions.length}건 ${liveAllowed ? "적용" : "제안"}`,
        detailJson: { actions: actions.map((a) => a.description) },
      },
    });
  } catch (err) {
    await prisma.adRunLog.create({
      data: {
        accountId: account.id,
        ruleId: rule.id,
        mode: liveAllowed ? "LIVE" : "SIMULATED",
        outcome: "ERROR",
        summary: err instanceof Error ? err.message : "알 수 없는 오류",
      },
    });
  }
}
