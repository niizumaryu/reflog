import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitState } from "@/lib/rateLimit";

// Unauthenticated requests must never reach the admin (service-role) client
// or Storage cleanup — the route checks auth first and returns before any
// of that runs. admin.ts is mocked purely so importing the route module
// doesn't pull in the real "server-only" package, which throws outside a
// Next.js server-component bundling context (i.e. under plain Vitest/Node).
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("createAdminClient should not be called for an unauthenticated request");
  },
}));

beforeEach(() => {
  _resetRateLimitState();
});

describe("POST /api/account/delete", () => {
  it("returns a JSON 401 (not an HTML redirect) when the session is missing/expired", async () => {
    const { POST } = await import("@/app/api/account/delete/route");
    const response = await POST();

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// The route's own comment states the safety invariant this suite is here to
// guard: "Storage cleanup runs before the auth user (...) are deleted, and
// the whole deletion is aborted if it fails." That invariant had zero test
// coverage — a change that reordered the two steps, or dropped the early
// return on a Storage failure, would silently ship a bug where a failed
// Storage cleanup still deletes the account and permanently orphans the
// user's uploaded videos/images in Storage (nothing left to retry the
// cleanup against once the owning account is gone).
describe("POST /api/account/delete — Storage-cleanup-then-delete-user ordering", () => {
  const AUTHENTICATED_USER = { id: "user-1" };

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/lib/supabase/admin");
  });

  it("aborts before deleteUser when Storage cleanup fails, leaving the account intact", async () => {
    const deleteUser = vi.fn(async () => ({ error: null }));
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: AUTHENTICATED_USER } }) },
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        storage: {
          from: () => ({
            list: async () => ({ data: null, error: { message: "network error" } }),
            remove: async () => ({ error: null }),
          }),
        },
        auth: { admin: { deleteUser } },
      }),
    }));

    const { POST } = await import("@/app/api/account/delete/route");
    const response = await POST();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("削除に失敗したため、アカウント削除を中止しました");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("calls deleteUser only after Storage cleanup succeeds for every bucket", async () => {
    const deleteUser = vi.fn(async () => ({ error: null }));
    const listedBuckets: string[] = [];
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: AUTHENTICATED_USER } }) },
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        storage: {
          from: (bucket: string) => ({
            list: async () => {
              listedBuckets.push(bucket);
              return { data: [], error: null };
            },
            remove: async () => ({ error: null }),
          }),
        },
        auth: { admin: { deleteUser } },
      }),
    }));

    const { POST } = await import("@/app/api/account/delete/route");
    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(listedBuckets).toEqual(["match-videos", "profile-icons"]);
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith(AUTHENTICATED_USER.id);
  });
});
