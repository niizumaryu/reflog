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
