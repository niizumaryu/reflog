import { describe, expect, it, vi } from "vitest";
import {
  runOriginalVideoPurge,
  runOrphanUploadCleanup,
  type OrphanCleanupDeps,
  type PurgeDeps,
  type PurgeRow,
} from "@/lib/video-analysis/videoMaintenance";

const NOW = new Date("2026-07-21T12:00:00.000Z").getTime();
const OLD_DATE = new Date(NOW - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
const RECENT_DATE = new Date(NOW - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

function makeRow(overrides: Partial<PurgeRow> = {}): PurgeRow {
  return {
    id: "analysis-1",
    userId: "user-1",
    status: "completed",
    createdAt: OLD_DATE,
    storagePath: "user-1/analysis-1/original.mp4",
    originalVideoDeletedAt: null,
    ...overrides,
  };
}

function makePurgeDeps(overrides: Partial<PurgeDeps> = {}): PurgeDeps {
  return {
    fetchPurgeCandidateRows: async () => [makeRow()],
    fetchRetentionDaysByPlan: async () => ({ free: 30, pro: 90, admin: null }),
    fetchPlanTypeByUserId: async () => ({ "user-1": "free" }),
    deleteStorageObject: vi.fn(async () => ({ error: null })),
    markOriginalVideoDeleted: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

describe("runOriginalVideoPurge", () => {
  it("in dry-run mode, reports eligible rows but never deletes anything", async () => {
    const deps = makePurgeDeps();
    const summary = await runOriginalVideoPurge(deps, { dryRun: true, now: NOW });

    expect(summary).toEqual({ dryRun: true, checked: 1, eligible: 1, purged: 0, errors: [] });
    expect(deps.deleteStorageObject).not.toHaveBeenCalled();
    expect(deps.markOriginalVideoDeleted).not.toHaveBeenCalled();
  });

  it("in live mode, deletes the Storage object then marks the row purged", async () => {
    const deps = makePurgeDeps();
    const summary = await runOriginalVideoPurge(deps, { dryRun: false, now: NOW });

    expect(summary.purged).toBe(1);
    expect(summary.errors).toEqual([]);
    expect(deps.deleteStorageObject).toHaveBeenCalledWith("user-1/analysis-1/original.mp4");
    expect(deps.markOriginalVideoDeleted).toHaveBeenCalledWith("analysis-1");
  });

  it("does not purge a row still inside its plan's retention window", async () => {
    const deps = makePurgeDeps({
      fetchPurgeCandidateRows: async () => [makeRow({ createdAt: RECENT_DATE })],
    });
    const summary = await runOriginalVideoPurge(deps, { dryRun: false, now: NOW });

    expect(summary.eligible).toBe(0);
    expect(summary.purged).toBe(0);
  });

  it("never purges an admin-plan row (retention_days = null)", async () => {
    const deps = makePurgeDeps({ fetchPlanTypeByUserId: async () => ({ "user-1": "admin" }) });
    const summary = await runOriginalVideoPurge(deps, { dryRun: false, now: NOW });

    expect(summary.eligible).toBe(0);
    expect(summary.purged).toBe(0);
  });

  it("leaves the row unmarked and reports an error when the Storage delete fails, so a retry is possible next run", async () => {
    const deps = makePurgeDeps({
      deleteStorageObject: vi.fn(async () => ({ error: "network error" })),
    });
    const summary = await runOriginalVideoPurge(deps, { dryRun: false, now: NOW });

    expect(summary.purged).toBe(0);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("network error");
    expect(deps.markOriginalVideoDeleted).not.toHaveBeenCalled();
  });

  it("reports an error (without crashing) when the file was deleted but the DB update fails", async () => {
    const deps = makePurgeDeps({
      markOriginalVideoDeleted: vi.fn(async () => ({ error: "db unavailable" })),
    });
    const summary = await runOriginalVideoPurge(deps, { dryRun: false, now: NOW });

    expect(summary.purged).toBe(0);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("db unavailable");
  });

  it("treats an unknown plan_type as 'free' rather than throwing", async () => {
    const deps = makePurgeDeps({ fetchPlanTypeByUserId: async () => ({}) });
    const summary = await runOriginalVideoPurge(deps, { dryRun: false, now: NOW });
    expect(summary.eligible).toBe(1);
  });
});

function makeOrphanDeps(overrides: Partial<OrphanCleanupDeps> = {}): OrphanCleanupDeps {
  return {
    listStorageObjects: async () => [{ path: "user-1/orphan-1/original.mp4", updatedAt: OLD_DATE }],
    listKnownStoragePaths: async () => new Set<string>(),
    deleteStorageObject: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

describe("runOrphanUploadCleanup", () => {
  it("in dry-run mode, reports found orphans but never deletes anything", async () => {
    const deps = makeOrphanDeps();
    const summary = await runOrphanUploadCleanup(deps, { dryRun: true, now: NOW });

    expect(summary).toEqual({ dryRun: true, scanned: 1, found: 1, removed: 0, errors: [] });
    expect(deps.deleteStorageObject).not.toHaveBeenCalled();
  });

  it("in live mode, deletes each found orphan", async () => {
    const deps = makeOrphanDeps();
    const summary = await runOrphanUploadCleanup(deps, { dryRun: false, now: NOW });

    expect(summary.removed).toBe(1);
    expect(deps.deleteStorageObject).toHaveBeenCalledWith("user-1/orphan-1/original.mp4");
  });

  it("does not flag an object that has a matching video_analyses row", async () => {
    const deps = makeOrphanDeps({
      listKnownStoragePaths: async () => new Set(["user-1/orphan-1/original.mp4"]),
    });
    const summary = await runOrphanUploadCleanup(deps, { dryRun: false, now: NOW });

    expect(summary.found).toBe(0);
    expect(summary.removed).toBe(0);
  });

  it("collects a delete error without throwing", async () => {
    const deps = makeOrphanDeps({
      deleteStorageObject: vi.fn(async () => ({ error: "permission denied" })),
    });
    const summary = await runOrphanUploadCleanup(deps, { dryRun: false, now: NOW });

    expect(summary.removed).toBe(0);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("permission denied");
  });
});
