import { prisma } from "@/lib/db";
import type { NaverAdAccount, AdAutomationRule } from "@/lib/generated/prisma/client";
import type { NaverAdCredentials, NaverCampaign } from "./client";
import { getStats, listAdGroups, listCampaigns, listKeywords, setCampaignStatus, setKeywordLock, updateKeywordBid } from "./client";

// Only "WEB_SITE" (파워링크) campaigns have been verified against the real API — the
// campaign status endpoint (DAILY_BUDGET_GUARD's pause) failed with a 400 "유효하지
// 않은 ID 형식입니다" when tried against a PLACE campaign in production. Rather than let
// that surface as a cryptic API error, check the campaign type up front and skip with a
// clear reason instead.
//
// This resolves the type via listCampaigns()/listAdGroups() — the only two endpoints
// confirmed working end-to-end in production (they back the account-connect flow and the
// rule-target dropdown). An earlier version of this check called single-resource GET
// endpoints (/ncc/campaigns/{id}, /ncc/adgroups/{id}) that turned out not to exist on this
// API and broke the *legitimate* PowerLink path too — don't reintroduce those without
// verifying them against a real account first.
const SUPPORTED_CAMPAIGN_TYPE = "WEB_SITE";

function assertSupportedCampaign(campaignTp: string): void {
  if (campaignTp !== SUPPORTED_CAMPAIGN_TYPE) {
    throw new Error(
      `이 자동화 규칙은 파워링크(WEB_SITE) 캠페인만 지원합니다. 대상의 캠페인 유형은 "${campaignTp}"입니다 — 플레이스/쇼핑검색/파워컨텐츠 등은 아직 지원하지 않습니다.`,
    );
  }
}

async function resolveCampaignForId(creds: NaverAdCredentials, nccCampaignId: string): Promise<NaverCampaign> {
  const campaigns = await listCampaigns(creds);
  const campaign = campaigns.find((c) => c.nccCampaignId === nccCampaignId);
  if (!campaign) throw new Error(`캠페인을 찾을 수 없습니다 (ID: ${nccCampaignId}). 삭제되었거나 접근 권한이 없을 수 있습니다.`);
  return campaign;
}

async function resolveCampaignForAdGroupId(creds: NaverAdCredentials, nccAdgroupId: string): Promise<NaverCampaign> {
  const campaigns = await listCampaigns(creds);
  for (const campaign of campaigns) {
    const adGroups = await listAdGroups(creds, campaign.nccCampaignId);
    if (adGroups.some((g) => g.nccAdgroupId === nccAdgroupId)) return campaign;
  }
  throw new Error(`광고그룹을 찾을 수 없습니다 (ID: ${nccAdgroupId}). 삭제되었거나 접근 권한이 없을 수 있습니다.`);
}

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
  const campaign = await resolveCampaignForAdGroupId(creds, rule.naverTargetId);
  assertSupportedCampaign(campaign.campaignTp);

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
  const campaign = await resolveCampaignForAdGroupId(creds, rule.naverTargetId);
  assertSupportedCampaign(campaign.campaignTp);

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
  const campaign = await resolveCampaignForId(creds, rule.naverTargetId);
  assertSupportedCampaign(campaign.campaignTp);

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
