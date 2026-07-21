import { findOrphanStoragePaths } from "@/lib/video-analysis/orphanUploads";
import {
  isEligibleForOriginalVideoPurge,
  type PurgeCandidateInput,
} from "@/lib/video-analysis/retention";
import type { AnalysisStatus, PlanType } from "@/lib/video-analysis/types";

// Orchestration layer for scheduled video Storage housekeeping: purging
// original video files past their plan's retention window, and removing
// orphaned Storage objects that have no matching video_analyses row.
//
// Deliberately built around small, explicit dependency functions (not
// the whole Supabase client) so the dry-run / live / error-handling
// behaviour below is unit-testable with plain fakes (see
// videoMaintenance.test.ts) with no Supabase import at all — the real
// Supabase wiring lives in videoMaintenanceDeps.ts (a separate file
// because it transitively imports the `server-only`-guarded admin
// client, which would otherwise make this file's own pure logic
// untestable outside a server context). The eligibility DECISIONS
// (which rows/files qualify) live in retention.ts / orphanUploads.ts and
// are pure and separately tested; this file only sequences IO around
// those decisions and never re-implements them.
//
// Every deletion here is a single, specific, previously-identified
// target (one storage path, one row id) — never a prefix or a bulk
// "delete everything matching a pattern" call — so a bug in the
// candidate-selection step can at most skip or over-select known rows,
// it cannot cascade into deleting unrelated data.

export type PurgeRow = {
  id: string;
  userId: string;
  status: AnalysisStatus;
  createdAt: string;
  storagePath: string;
  originalVideoDeletedAt: string | null;
};

export type PurgeDeps = {
  fetchPurgeCandidateRows: () => Promise<PurgeRow[]>;
  fetchRetentionDaysByPlan: () => Promise<Partial<Record<PlanType, number | null>>>;
  fetchPlanTypeByUserId: (userIds: string[]) => Promise<Record<string, PlanType>>;
  deleteStorageObject: (storagePath: string) => Promise<{ error: string | null }>;
  markOriginalVideoDeleted: (analysisId: string) => Promise<{ error: string | null }>;
};

export type PurgeSummary = {
  dryRun: boolean;
  checked: number;
  eligible: number;
  purged: number;
  errors: string[];
};

export async function runOriginalVideoPurge(
  deps: PurgeDeps,
  options: { dryRun: boolean; now?: number },
): Promise<PurgeSummary> {
  const now = options.now ?? Date.now();
  const errors: string[] = [];

  const rows = await deps.fetchPurgeCandidateRows();
  const retentionDaysByPlan = await deps.fetchRetentionDaysByPlan();
  const planTypeByUserId = await deps.fetchPlanTypeByUserId([...new Set(rows.map((r) => r.userId))]);

  const eligible = rows.filter((row) => {
    const planType = planTypeByUserId[row.userId] ?? "free";
    const retentionDays = retentionDaysByPlan[planType] ?? null;
    const input: PurgeCandidateInput = {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      originalVideoDeletedAt: row.originalVideoDeletedAt,
    };
    return isEligibleForOriginalVideoPurge(input, retentionDays, now);
  });

  let purged = 0;
  if (!options.dryRun) {
    for (const row of eligible) {
      const { error: storageError } = await deps.deleteStorageObject(row.storagePath);
      if (storageError) {
        // Left as-is for the next run to retry: original_video_deleted_at
        // is only set below, after the Storage delete has succeeded, so
        // a failed delete here never gets marked done.
        errors.push(`[purge] storage delete failed for ${row.id} (${row.storagePath}): ${storageError}`);
        continue;
      }
      const { error: dbError } = await deps.markOriginalVideoDeleted(row.id);
      if (dbError) {
        // The file is already gone from Storage but the row doesn't know
        // it yet. The next run will retry deleteStorageObject against an
        // already-missing object — Supabase Storage's remove() treats a
        // missing object as a no-op success rather than an error, so
        // this self-heals on the next run instead of retrying forever.
        errors.push(`[purge] marked-deleted update failed for ${row.id}: ${dbError}`);
        continue;
      }
      purged++;
    }
  }

  return { dryRun: options.dryRun, checked: rows.length, eligible: eligible.length, purged, errors };
}

export type OrphanCleanupDeps = {
  listStorageObjects: () => Promise<{ path: string; updatedAt: string | null }[]>;
  listKnownStoragePaths: () => Promise<Set<string>>;
  deleteStorageObject: (storagePath: string) => Promise<{ error: string | null }>;
};

export type OrphanCleanupSummary = {
  dryRun: boolean;
  scanned: number;
  found: number;
  removed: number;
  errors: string[];
};

export async function runOrphanUploadCleanup(
  deps: OrphanCleanupDeps,
  options: { dryRun: boolean; now?: number },
): Promise<OrphanCleanupSummary> {
  const now = options.now ?? Date.now();
  const errors: string[] = [];

  const objects = await deps.listStorageObjects();
  const known = await deps.listKnownStoragePaths();
  const orphanPaths = findOrphanStoragePaths(
    objects.map((o) => ({ path: o.path, updatedAt: o.updatedAt ?? new Date(0).toISOString() })),
    known,
    now,
  );

  let removed = 0;
  if (!options.dryRun) {
    for (const path of orphanPaths) {
      const { error } = await deps.deleteStorageObject(path);
      if (error) {
        errors.push(`[orphans] delete failed for ${path}: ${error}`);
        continue;
      }
      removed++;
    }
  }

  return { dryRun: options.dryRun, scanned: objects.length, found: orphanPaths.length, removed, errors };
}
