import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { decryptSecret, encryptSecret } from "./crypto";
import { getRelatedKeywords, type NaverAdCredentials, type RelatedKeywordStat } from "./client";
import { runRule } from "./rules";

function toCreds(account: { customerId: string; apiKey: string; secretKeyEnc: string }): NaverAdCredentials {
  return { customerId: account.customerId, apiKey: account.apiKey, secretKey: decryptSecret(account.secretKeyEnc) };
}

// ---------- 계정 연결 ----------

export function listAccounts() {
  return prisma.naverAdAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rules: true } } },
  });
}

export async function connectAccount(input: {
  label: string;
  customerId: string;
  apiKey: string;
  secretKey: string;
  createdById?: string;
}) {
  return prisma.naverAdAccount.create({
    data: {
      label: input.label,
      customerId: input.customerId,
      apiKey: input.apiKey,
      secretKeyEnc: encryptSecret(input.secretKey),
      createdById: input.createdById,
    },
  });
}

export function setAccountActive(accountId: string, active: boolean) {
  return prisma.naverAdAccount.update({ where: { id: accountId }, data: { active } });
}

// autoExecute is the account-wide kill switch — turning it on is the only way any rule
// can ever write to the live Naver account, regardless of individual rule.active flags.
export function setAccountAutoExecute(accountId: string, autoExecute: boolean) {
  return prisma.naverAdAccount.update({ where: { id: accountId }, data: { autoExecute } });
}

export function deleteAccount(accountId: string) {
  return prisma.naverAdAccount.delete({ where: { id: accountId } });
}

// ---------- 키워드 분석 (파워링크 연관키워드) ----------

export async function analyzeKeywords(accountId: string, seedKeywords: string[]): Promise<RelatedKeywordStat[]> {
  const account = await prisma.naverAdAccount.findUniqueOrThrow({ where: { id: accountId } });
  const creds = toCreds(account);
  const results = await getRelatedKeywords(creds, seedKeywords);

  await prisma.adKeywordSnapshot.createMany({
    data: results.map((r) => ({
      accountId,
      keyword: r.relKeyword,
      monthlyPcSearches: typeof r.monthlyPcQcCnt === "number" ? r.monthlyPcQcCnt : null,
      monthlyMobileSearches: typeof r.monthlyMobileQcCnt === "number" ? r.monthlyMobileQcCnt : null,
      competitionLevel: r.compIdx,
      avgPcCtr: r.monthlyAvePcCtr,
      avgMobileCtr: r.monthlyAveMobileCtr,
      avgAdDepth: r.plAvgDepth,
    })),
  });

  return results;
}

export function listKeywordSnapshots(accountId: string, limit = 100) {
  return prisma.adKeywordSnapshot.findMany({
    where: { accountId },
    orderBy: { capturedAt: "desc" },
    take: limit,
  });
}

// ---------- 자동화 규칙 ----------

export function listRules(accountId: string) {
  return prisma.adAutomationRule.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } });
}

export function createRule(input: {
  accountId: string;
  name: string;
  ruleType: string;
  targetLevel: string;
  naverTargetId: string;
  params: Record<string, string | number | boolean>;
}) {
  return prisma.adAutomationRule.create({
    data: {
      accountId: input.accountId,
      name: input.name,
      ruleType: input.ruleType,
      targetLevel: input.targetLevel,
      naverTargetId: input.naverTargetId,
      paramsJson: input.params as Prisma.InputJsonValue,
    },
  });
}

// Per-rule switch — a rule only fires live if this AND the account's autoExecute are both on.
export function setRuleActive(ruleId: string, active: boolean) {
  return prisma.adAutomationRule.update({ where: { id: ruleId }, data: { active } });
}

export function deleteRule(ruleId: string) {
  return prisma.adAutomationRule.delete({ where: { id: ruleId } });
}

// ---------- 실행 로그 ----------

export function listRunLogs(accountId: string, limit = 50) {
  return prisma.adRunLog.findMany({
    where: { accountId },
    include: { rule: true },
    orderBy: { runAt: "desc" },
    take: limit,
  });
}

// ---------- 자동화 실행 (cron에서 호출) ----------

export async function runAutomationForAllAccounts(): Promise<{ accountsProcessed: number; rulesRun: number }> {
  const accounts = await prisma.naverAdAccount.findMany({
    where: { active: true },
    include: { rules: true },
  });

  let rulesRun = 0;
  for (const account of accounts) {
    const creds = toCreds(account);
    for (const rule of account.rules) {
      await runRule(account, creds, rule);
      rulesRun += 1;
    }
  }

  return { accountsProcessed: accounts.length, rulesRun };
}
