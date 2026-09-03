import { NextRequest } from "next/server";
import { runAutomationForAllAccounts } from "@/lib/services/naverAds";

// Triggered by an external scheduler (cron/systemd timer/GitHub Actions schedule — this
// app has no built-in cron). See README for a crontab example. Every rule run still
// respects the account.autoExecute + rule.active double gate (see lib/services/naverAds/rules.ts),
// so hitting this endpoint is safe even before any account has live automation turned on —
// it will just record SIMULATED proposals.
export async function POST(request: NextRequest) {
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
