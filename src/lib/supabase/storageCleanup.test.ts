import { describe, expect, it, vi } from "vitest";
import {
  listAllFilePaths,
  removeAllUnderPrefix,
  type StorageBucketLike,
  type StorageListerLike,
} from "@/lib/supabase/storageCleanup";

function makeBucket(
  filesByFolder: Record<string, { name: string; id: string | null }[]>,
  opts: { listError?: string; removeError?: string; failFolder?: string } = {},
): StorageBucketLike {
  return {
    list: vi.fn(async (path: string) => {
      if (opts.listError && path === opts.failFolder) {
        return { data: null, error: { message: opts.listError } };
      }
      return { data: filesByFolder[path] ?? [], error: null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      if (opts.removeError && paths.some((p) => p.startsWith(opts.failFolder ?? "\0"))) {
        return { error: { message: opts.removeError } };
      }
      return { error: null };
    }),
  };
}

describe("removeAllUnderPrefix", () => {
  it("returns no errors when the folder is empty (user never uploaded anything)", async () => {
    const bucket = makeBucket({ "user-1": [] });
    const errors = await removeAllUnderPrefix(bucket, "user-1");
    expect(errors).toEqual([]);
  });

  it("removes flat files directly under the prefix (profile-icons layout)", async () => {
    const bucket = makeBucket({ "user-1": [{ name: "12345.jpg", id: "file-1" }] });
    const errors = await removeAllUnderPrefix(bucket, "user-1");
    expect(errors).toEqual([]);
    expect(bucket.remove).toHaveBeenCalledWith(["user-1/12345.jpg"]);
  });

  it("recurses into subfolders (match-videos layout: user/analysisId/original.ext)", async () => {
    const bucket = makeBucket({
      "user-1": [{ name: "analysis-1", id: null }],
      "user-1/analysis-1": [{ name: "original.mp4", id: "file-1" }],
    });
    const errors = await removeAllUnderPrefix(bucket, "user-1");
    expect(errors).toEqual([]);
    expect(bucket.remove).toHaveBeenCalledWith(["user-1/analysis-1/original.mp4"]);
  });

  it("handles multiple video subfolders", async () => {
    const bucket = makeBucket({
      "user-1": [
        { name: "analysis-1", id: null },
        { name: "analysis-2", id: null },
      ],
      "user-1/analysis-1": [{ name: "original.mp4", id: "file-1" }],
      "user-1/analysis-2": [{ name: "original.mov", id: "file-2" }],
    });
    const errors = await removeAllUnderPrefix(bucket, "user-1");
    expect(errors).toEqual([]);
    expect(bucket.remove).toHaveBeenCalledWith(["user-1/analysis-1/original.mp4"]);
    expect(bucket.remove).toHaveBeenCalledWith(["user-1/analysis-2/original.mov"]);
  });

  it("reports a list error instead of silently skipping cleanup", async () => {
    const bucket = makeBucket(
      { "user-1": [] },
      { listError: "network error", failFolder: "user-1" },
    );
    const errors = await removeAllUnderPrefix(bucket, "user-1");
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("network error");
  });

  it("reports a remove error instead of silently skipping cleanup", async () => {
    const bucket = makeBucket(
      { "user-1": [{ name: "12345.jpg", id: "file-1" }] },
      { removeError: "permission denied", failFolder: "user-1" },
    );
    const errors = await removeAllUnderPrefix(bucket, "user-1");
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("permission denied");
  });
});

function makeLister(
  filesByFolder: Record<string, { name: string; id: string | null; updated_at?: string }[]>,
  opts: { listError?: string; failFolder?: string } = {},
): StorageListerLike {
  return {
    list: vi.fn(async (path: string) => {
      if (opts.listError && path === opts.failFolder) {
        return { data: null, error: { message: opts.listError } };
      }
      return { data: filesByFolder[path] ?? [], error: null };
    }),
  };
}

describe("listAllFilePaths", () => {
  it("returns an empty list for an empty bucket root", async () => {
    const bucket = makeLister({ "": [] });
    expect(await listAllFilePaths(bucket, "")).toEqual([]);
  });

  it("recurses through user/analysisId folders and returns full file paths with timestamps", async () => {
    const bucket = makeLister({
      "": [{ name: "user-1", id: null }],
      "user-1": [{ name: "analysis-1", id: null }],
      "user-1/analysis-1": [
        { name: "original.mp4", id: "file-1", updated_at: "2026-07-01T00:00:00Z" },
      ],
    });
    const files = await listAllFilePaths(bucket, "");
    expect(files).toEqual([
      { path: "user-1/analysis-1/original.mp4", updatedAt: "2026-07-01T00:00:00Z" },
    ]);
  });

  it("skips (does not throw on) a folder that fails to list", async () => {
    const bucket = makeLister(
      { "": [{ name: "user-1", id: null }] },
      { listError: "network error", failFolder: "user-1" },
    );
    expect(await listAllFilePaths(bucket, "")).toEqual([]);
  });
});
