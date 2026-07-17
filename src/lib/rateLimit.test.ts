import { beforeEach, describe, expect, it } from "vitest";
import { _resetRateLimitState, checkRateLimit, clientIdentifier } from "@/lib/rateLimit";

beforeEach(() => {
  _resetRateLimitState();
});

describe("checkRateLimit", () => {
  it("allows the first call for a fresh key", () => {
    const result = checkRateLimit("user-1", 3, 60_000, 0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows exactly `limit` calls within the window, then rejects", () => {
    checkRateLimit("user-1", 3, 60_000, 0);
    checkRateLimit("user-1", 3, 60_000, 10);
    const third = checkRateLimit("user-1", 3, 60_000, 20);
    const fourth = checkRateLimit("user-1", 3, 60_000, 30);

    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("resets once the window has elapsed", () => {
    checkRateLimit("user-1", 1, 1000, 0);
    const withinWindow = checkRateLimit("user-1", 1, 1000, 500);
    const afterWindow = checkRateLimit("user-1", 1, 1000, 1500);

    expect(withinWindow.allowed).toBe(false);
    expect(afterWindow.allowed).toBe(true);
  });

  it("tracks independent keys independently", () => {
    checkRateLimit("user-1", 1, 60_000, 0);
    const otherUser = checkRateLimit("user-2", 1, 60_000, 0);
    expect(otherUser.allowed).toBe(true);
  });
});

describe("clientIdentifier", () => {
  it("uses the first entry of X-Forwarded-For when present", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIdentifier(request)).toBe("203.0.113.5");
  });

  it("falls back to X-Real-IP", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "203.0.113.9" },
    });
    expect(clientIdentifier(request)).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const request = new Request("http://localhost/api/test");
    expect(clientIdentifier(request)).toBe("unknown");
  });
});
