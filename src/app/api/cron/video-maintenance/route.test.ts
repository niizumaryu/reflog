import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitState } from "@/lib/rateLimit";

// A minimal fake satisfying every `.from(table).select(...).is(...).in(...).limit(...)`
// chain the maintenance route's dependency builders use, always resolving
// to empty result sets, plus a Storage fake with no objects. That's enough
// to exercise the auth gate and the dryRun/action wiring without touching a
// live Supabase instance — same approach as
// src/app/api/cron/notifications/route.test.ts.
type FakeQueryResult = { data: unknown[]; error: null };
type FakeChain = {
  is: () => FakeChain;
  in: () => FakeChain;
  eq: () => FakeChain;
  limit: () => FakeChain;
  then: <TResult1 = FakeQueryResult, TResult2 = never>(
    onfulfilled?: ((value: FakeQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

function makeChain(result: FakeQueryResult): FakeChain {
  const chain: FakeChain = {
    is: () => chain,
    in: () => chain,
    eq: () => chain,
    limit: () => chain,
    then: (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return chain;
}

function makeFakeAdminClient() {
  return {
    from: () => ({ select: () => makeChain({ data: [], error: null }) }),
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => makeFakeAdminClient(),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  _resetRateLimitState();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeRequest(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/cron/video-maintenance${path}`, { headers });
}

describe("GET /api/cron/video-maintenance — CRON_SECRET fail-closed", () => {
  it("rejects every call when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/video-maintenance/route");

    const response = await GET(makeRequest("") as never);
    expect(response.status).toBe(401);
  });

  it("rejects a wrong secret when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/video-maintenance/route");

    const response = await GET(makeRequest("", { authorization: "Bearer wrong" }) as never);
    expect(response.status).toBe(401);
  });
});

describe("GET /api/cron/video-maintenance — dryRun/action wiring", () => {
  it("defaults to dryRun=true when no query param is given", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/video-maintenance/route");

    const response = await GET(
      makeRequest("", { authorization: "Bearer correct-secret" }) as never,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.purge.dryRun).toBe(true);
    expect(body.orphans.dryRun).toBe(true);
  });

  it("only runs the requested action", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/video-maintenance/route");

    const response = await GET(
      makeRequest("?action=purge", { authorization: "Bearer correct-secret" }) as never,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.purge).toBeDefined();
    expect(body.orphans).toBeUndefined();
  });

  it("passes dryRun=false through only when explicitly requested", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/video-maintenance/route");

    const response = await GET(
      makeRequest("?dryRun=false", { authorization: "Bearer correct-secret" }) as never,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(false);
  });
});
