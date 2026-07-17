import { describe, expect, it } from "vitest";
import { assertValidStatusTransition, isValidStatusTransition } from "@/lib/video-analysis/statusMachine";

describe("isValidStatusTransition", () => {
  it("allows uploaded -> analyzing", () => {
    expect(isValidStatusTransition("uploaded", "analyzing")).toBe(true);
  });

  it("allows failed -> analyzing (retry)", () => {
    expect(isValidStatusTransition("failed", "analyzing")).toBe(true);
  });

  it("allows analyzing -> completed / completed_insufficient_quality / failed", () => {
    expect(isValidStatusTransition("analyzing", "completed")).toBe(true);
    expect(isValidStatusTransition("analyzing", "completed_insufficient_quality")).toBe(true);
    expect(isValidStatusTransition("analyzing", "failed")).toBe(true);
  });

  it("allows same-status no-ops (progress bumps)", () => {
    expect(isValidStatusTransition("analyzing", "analyzing")).toBe(true);
    expect(isValidStatusTransition("completed", "completed")).toBe(true);
  });

  it("rejects uploaded -> completed (skipping the pipeline)", () => {
    expect(isValidStatusTransition("uploaded", "completed")).toBe(false);
  });

  it("rejects terminal states moving elsewhere", () => {
    expect(isValidStatusTransition("completed", "analyzing")).toBe(false);
    expect(isValidStatusTransition("completed_insufficient_quality", "completed")).toBe(false);
    expect(isValidStatusTransition("failed", "completed")).toBe(false);
  });
});

describe("assertValidStatusTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() => assertValidStatusTransition("uploaded", "analyzing")).not.toThrow();
  });

  it("throws for an illegal transition", () => {
    expect(() => assertValidStatusTransition("completed", "analyzing")).toThrow(
      /Invalid video analysis status transition/,
    );
  });
});
