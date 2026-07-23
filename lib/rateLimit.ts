// In-memory sliding-window rate limiter. Zero-cost (no Redis/Upstash signup needed),
// but only effective within a single running process — on serverless platforms with
// multiple concurrent instances (e.g. Vercel under load) each instance tracks its
// own counters, so the effective limit is (perInstanceLimit x liveInstanceCount).
// Good enough as brute-force friction for a single-studio tool; swap for a shared
// store (Redis) if this ever needs to hold under real distributed load.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true };
}
