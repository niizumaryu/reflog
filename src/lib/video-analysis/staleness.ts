import { STALE_ANALYSIS_TIMEOUT_MS } from "@/lib/video-analysis/constants";
import type { AnalysisStatus } from "@/lib/video-analysis/types";

// Statuses that can still make forward progress on their own — if one of
// these hasn't touched updated_at in a while, the pipeline is presumed
// stuck (e.g. the serverless function that ran it crashed or was killed
// by a platform timeout before it could mark itself failed). Terminal
// statuses (completed/completed_insufficient_quality) are done by
// definition and are never "stale"; 'failed' already has its own retry
// button and doesn't need a separate staleness label.
const IN_FLIGHT_STATUSES: ReadonlySet<AnalysisStatus> = new Set(["uploaded", "analyzing"]);

export function isAnalysisStale(
  status: AnalysisStatus,
  updatedAt: string | Date,
  now: number = Date.now(),
  timeoutMs: number = STALE_ANALYSIS_TIMEOUT_MS,
): boolean {
  if (!IN_FLIGHT_STATUSES.has(status)) return false;
  const updatedAtMs = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) return false;
  return now - updatedAtMs > timeoutMs;
}
