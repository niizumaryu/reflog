import type { AnalysisStatus } from "@/lib/video-analysis/types";

// Single source of truth for legal video_analyses.status transitions,
// mirrored by the DB trigger enforce_video_analysis_status_transition()
// (see supabase/migrations/20260716_add_video_analysis.sql). Keeping
// both layers in sync means a bug in application code fails fast here,
// while the DB trigger still protects against any other write path.
const ALLOWED_TRANSITIONS: Record<AnalysisStatus, ReadonlySet<AnalysisStatus>> = {
  uploaded: new Set<AnalysisStatus>(["analyzing", "failed"]),
  analyzing: new Set<AnalysisStatus>([
    "completed",
    "completed_insufficient_quality",
    "failed",
  ]),
  failed: new Set<AnalysisStatus>(["analyzing"]),
  completed: new Set<AnalysisStatus>(),
  completed_insufficient_quality: new Set<AnalysisStatus>(),
};

export function isValidStatusTransition(
  from: AnalysisStatus,
  to: AnalysisStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].has(to);
}

export function assertValidStatusTransition(
  from: AnalysisStatus,
  to: AnalysisStatus,
): void {
  if (!isValidStatusTransition(from, to)) {
    throw new Error(`Invalid video analysis status transition: ${from} -> ${to}`);
  }
}
