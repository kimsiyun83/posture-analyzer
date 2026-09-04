import { NextRequest } from "next/server";
import { runAutomationForAllAccounts } from "@/lib/services/naverAds";

// Triggered on a schedule. Vercel Cron (see vercel.json) invokes this with GET and
// automatically sends `Authorization: Bearer $CRON_SECRET` — no extra setup beyond
// the CRON_SECRET env var. POST is also supported for an external scheduler
// (cron-job.org, a GitHub Actions schedule, etc) that can be configured with a custom
// header instead. Every rule run still respects the account.autoExecute + rule.active
// double gate (see lib/services/naverAds/rules.ts), so hitting this endpoint is safe
// even before any account has live automation turned on — it just records SIMULATED
// proposals.
async function handleCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET이 설정되지 않았습니다." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runAutomationForAllAccounts();
  return Response.json({ ok: true, ...result });
}

export const GET = handleCronRequest;
export const POST = handleCronRequest;
