import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitState } from "@/lib/rateLimit";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

beforeEach(() => {
  _resetRateLimitState();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";
});

describe("POST /api/notifications/test", () => {
  it("returns a JSON 401 (not an HTML redirect) when unauthenticated", async () => {
    const { POST } = await import("@/app/api/notifications/test/route");
    const response = await POST();

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
