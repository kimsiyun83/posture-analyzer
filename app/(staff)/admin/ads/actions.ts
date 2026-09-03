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
import { NaverAdApiError } from "@/lib/services/naverAds/client";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  return session;
}

export interface ActionState {
  error?: string;
}

// Thrown errors from a Server Action are redacted to a generic message in
// production (see Next.js error-handling docs) — useless for a form where
// the user needs to know *what* was wrong (bad CUSTOMER_ID, Naver API auth
// failure, etc). So this returns { error } instead of throwing, paired with
// useActionState on the client (see ConnectAccountForm.tsx).
export async function connectAccountAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const customerId = String(formData.get("naverCustomerId") ?? "").trim();
  const apiKey = String(formData.get("naverApiKey") ?? "").trim();
  const secretKey = String(formData.get("naverSecretKey") ?? "").trim();

  if (!label || !customerId || !apiKey || !secretKey) {
    return { error: "계정 이름, CUSTOMER_ID, API_KEY, SECRET_KEY를 모두 입력해주세요." };
  }
  if (!/^\d{6,8}$/.test(customerId)) {
    return {
      error: `CUSTOMER_ID는 6~8자리 숫자여야 합니다 (예: 1749296). 입력하신 값 "${customerId}"은(는) 로그인 이메일 등 다른 값이 잘못 들어간 것 같습니다.`,
    };
  }

  const account = await connectAccount({ label, customerId, apiKey, secretKey, createdById: session.sub });
  await writeAuditLog({ userId: session.sub, action: "naverAds.account.connect", entityType: "NaverAdAccount", entityId: account.id });
  revalidatePath("/admin/ads");
  return {};
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

export async function analyzeKeywordsAction(
  accountId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const raw = String(formData.get("seedKeywords") ?? "").trim();
  const seedKeywords = raw
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5); // Naver API limits hintKeywords to 5 per call

  if (seedKeywords.length === 0) return { error: "분석할 키워드를 1개 이상 입력해주세요." };

  try {
    await analyzeKeywords(accountId, seedKeywords);
  } catch (err) {
    if (err instanceof NaverAdApiError) {
      if (err.status === 401 || err.status === 403) {
        return {
          error:
            "네이버 API 인증에 실패했습니다 (401/403). CUSTOMER_ID·API_KEY·SECRET_KEY가 올바른지, 특히 CUSTOMER_ID가 이메일이 아닌 숫자인지 확인해주세요.",
        };
      }
      return { error: `네이버 API 오류 (${err.status}): ${JSON.stringify(err.body)}` };
    }
    return { error: `키워드 분석 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/admin/ads");
  return {};
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
