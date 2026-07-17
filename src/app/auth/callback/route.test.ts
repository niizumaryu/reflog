import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
    },
  }),
}));

describe("GET /auth/callback — open redirect", () => {
  it("redirects to the sanitized same-origin path on success", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc&next=%2Fdashboard",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("falls back to / instead of following an absolute-URL next param (open redirect)", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc&next=https%3A%2F%2Fevil.example%2Fphish",
    );
    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.hostname).toBe("localhost");
    expect(location.pathname).toBe("/");
  });

  it("falls back to / instead of following a protocol-relative next param", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc&next=%2F%2Fevil.example",
    );
    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.hostname).toBe("localhost");
    expect(location.pathname).toBe("/");
  });
});
