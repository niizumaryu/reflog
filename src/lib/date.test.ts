import { describe, expect, it } from "vitest";
import { jstDateString } from "@/lib/date";

describe("jstDateString", () => {
  it("returns the JST calendar date for a UTC instant that is already the next JST day", () => {
    // 2026-07-18T15:30:00Z is 2026-07-19T00:30:00+09:00 — past JST midnight.
    expect(jstDateString(new Date("2026-07-18T15:30:00Z"))).toBe("2026-07-19");
  });

  it("regression: naive toISOString().slice(0, 10) would get this wrong", () => {
    const date = new Date("2026-07-18T15:30:00Z");
    expect(date.toISOString().slice(0, 10)).toBe("2026-07-18");
    expect(jstDateString(date)).toBe("2026-07-19");
  });

  it("returns the same JST date for an instant well within JST daytime", () => {
    // 2026-07-18T05:00:00Z is 2026-07-18T14:00:00+09:00.
    expect(jstDateString(new Date("2026-07-18T05:00:00Z"))).toBe("2026-07-18");
  });

  it("stays on the earlier JST date just before JST midnight", () => {
    // 2026-07-18T14:59:00Z is 2026-07-18T23:59:00+09:00.
    expect(jstDateString(new Date("2026-07-18T14:59:00Z"))).toBe("2026-07-18");
  });
});
