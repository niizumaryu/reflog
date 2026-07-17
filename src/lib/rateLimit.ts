// A minimal fixed-window rate limiter for Route Handlers.
//
// KNOWN LIMITATION (read before relying on this for anything strict): the
// counters live in a plain in-memory Map, scoped to a single serverless
// function instance. On Vercel (and most serverless hosts) concurrent
// requests can land on different warm instances, each with its own Map, so
// the *effective* limit under real traffic is "N per instance" rather than
// a hard global "N total" — a determined attacker spreading requests across
// instances can exceed the nominal limit. There is no in-repo, external-
// service-free way to fix that; a shared store (Redis/Upstash, Supabase
// itself, etc.) would be needed for a true cross-instance limit. This is
// still worth having: it caps the damage from a single client hammering a
// single endpoint (accidental retry loops, a simple script), which is the
// realistic threat for a small app with no paid infra. Documented here and
// in docs/security.md so nobody mistakes it for a hard guarantee.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bounds memory usage if a huge number of distinct keys show up (e.g. an
// attacker cycling IPs) — old entries are evicted opportunistically on
// every call rather than via a timer, so there's no background work to
// clean up.
const MAX_TRACKED_KEYS = 5000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Fixed-window limiter: `key` gets at most `limit` allowed calls per
 * `windowMs`. Call once per request with a caller-derived key (e.g. user id
 * or IP); check `.allowed` before doing the expensive/sensitive work.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// Exposed only for tests, to reset shared module state between cases.
export function _resetRateLimitState(): void {
  buckets.clear();
}

/**
 * Best-effort caller identifier for anonymous/pre-auth rate limiting
 * (endpoints that must reject before we know who's calling, like the cron
 * route). Not spoof-proof — a client can set arbitrary X-Forwarded-For
 * values — but combined with an auth check it raises the bar above "no
 * limit at all", which is the realistic goal here (see module doc comment).
 */
export function clientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
