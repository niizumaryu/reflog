import { createAdminClient } from "@/lib/supabase/admin";
import { listAllFilePaths } from "@/lib/supabase/storageCleanup";
import { MATCH_VIDEOS_BUCKET } from "@/lib/video-analysis/constants";
import type { OrphanCleanupDeps, PurgeDeps } from "@/lib/video-analysis/videoMaintenance";
import type { AnalysisStatus, PlanType } from "@/lib/video-analysis/types";

// Real Supabase wiring for the pure orchestration functions in
// videoMaintenance.ts — split into its own file (rather than living
// alongside runOriginalVideoPurge/runOrphanUploadCleanup) specifically
// so that file has zero Supabase imports and stays testable with plain
// fakes. No separate "server-only" marker here: this file's only
// Supabase entry point is createAdminClient() from admin.ts, which
// already carries that guard — importing this file client-side would
// fail there. Imported by the maintenance Route Handler only.

type AdminClient = ReturnType<typeof createAdminClient>;

export function buildPurgeDeps(admin: AdminClient): PurgeDeps {
  return {
    async fetchPurgeCandidateRows() {
      const { data, error } = await admin
        .from("video_analyses")
        .select("id, user_id, status, created_at, storage_path, original_video_deleted_at")
        .is("original_video_deleted_at", null)
        .in("status", ["completed", "completed_insufficient_quality"])
        .limit(500);
      if (error) throw new Error(`fetchPurgeCandidateRows failed: ${error.message}`);
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        status: row.status as AnalysisStatus,
        createdAt: row.created_at,
        storagePath: row.storage_path,
        originalVideoDeletedAt: row.original_video_deleted_at,
      }));
    },
    async fetchRetentionDaysByPlan() {
      const { data, error } = await admin.from("plan_limits").select("plan_type, retention_days");
      if (error) throw new Error(`fetchRetentionDaysByPlan failed: ${error.message}`);
      const result: Partial<Record<PlanType, number | null>> = {};
      for (const row of data ?? []) {
        result[row.plan_type as PlanType] = row.retention_days;
      }
      return result;
    },
    async fetchPlanTypeByUserId(userIds) {
      if (userIds.length === 0) return {};
      const { data, error } = await admin
        .from("profiles")
        .select("id, plan_type")
        .in("id", userIds);
      if (error) throw new Error(`fetchPlanTypeByUserId failed: ${error.message}`);
      const result: Record<string, PlanType> = {};
      for (const row of data ?? []) {
        result[row.id] = row.plan_type as PlanType;
      }
      return result;
    },
    async deleteStorageObject(storagePath) {
      const { error } = await admin.storage.from(MATCH_VIDEOS_BUCKET).remove([storagePath]);
      return { error: error ? error.message : null };
    },
    async markOriginalVideoDeleted(analysisId) {
      const { error } = await admin
        .from("video_analyses")
        .update({ original_video_deleted_at: new Date().toISOString() })
        .eq("id", analysisId);
      return { error: error ? error.message : null };
    },
  };
}

export function buildOrphanCleanupDeps(admin: AdminClient): OrphanCleanupDeps {
  return {
    async listStorageObjects() {
      return listAllFilePaths(admin.storage.from(MATCH_VIDEOS_BUCKET), "");
    },
    async listKnownStoragePaths() {
      const { data, error } = await admin.from("video_analyses").select("storage_path").limit(10000);
      if (error) throw new Error(`listKnownStoragePaths failed: ${error.message}`);
      return new Set((data ?? []).map((row) => row.storage_path));
    },
    async deleteStorageObject(storagePath) {
      const { error } = await admin.storage.from(MATCH_VIDEOS_BUCKET).remove([storagePath]);
      return { error: error ? error.message : null };
    },
  };
}
