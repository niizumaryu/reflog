import { describe, expect, it } from "vitest";
import { findOrphanStoragePaths } from "@/lib/video-analysis/orphanUploads";

const NOW = new Date("2026-07-21T12:00:00.000Z").getTime();
const HOUR_MS = 60 * 60 * 1000;

describe("findOrphanStoragePaths", () => {
  it("flags an old object with no matching video_analyses row", () => {
    const objects = [
      { path: "user1/analysis1/original.mp4", updatedAt: new Date(NOW - 48 * HOUR_MS).toISOString() },
    ];
    expect(findOrphanStoragePaths(objects, new Set(), NOW)).toEqual([
      "user1/analysis1/original.mp4",
    ]);
  });

  it("does not flag an object that has a matching row", () => {
    const objects = [
      { path: "user1/analysis1/original.mp4", updatedAt: new Date(NOW - 48 * HOUR_MS).toISOString() },
    ];
    const known = new Set(["user1/analysis1/original.mp4"]);
    expect(findOrphanStoragePaths(objects, known, NOW)).toEqual([]);
  });

  it("does not flag a recently-uploaded object still inside the grace period", () => {
    const objects = [
      { path: "user1/analysis2/original.mp4", updatedAt: new Date(NOW - 5 * 60 * 1000).toISOString() },
    ];
    expect(findOrphanStoragePaths(objects, new Set(), NOW)).toEqual([]);
  });

  it("respects a custom minAgeMs", () => {
    const objects = [
      { path: "user1/analysis3/original.mp4", updatedAt: new Date(NOW - 2 * HOUR_MS).toISOString() },
    ];
    expect(findOrphanStoragePaths(objects, new Set(), NOW, HOUR_MS)).toEqual([
      "user1/analysis3/original.mp4",
    ]);
    expect(findOrphanStoragePaths(objects, new Set(), NOW, 3 * HOUR_MS)).toEqual([]);
  });

  it("handles a mixed batch, only returning the actual orphans", () => {
    const objects = [
      { path: "a/1/original.mp4", updatedAt: new Date(NOW - 48 * HOUR_MS).toISOString() }, // orphan
      { path: "a/2/original.mp4", updatedAt: new Date(NOW - 48 * HOUR_MS).toISOString() }, // known
      { path: "a/3/original.mp4", updatedAt: new Date(NOW - 1 * HOUR_MS).toISOString() }, // too new
    ];
    const known = new Set(["a/2/original.mp4"]);
    expect(findOrphanStoragePaths(objects, known, NOW)).toEqual(["a/1/original.mp4"]);
  });
});
