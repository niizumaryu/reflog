import { describe, expect, it } from "vitest";
import { isSessionExpiredError } from "@/lib/sessionError";

describe("isSessionExpiredError", () => {
  it("recognizes the exact session-expired message every write helper throws", () => {
    expect(isSessionExpiredError("ログインが必要です")).toBe(true);
  });

  it("does not match a similar-looking but different message", () => {
    expect(isSessionExpiredError("ログインしてください")).toBe(false);
    expect(isSessionExpiredError("ログインが必要です。")).toBe(false); // trailing punctuation
  });

  it("does not match an unrelated error message (e.g. a network/DB failure)", () => {
    expect(isSessionExpiredError("データの読み込みに失敗しました")).toBe(false);
    expect(isSessionExpiredError("Network request failed")).toBe(false);
  });

  it("returns false for null/undefined/empty input", () => {
    expect(isSessionExpiredError(null)).toBe(false);
    expect(isSessionExpiredError(undefined)).toBe(false);
    expect(isSessionExpiredError("")).toBe(false);
  });
});
