import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitState } from "@/lib/rateLimit";

// A minimal fake that satisfies every `.from(table).select(...).eq(...)` /
// `.in(...)` chain the route uses, always resolving to an empty result set.
// That's enough to let the handler run to completion without ever needing
// to exercise the actual notification-sending logic — this file is only
// about the auth gate (fail-closed CRON_SECRET), not the notification
// content, which src/app/api/cron/notifications isn't otherwise unit-
// tested for (no DOM/network-free way to do so without a live Supabase
// instance — consistent with this project's existing testing approach).
function makeFakeAdminClient() {
  const chain = {
    eq: async () => ({ data: [], error: null }),
    in: async () => ({ data: [], error: null }),
  };
  return {
    from: () => ({ select: () => chain }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => makeFakeAdminClient(),
}));
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  _resetRateLimitState();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/notifications", { headers });
}

describe("GET /api/cron/notifications — CRON_SECRET fail-closed", () => {
  it("rejects every call when CRON_SECRET is unset, even with a matching-looking header", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(makeRequest({ authorization: "Bearer undefined" }) as never);
    expect(response.status).toBe(401);
  });

  it("rejects a call with no Authorization header when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(makeRequest() as never);
    expect(response.status).toBe(401);
  });

  it("rejects a wrong secret when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(makeRequest({ authorization: "Bearer wrong-secret" }) as never);
    expect(response.status).toBe(401);
  });

  it("accepts a matching secret when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(
      makeRequest({ authorization: "Bearer correct-secret" }) as never,
    );
    expect(response.status).toBe(200);
  });

  // Regression: the auth check now uses a constant-time comparison
  // (crypto.timingSafeEqual), which requires equal-length buffers and
  // returns false — not throws — for a length mismatch. A same-length
  // wrong guess exercises the actual byte-compare path; a
  // shorter/longer guess exercises the length-mismatch short-circuit.
  // Both must still resolve to a clean 401, not a 500 from an uncaught
  // RangeError.
  it("rejects a same-length wrong secret without throwing", async () => {
    process.env.CRON_SECRET = "correct-secret"; // 14 chars
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(
      makeRequest({ authorization: "Bearer wrong-secret12" }) as never, // also 14 chars
    );
    expect(response.status).toBe(401);
  });

  it("rejects a shorter guess without throwing a length-mismatch error", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(makeRequest({ authorization: "Bearer x" }) as never);
    expect(response.status).toBe(401);
  });
});
