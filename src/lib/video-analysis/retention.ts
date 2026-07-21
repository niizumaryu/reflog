import type { AnalysisStatus, PlanType } from "@/lib/video-analysis/types";

// Pure decision logic for "should the ORIGINAL video file for this
// analysis be deleted from Storage now?" — kept separate from any
// Supabase/Storage call so it's unit-testable without a network/mock
// client, same pattern as staleness.ts and storageCleanup.ts.
//
// Deliberately narrow in scope: this only ever decides about the large
// original video file. The video_analyses row and everything derived
// from it (quality metrics, detection events, coaching results,
// feedback) is the durable analysis record and is never touched here.

// Only a terminal, successfully-processed analysis is eligible — an
// in-flight analysis still needs its source file, and a 'failed'
// analysis keeps its file so a manual retry (see the analyze Route
// Handler) has something to re-process. There is no separate retry path
// once the original file is gone, so purging a 'failed' row would make
// that failure permanent.
const PURGEABLE_STATUSES: ReadonlySet<AnalysisStatus> = new Set([
  "completed",
  "completed_insufficient_quality",
]);

export type PurgeCandidateInput = {
  id: string;
  status: AnalysisStatus;
  createdAt: string | Date;
  originalVideoDeletedAt: string | Date | null;
};

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

// retentionDays === null means "keep indefinitely" (e.g. the admin
// plan) — never eligible for purge regardless of age.
export function isEligibleForOriginalVideoPurge(
  analysis: PurgeCandidateInput,
  retentionDays: number | null,
  now: number = Date.now(),
): boolean {
  if (analysis.originalVideoDeletedAt !== null) return false;
  if (!PURGEABLE_STATUSES.has(analysis.status)) return false;
  if (retentionDays === null) return false;

  const createdAtMs = toMs(analysis.createdAt);
  if (!Number.isFinite(createdAtMs)) return false;

  const ageMs = now - createdAtMs;
  return ageMs >= retentionDays * 24 * 60 * 60 * 1000;
}

// Batch form used by the maintenance job: filters a page of analysis
// rows (each already tagged with its owner's plan_type) down to the
// ones eligible for purge right now, given a plan -> retention_days map
// (i.e. the current contents of plan_limits).
export function selectAnalysesForPurge(
  analyses: (PurgeCandidateInput & { planType: PlanType })[],
  retentionDaysByPlan: Partial<Record<PlanType, number | null>>,
  now: number = Date.now(),
): PurgeCandidateInput[] {
  return analyses.filter((analysis) => {
    const retentionDays = retentionDaysByPlan[analysis.planType] ?? null;
    return isEligibleForOriginalVideoPurge(analysis, retentionDays, now);
  });
}
