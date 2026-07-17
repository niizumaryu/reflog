import { describe, expect, it } from "vitest";
import { resolveOrphanCleanupTargets, validateVideoDuration, validateVideoFile } from "@/lib/video-analysis/upload";
import {
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  MIN_VIDEO_DURATION_SECONDS,
} from "@/lib/video-analysis/constants";

function makeFile(sizeBytes: number, type: string, name = "video.mp4"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("validateVideoFile", () => {
  it("accepts an allowed MIME type within the size limit", () => {
    expect(validateVideoFile(makeFile(1024, "video/mp4"))).toBeNull();
  });

  it("rejects a disallowed MIME type", () => {
    expect(validateVideoFile(makeFile(1024, "image/png"))).not.toBeNull();
  });

  it("rejects a file over the size limit", () => {
    const oversized = makeFile(MAX_VIDEO_SIZE_BYTES + 1, "video/mp4");
    expect(validateVideoFile(oversized)).not.toBeNull();
  });

  it("accepts a file exactly at the size limit", () => {
    const atLimit = makeFile(MAX_VIDEO_SIZE_BYTES, "video/mp4");
    expect(validateVideoFile(atLimit)).toBeNull();
  });
});

describe("validateVideoDuration", () => {
  it("accepts null duration (unknown, not rejected here)", () => {
    expect(validateVideoDuration(null)).toBeNull();
  });

  it("accepts a duration within the limit", () => {
    expect(validateVideoDuration(60)).toBeNull();
  });

  it("rejects a duration over the limit", () => {
    expect(validateVideoDuration(MAX_VIDEO_DURATION_SECONDS + 1)).not.toBeNull();
  });

  it("accepts a duration exactly at the max limit", () => {
    expect(validateVideoDuration(MAX_VIDEO_DURATION_SECONDS)).toBeNull();
  });

  it("rejects a duration below the minimum (too short)", () => {
    const error = validateVideoDuration(MIN_VIDEO_DURATION_SECONDS - 0.5);
    expect(error).not.toBeNull();
    expect(error).toContain("短すぎます");
  });

  it("accepts a duration exactly at the minimum", () => {
    expect(validateVideoDuration(MIN_VIDEO_DURATION_SECONDS)).toBeNull();
  });
});

describe("resolveOrphanCleanupTargets", () => {
  it("targets nothing when no storage path was ever uploaded", () => {
    const targets = resolveOrphanCleanupTargets({ storagePath: null, videoAnalysisId: null });
    expect(targets).toEqual({ storagePath: null, videoAnalysisId: null });
  });

  it("targets nothing when no storage path was ever uploaded, even with a stray id", () => {
    const targets = resolveOrphanCleanupTargets({ storagePath: null, videoAnalysisId: "some-id" });
    expect(targets).toEqual({ storagePath: null, videoAnalysisId: null });
  });

  it("targets only the storage file when the DB row was never created", () => {
    const targets = resolveOrphanCleanupTargets({
      storagePath: "user-1/analysis-1/original.mp4",
      videoAnalysisId: null,
    });
    expect(targets).toEqual({
      storagePath: "user-1/analysis-1/original.mp4",
      videoAnalysisId: null,
    });
  });

  it("targets both the storage file and the row when both were created", () => {
    const targets = resolveOrphanCleanupTargets({
      storagePath: "user-1/analysis-1/original.mp4",
      videoAnalysisId: "analysis-1",
    });
    expect(targets).toEqual({
      storagePath: "user-1/analysis-1/original.mp4",
      videoAnalysisId: "analysis-1",
    });
  });
});
