import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitState } from "@/lib/rateLimit";

type MockUser = { id: string } | null;

let mockUser: MockUser = null;
// `analysisRow` simulates what `.eq("id", id).eq("user_id", user.id)` would
// return under real RLS: null when the row doesn't exist OR belongs to a
// different user — from the caller's point of view those two cases are
// indistinguishable, which is the point (no user-existence oracle).
let analysisRow: { id: string; status: string; updated_at: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: analysisRow, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  _resetRateLimitState();
  mockUser = null;
  analysisRow = null;
});

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("POST /api/video-analysis/[id]/analyze", () => {
  it("rejects a non-UUID id with 400 before ever checking auth", async () => {
    const { POST } = await import("@/app/api/video-analysis/[id]/analyze/route");
    const response = await POST(new Request("http://localhost/api/x"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("returns a JSON 401 when unauthenticated", async () => {
    mockUser = null;
    const { POST } = await import("@/app/api/video-analysis/[id]/analyze/route");
    const response = await POST(new Request("http://localhost/api/x"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 404 (not another user's data) when the id belongs to someone else or doesn't exist", async () => {
    mockUser = { id: "user-a" };
    analysisRow = null; // RLS-equivalent: row not visible to this user
    const { POST } = await import("@/app/api/video-analysis/[id]/analyze/route");
    const response = await POST(new Request("http://localhost/api/x"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("stops accepting requests from the same user past the rate limit", async () => {
    mockUser = { id: "user-b" };
    analysisRow = null;
    const { POST } = await import("@/app/api/video-analysis/[id]/analyze/route");

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const response = await POST(new Request("http://localhost/api/x"), {
        params: Promise.resolve({ id: VALID_UUID }),
      });
      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });
});
