import { describe, expect, it } from "vitest";
import { isSafeRedirectPath, sanitizeRedirectPath } from "@/lib/safeRedirect";

describe("isSafeRedirectPath", () => {
  it("accepts a plain relative path", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
  });

  it("accepts a relative path with a query string", () => {
    expect(isSafeRedirectPath("/schedule/new?from=home")).toBe(true);
  });

  it("rejects null/undefined/empty", () => {
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath(undefined)).toBe(false);
    expect(isSafeRedirectPath("")).toBe(false);
  });

  it("rejects an absolute external URL", () => {
    expect(isSafeRedirectPath("https://evil.example/phish")).toBe(false);
    expect(isSafeRedirectPath("http://evil.example")).toBe(false);
  });

  it("rejects a protocol-relative URL (//host)", () => {
    expect(isSafeRedirectPath("//evil.example")).toBe(false);
  });

  it("rejects a backslash-prefixed path some browsers treat as protocol-relative", () => {
    expect(isSafeRedirectPath("/\\evil.example")).toBe(false);
  });

  it("rejects a path with no leading slash", () => {
    expect(isSafeRedirectPath("dashboard")).toBe(false);
  });

  // Regression: `new URL(next, base)` strips ASCII control characters
  // (tabs, newlines, ...) before parsing, so "/\t/evil.example" used to pass
  // this function's checks (it starts with a single "/") but was then
  // resolved by `new URL()` as "//evil.example" — a protocol-relative open
  // redirect reachable via a delimiter the plain prefix checks didn't see.
  it("rejects a tab-prefixed path that new URL() would strip into a protocol-relative URL", () => {
    expect(isSafeRedirectPath("/\t/evil.example")).toBe(false);
    expect(
      new URL(`/\t/evil.example`, "http://localhost/auth/callback").host,
    ).toBe("evil.example");
  });

  it("rejects a newline-prefixed path with the same protocol-relative stripping behavior", () => {
    expect(isSafeRedirectPath("/\n/evil.example")).toBe(false);
    expect(
      new URL(`/\n/evil.example`, "http://localhost/auth/callback").host,
    ).toBe("evil.example");
  });

  it("rejects other control characters embedded in the path", () => {
    expect(isSafeRedirectPath("/dash\x00board")).toBe(false);
    expect(isSafeRedirectPath("/dash\rboard")).toBe(false);
  });
});

describe("sanitizeRedirectPath", () => {
  it("returns the path unchanged when safe", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
  });

  it("falls back to / when unsafe", () => {
    expect(sanitizeRedirectPath("https://evil.example")).toBe("/");
  });

  it("falls back to a custom default when given", () => {
    expect(sanitizeRedirectPath("//evil.example", "/login")).toBe("/login");
  });
});
