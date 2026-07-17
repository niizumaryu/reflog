import { beforeEach, describe, expect, it, vi } from "vitest";
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
