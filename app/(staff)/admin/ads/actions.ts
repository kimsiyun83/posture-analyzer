"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  analyzeKeywords,
  connectAccount,
  createRule,
  deleteAccount,
  deleteRule,
  runAutomationForAllAccounts,
  setAccountActive,
  setAccountAutoExecute,
  setRuleActive,
} from "@/lib/services/naverAds";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  return session;
}

export async function connectAccountAction(formData: FormData) {
  const session = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();

  if (!label || !customerId || !apiKey || !secretKey) {
    throw new Error("계정 이름, CUSTOMER_ID, API_KEY, SECRET_KEY를 모두 입력해주세요.");
  }

  const account = await connectAccount({ label, customerId, apiKey, secretKey, createdById: session.sub });
  await writeAuditLog({ userId: session.sub, action: "naverAds.account.connect", entityType: "NaverAdAccount", entityId: account.id });
  revalidatePath("/admin/ads");
}

export async function setAccountActiveAction(accountId: string, active: boolean) {
  const session = await requireAdmin();
  await setAccountActive(accountId, active);
  await writeAuditLog({ userId: session.sub, action: active ? "naverAds.account.activate" : "naverAds.account.deactivate", entityType: "NaverAdAccount", entityId: accountId });
  revalidatePath("/admin/ads");
}

// This is the switch that lets automation rules actually spend/save real ad budget —
// keep the audit trail explicit so it's always clear who flipped it and when.
export async function setAccountAutoExecuteAction(accountId: string, autoExecute: boolean) {
  const session = await requireAdmin();
  await setAccountAutoExecute(accountId, autoExecute);
  await writeAuditLog({
    userId: session.sub,
    action: autoExecute ? "naverAds.account.autoExecute.on" : "naverAds.account.autoExecute.off",
    entityType: "NaverAdAccount",
    entityId: accountId,
  });
  revalidatePath("/admin/ads");
}

export async function deleteAccountAction(accountId: string) {
  const session = await requireAdmin();
  await deleteAccount(accountId);
  await writeAuditLog({ userId: session.sub, action: "naverAds.account.delete", entityType: "NaverAdAccount", entityId: accountId });
  revalidatePath("/admin/ads");
}

export async function analyzeKeywordsAction(accountId: string, formData: FormData) {
  await requireAdmin();

  const raw = String(formData.get("seedKeywords") ?? "").trim();
  const seedKeywords = raw
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5); // Naver API limits hintKeywords to 5 per call

  if (seedKeywords.length === 0) throw new Error("분석할 키워드를 1개 이상 입력해주세요.");

  await analyzeKeywords(accountId, seedKeywords);
  revalidatePath("/admin/ads");
}

export async function createRuleAction(accountId: string, formData: FormData) {
  const session = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const ruleType = String(formData.get("ruleType") ?? "");
  const targetLevel = String(formData.get("targetLevel") ?? "");
  const naverTargetId = String(formData.get("naverTargetId") ?? "").trim();

  if (!name || !ruleType || !targetLevel || !naverTargetId) {
    throw new Error("규칙 이름, 유형, 대상 레벨, 네이버 캠페인/그룹 ID를 모두 입력해주세요.");
  }

  const num = (field: string) => {
    const v = Number(formData.get(field));
    return Number.isFinite(v) ? v : undefined;
  };

  const params: Record<string, string | number | boolean> = {};
  if (ruleType === "BID_CEILING") {
    params.maxCpc = num("maxCpc") ?? 0;
    params.stepPercent = num("stepPercent") ?? 10;
    params.minBid = num("minBid") ?? 70;
  } else if (ruleType === "PAUSE_NO_CONVERSION") {
    params.lookbackDays = num("lookbackDays") === 30 ? 30 : 7;
    params.costThreshold = num("costThreshold") ?? 0;
  } else if (ruleType === "DAILY_BUDGET_GUARD") {
    params.dailyBudgetCap = num("dailyBudgetCap") ?? 0;
  }

  const rule = await createRule({ accountId, name, ruleType, targetLevel, naverTargetId, params });
  await writeAuditLog({ userId: session.sub, action: "naverAds.rule.create", entityType: "AdAutomationRule", entityId: rule.id, detail: params });
  revalidatePath("/admin/ads");
}

export async function setRuleActiveAction(ruleId: string, active: boolean) {
  const session = await requireAdmin();
  await setRuleActive(ruleId, active);
  await writeAuditLog({ userId: session.sub, action: active ? "naverAds.rule.activate" : "naverAds.rule.deactivate", entityType: "AdAutomationRule", entityId: ruleId });
  revalidatePath("/admin/ads");
}

export async function deleteRuleAction(ruleId: string) {
  const session = await requireAdmin();
  await deleteRule(ruleId);
  await writeAuditLog({ userId: session.sub, action: "naverAds.rule.delete", entityType: "AdAutomationRule", entityId: ruleId });
  revalidatePath("/admin/ads");
}

export async function runNowAction() {
  const session = await requireAdmin();
  const result = await runAutomationForAllAccounts();
  await writeAuditLog({ userId: session.sub, action: "naverAds.run.manual", detail: result });
  revalidatePath("/admin/ads");
}
