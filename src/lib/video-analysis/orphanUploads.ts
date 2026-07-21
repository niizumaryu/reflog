// Pure decision logic for "is this Storage object an orphan?" — a file
// under the match-videos bucket with no corresponding video_analyses
// row. This happens when uploadVideoFile() (src/lib/video-analysis/
// upload.ts) succeeds but the browser is closed/crashes/loses network
// before the video_analyses insert that follows it, so the client-side
// cleanupFailedUpload() in that same file never runs. Kept separate from
// any Storage/DB call so it's unit-testable without a network/mock
// client, same pattern as retention.ts and storageCleanup.ts.
//
// A minimum age grace period is required (not just "no matching row
// right now") because an upload legitimately has a moment between the
// Storage PUT finishing and the video_analyses row being inserted —
// without a grace period, an in-flight upload would be misidentified as
// an orphan and deleted out from under the user.

export type StorageObjectInfo = {
  // Full path within the bucket, e.g. "<userId>/<analysisId>/original.mp4".
  path: string;
  // Storage's reported last-modified time for the object.
  updatedAt: string | Date;
};

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export const DEFAULT_ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function findOrphanStoragePaths(
  objects: StorageObjectInfo[],
  knownStoragePaths: ReadonlySet<string>,
  now: number = Date.now(),
  minAgeMs: number = DEFAULT_ORPHAN_MIN_AGE_MS,
): string[] {
  return objects
    .filter((object) => !knownStoragePaths.has(object.path))
    .filter((object) => {
      const updatedAtMs = toMs(object.updatedAt);
      if (!Number.isFinite(updatedAtMs)) return false;
      return now - updatedAtMs >= minAgeMs;
    })
    .map((object) => object.path);
}
