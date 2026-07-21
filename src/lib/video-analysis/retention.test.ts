import { describe, expect, it } from "vitest";
import {
  isEligibleForOriginalVideoPurge,
  selectAnalysesForPurge,
  type PurgeCandidateInput,
} from "@/lib/video-analysis/retention";

const NOW = new Date("2026-07-21T12:00:00.000Z").getTime();
const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function candidate(overrides: Partial<PurgeCandidateInput> = {}): PurgeCandidateInput {
  return {
    id: "analysis-1",
    status: "completed",
    createdAt: new Date(NOW - RETENTION_DAYS * DAY_MS - 1000).toISOString(),
    originalVideoDeletedAt: null,
    ...overrides,
  };
}

describe("isEligibleForOriginalVideoPurge", () => {
  it("is eligible once a completed analysis is older than the retention window", () => {
    expect(isEligibleForOriginalVideoPurge(candidate(), RETENTION_DAYS, NOW)).toBe(true);
  });

  it("is not eligible before the retention window has elapsed", () => {
    const c = candidate({ createdAt: new Date(NOW - DAY_MS).toISOString() });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(false);
  });

  it("is exactly at the boundary (>=) treated as eligible", () => {
    const c = candidate({ createdAt: new Date(NOW - RETENTION_DAYS * DAY_MS).toISOString() });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(true);
  });

  it("is never eligible when retentionDays is null (keep indefinitely)", () => {
    expect(isEligibleForOriginalVideoPurge(candidate(), null, NOW)).toBe(false);
  });

  it("is never eligible once original_video_deleted_at is already set", () => {
    const c = candidate({ originalVideoDeletedAt: new Date(NOW - DAY_MS).toISOString() });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(false);
  });

  it("is never eligible for an in-flight 'uploaded' analysis", () => {
    const c = candidate({ status: "uploaded" });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(false);
  });

  it("is never eligible for an in-flight 'analyzing' analysis", () => {
    const c = candidate({ status: "analyzing" });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(false);
  });

  it("is never eligible for 'failed' — the retry path still needs the file", () => {
    const c = candidate({ status: "failed" });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(false);
  });

  it("is eligible for 'completed_insufficient_quality' past the window", () => {
    const c = candidate({ status: "completed_insufficient_quality" });
    expect(isEligibleForOriginalVideoPurge(c, RETENTION_DAYS, NOW)).toBe(true);
  });
});

describe("selectAnalysesForPurge", () => {
  it("filters a mixed batch down to only the eligible rows, using each row's own plan", () => {
    const rows = [
      { ...candidate({ id: "free-old" }), planType: "free" as const },
      {
        ...candidate({ id: "free-new", createdAt: new Date(NOW - DAY_MS).toISOString() }),
        planType: "free" as const,
      },
      { ...candidate({ id: "admin-old" }), planType: "admin" as const },
      { ...candidate({ id: "pro-old" }), planType: "pro" as const },
    ];

    const result = selectAnalysesForPurge(
      rows,
      { free: 30, pro: 90, admin: null },
      NOW,
    );

    expect(result.map((r) => r.id)).toEqual(["free-old"]);
  });

  it("treats a plan missing from the map as 'keep indefinitely', not as unlimited-zero", () => {
    const rows = [{ ...candidate({ id: "unknown-plan" }), planType: "pro" as const }];
    const result = selectAnalysesForPurge(rows, {}, NOW);
    expect(result).toHaveLength(0);
  });
});
