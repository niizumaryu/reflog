import { describe, expect, it } from "vitest";
import { isNoRecordReminderDue, noRecordReminderThresholdMs } from "@/lib/notifications/noRecordReminder";

describe("noRecordReminderThresholdMs", () => {
  it("uses the schedule's own start time when set", () => {
    // 2026-07-18 14:00 JST + 6h = 2026-07-18 20:00 JST = 2026-07-18T11:00:00Z.
    expect(noRecordReminderThresholdMs("2026-07-18", "14:00:00")).toBe(
      Date.parse("2026-07-18T11:00:00Z"),
    );
  });

  it("falls back to the default start hour when scheduled_time is null", () => {
    // Default start hour is 12:00 JST + 6h = 18:00 JST = 2026-07-18T09:00:00Z.
    expect(noRecordReminderThresholdMs("2026-07-18", null)).toBe(
      Date.parse("2026-07-18T09:00:00Z"),
    );
  });
});

describe("isNoRecordReminderDue", () => {
  it("is not due before the threshold", () => {
    const before = Date.parse("2026-07-18T10:59:59Z");
    expect(isNoRecordReminderDue("2026-07-18", "14:00:00", before)).toBe(false);
  });

  it("is due exactly at the threshold", () => {
    const at = Date.parse("2026-07-18T11:00:00Z");
    expect(isNoRecordReminderDue("2026-07-18", "14:00:00", at)).toBe(true);
  });

  it("is due after the threshold", () => {
    const after = Date.parse("2026-07-19T00:00:00Z");
    expect(isNoRecordReminderDue("2026-07-18", "14:00:00", after)).toBe(true);
  });
});
