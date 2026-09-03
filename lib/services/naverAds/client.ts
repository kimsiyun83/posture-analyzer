import { createHmac } from "node:crypto";

// Thin client for the 네이버 검색광고 (Naver SearchAd) Open API.
// Docs: https://naver.github.io/searchad-apidoc/ (source: https://github.com/naver/searchad-apidoc)
// Every request is signed per-request with HMAC-SHA256 over `${timestamp}.${method}.${uri}`,
// base64-encoded, using the advertiser's SECRET_KEY. `uri` is the path only (no host, no
// query string) per the official spec.

const BASE_URL = "https://api.searchad.naver.com";

export interface NaverAdCredentials {
  customerId: string; // X-Customer
  apiKey: string; // X-API-KEY (access license)
  secretKey: string; // used to sign, never sent directly
}

class NaverAdApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Naver SearchAd API error (${status}): ${JSON.stringify(body)}`);
    this.name = "NaverAdApiError";
  }
}

function sign(timestamp: string, method: string, uriPath: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(`${timestamp}.${method}.${uriPath}`).digest("base64");
}

async function request<T>(
  creds: NaverAdCredentials,
  method: "GET" | "POST" | "PUT" | "DELETE",
  uriPath: string,
  options: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const timestamp = Date.now().toString();
  const signature = sign(timestamp, method, uriPath, creds.secretKey);

  const url = new URL(BASE_URL + uriPath);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": timestamp,
      "X-API-KEY": creds.apiKey,
      "X-Customer": creds.customerId,
      "X-Signature": signature,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) throw new NaverAdApiError(res.status, parsed);
  return parsed as T;
}

// ---------- 키워드 도구 (파워링크 연관키워드 분석) ----------

export interface RelatedKeywordStat {
  relKeyword: string;
  monthlyPcQcCnt: number | string; // API returns "< 10" for very low volume instead of a number
  monthlyMobileQcCnt: number | string;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  plAvgDepth: number; // 평균 파워링크 노출 광고 수 — 경쟁 강도 참고 지표
  compIdx: string; // "낮음" | "중간" | "높음"
}

export async function getRelatedKeywords(
  creds: NaverAdCredentials,
  hintKeywords: string[],
): Promise<RelatedKeywordStat[]> {
  const res = await request<{ keywordList: RelatedKeywordStat[] }>(creds, "GET", "/keywordstool", {
    query: { hintKeywords: hintKeywords.join(","), showDetail: 1 },
  });
  return res.keywordList ?? [];
}

// ---------- 캠페인 / 광고그룹 / 키워드 ----------

export interface NaverCampaign {
  nccCampaignId: string;
  name: string;
  campaignTp: string;
  dailyBudget: number;
  useDailyBudget: boolean;
  status: string; // "ELIGIBLE" | "PAUSED" | ...
}

export interface NaverAdGroup {
  nccAdgroupId: string;
  nccCampaignId: string;
  name: string;
  status: string;
}

export interface NaverKeyword {
  nccKeywordId: string;
  nccAdgroupId: string;
  keyword: string;
  bidAmt: number;
  useGroupBidAmt: boolean;
  userLock: boolean; // true = 광고주가 직접 노출 중지시킨 상태 (pause)
  status: string;
}

export function listCampaigns(creds: NaverAdCredentials): Promise<NaverCampaign[]> {
  return request<NaverCampaign[]>(creds, "GET", "/ncc/campaigns");
}

export function listAdGroups(creds: NaverAdCredentials, nccCampaignId: string): Promise<NaverAdGroup[]> {
  return request<NaverAdGroup[]>(creds, "GET", "/ncc/adgroups", { query: { nccCampaignId } });
}

export function listKeywords(creds: NaverAdCredentials, nccAdgroupId: string): Promise<NaverKeyword[]> {
  return request<NaverKeyword[]>(creds, "GET", "/ncc/keywords", { query: { nccAdgroupId } });
}

export function updateCampaignDailyBudget(
  creds: NaverAdCredentials,
  nccCampaignId: string,
  dailyBudget: number,
): Promise<NaverCampaign> {
  return request<NaverCampaign>(creds, "PUT", `/ncc/campaigns/${nccCampaignId}`, {
    query: { fields: "dailyBudget" },
    body: { nccCampaignId, dailyBudget },
  });
}

export function setCampaignStatus(
  creds: NaverAdCredentials,
  nccCampaignId: string,
  status: "ELIGIBLE" | "PAUSED",
): Promise<NaverCampaign> {
  return request<NaverCampaign>(creds, "PUT", `/ncc/campaigns/${nccCampaignId}`, {
    query: { fields: "status" },
    body: { nccCampaignId, status },
  });
}

export function updateKeywordBid(
  creds: NaverAdCredentials,
  nccKeywordId: string,
  nccAdgroupId: string,
  bidAmt: number,
): Promise<NaverKeyword> {
  return request<NaverKeyword>(creds, "PUT", `/ncc/keywords/${nccKeywordId}`, {
    query: { fields: "bidAmt" },
    body: { nccKeywordId, nccAdgroupId, bidAmt, useGroupBidAmt: false },
  });
}

export function setKeywordLock(
  creds: NaverAdCredentials,
  nccKeywordId: string,
  nccAdgroupId: string,
  userLock: boolean,
): Promise<NaverKeyword> {
  return request<NaverKeyword>(creds, "PUT", `/ncc/keywords/${nccKeywordId}`, {
    query: { fields: "userLock" },
    body: { nccKeywordId, nccAdgroupId, userLock },
  });
}

// ---------- 통계 (성과 리포트) ----------

export interface AdStatRow {
  id: string; // nccCampaignId / nccAdgroupId / nccKeywordId
  impCnt: number;
  clkCnt: number;
  salesAmt: number; // 광고비 (원)
  ctr: number;
  cpc: number;
  avgRnk: number;
  ccnt: number; // 전환수 (전환 추적 연결 시)
}

export async function getStats(
  creds: NaverAdCredentials,
  ids: string[],
  datePreset: "today" | "yesterday" | "last7days" | "last30days" = "yesterday",
): Promise<AdStatRow[]> {
  const res = await request<{ data: AdStatRow[] }>(creds, "GET", "/stats", {
    query: {
      ids: JSON.stringify(ids),
      fields: JSON.stringify(["impCnt", "clkCnt", "salesAmt", "ctr", "cpc", "avgRnk", "ccnt"]),
      datePreset,
    },
  });
  return res.data ?? [];
}

export { NaverAdApiError };
