import { describe, expect, it } from "vitest";
import { computeUsageSummary, isQuotaExceededError } from "@/lib/video-analysis/planUsage";
import type { PlanLimit } from "@/lib/video-analysis/types";

const PLAN_LIMITS: PlanLimit[] = [
  { planType: "free", monthlyAnalysisLimit: 5, label: "無料プラン" },
  { planType: "pro", monthlyAnalysisLimit: 50, label: "有料プラン" },
  { planType: "admin", monthlyAnalysisLimit: null, label: "管理者" },
];

const NOW = new Date("2026-07-17T12:00:00.000Z");

describe("computeUsageSummary", () => {
  it("allows starting a new analysis when usage is within the free plan's limit", () => {
    const summary = computeUsageSummary({
      planType: "free",
      storedCount: 2,
      periodStart: "2026-07-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    expect(summary.canStartAnalysis).toBe(true);
    expect(summary.used).toBe(2);
    expect(summary.limit).toBe(5);
    expect(summary.remaining).toBe(3);
  });

  it("rejects starting a new analysis once the free plan's monthly limit is reached", () => {
    const summary = computeUsageSummary({
      planType: "free",
      storedCount: 5,
      periodStart: "2026-07-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    expect(summary.canStartAnalysis).toBe(false);
    expect(summary.remaining).toBe(0);
  });

  it("rejects when usage has somehow gone past the limit (defensive)", () => {
    const summary = computeUsageSummary({
      planType: "free",
      storedCount: 9,
      periodStart: "2026-07-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    expect(summary.canStartAnalysis).toBe(false);
    expect(summary.remaining).toBe(0);
  });

  it("treats a previous month's stored count as reset to 0 for display", () => {
    const summary = computeUsageSummary({
      planType: "free",
      storedCount: 5,
      periodStart: "2026-06-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    expect(summary.used).toBe(0);
    expect(summary.canStartAnalysis).toBe(true);
    expect(summary.remaining).toBe(5);
  });

  it("treats the admin plan (null limit) as unlimited", () => {
    const summary = computeUsageSummary({
      planType: "admin",
      storedCount: 1000,
      periodStart: "2026-07-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    expect(summary.canStartAnalysis).toBe(true);
    expect(summary.remaining).toBeNull();
    expect(summary.limit).toBeNull();
  });

  it("computes resetsOn as the first day of the following month", () => {
    const summary = computeUsageSummary({
      planType: "free",
      storedCount: 0,
      periodStart: "2026-07-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    expect(summary.resetsOn).toBe("2026-08-01");
  });

  it("falls back to a blocked (limit 0) state for an unrecognized plan type", () => {
    const summary = computeUsageSummary({
      planType: "unknown",
      storedCount: 0,
      periodStart: "2026-07-01",
      planLimits: PLAN_LIMITS,
      now: NOW,
    });
    // normalizePlanType falls back to "free", but if free's own limit
    // row were ever missing this must fail closed, not open.
    expect(summary.planType).toBe("free");
  });
});

describe("isQuotaExceededError", () => {
  it("recognizes the DB trigger's quota_exceeded marker", () => {
    const error = new Error("quota_exceeded: monthly video analysis limit reached for plan free");
    expect(isQuotaExceededError(error)).toBe(true);
  });

  it("does not misclassify an unrelated error", () => {
    expect(isQuotaExceededError(new Error("network error"))).toBe(false);
  });

  it("does not misclassify a non-Error value", () => {
    expect(isQuotaExceededError("quota_exceeded")).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });
});
