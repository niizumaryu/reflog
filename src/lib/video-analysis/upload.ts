import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MATCH_VIDEOS_BUCKET,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  MIN_VIDEO_DURATION_SECONDS,
} from "@/lib/video-analysis/constants";

export function validateVideoFile(file: File): string | null {
  const allowed: readonly string[] = ALLOWED_VIDEO_MIME_TYPES;
  if (!allowed.includes(file.type)) {
    return "対応していない動画形式です。MP4・MOV・WebM形式の動画を選択してください";
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `動画の容量が大きすぎます。${Math.floor(MAX_VIDEO_SIZE_BYTES / 1024 / 1024)}MB以内の動画を選択してください`;
  }
  return null;
}

export function validateVideoDuration(durationSeconds: number | null): string | null {
  if (durationSeconds !== null && durationSeconds < MIN_VIDEO_DURATION_SECONDS) {
    return `動画が短すぎます。${MIN_VIDEO_DURATION_SECONDS}秒以上の動画を選択してください`;
  }
  if (durationSeconds !== null && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return `動画が長すぎます。${Math.floor(MAX_VIDEO_DURATION_SECONDS / 60)}分以内の動画を選択してください`;
  }
  return null;
}

// Extension is derived only from the (already-validated) MIME type, never
// from the user-supplied original filename — the filename is untrusted
// input and must never end up in the storage path.
const MIME_TO_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export async function uploadVideoFile(file: File, analysisId: string): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const extension = MIME_TO_EXTENSION[file.type] ?? "mp4";
  const path = `${user.id}/${analysisId}/original.${extension}`;

  const { error } = await supabase.storage
    .from(MATCH_VIDEOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;

  return path;
}

const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

export async function getPlaybackUrl(
  storagePath: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(MATCH_VIDEOS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// Pure decision logic for orphaned-upload cleanup, kept separate from the
// actual Supabase calls so it's unit-testable without a network/mock
// client. Deliberately conservative: only ever names the exact
// storagePath/videoAnalysisId from THIS upload attempt — never a prefix,
// never another row — so a partially-failed upload can never delete a
// different, already-successful video.
export function resolveOrphanCleanupTargets(params: {
  storagePath: string | null;
  videoAnalysisId: string | null;
}): { storagePath: string | null; videoAnalysisId: string | null } {
  if (!params.storagePath) {
    // Nothing was ever uploaded to Storage — nothing to clean up.
    return { storagePath: null, videoAnalysisId: null };
  }
  return { storagePath: params.storagePath, videoAnalysisId: params.videoAnalysisId };
}

// Called when an upload attempt fails partway through (Storage upload
// succeeded but creating the video_analyses row, or its quality-metrics
// row, failed). Removes exactly the file/row created by THIS attempt so
// no billed-but-unreferenced Storage object is left behind. Deleting the
// video_analyses row (if it was created) cascades to
// analysis_quality_metrics via its own foreign key, so a single delete
// call is enough there.
//
// Every failure here is swallowed and logged rather than thrown: this
// runs from inside an already-failed upload's error handler, and the
// user-facing error message it's paired with must not depend on this
// best-effort cleanup succeeding. Logged fields are limited to the
// Storage path (already scoped under the user's own auth.uid()), the
// row id, and the Supabase error message — never a token, key, or other
// user's data.
export async function cleanupFailedUpload(params: {
  storagePath: string | null;
  videoAnalysisId?: string | null;
}): Promise<void> {
  const targets = resolveOrphanCleanupTargets({
    storagePath: params.storagePath,
    videoAnalysisId: params.videoAnalysisId ?? null,
  });
  if (!targets.storagePath) return;

  const supabase = createClient();

  if (targets.videoAnalysisId) {
    const { error } = await supabase
      .from("video_analyses")
      .delete()
      .eq("id", targets.videoAnalysisId);
    if (error) {
      console.error("[video-analysis] Failed to remove incomplete analysis row", {
        videoAnalysisId: targets.videoAnalysisId,
        reason: error.message,
      });
    }
  }

  const { error: storageError } = await supabase.storage
    .from(MATCH_VIDEOS_BUCKET)
    .remove([targets.storagePath]);
  if (storageError) {
    console.error("[video-analysis] Failed to remove orphaned storage file", {
      storagePath: targets.storagePath,
      reason: storageError.message,
    });
  }
}
