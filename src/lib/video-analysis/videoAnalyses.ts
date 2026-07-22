import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/client";
import { MAX_VIDEO_ANALYSES_PER_FETCH } from "@/lib/queryLimits";
import { MATCH_VIDEOS_BUCKET } from "@/lib/video-analysis/constants";
import { isQuotaExceededError } from "@/lib/video-analysis/planUsage";
import type {
  AnalysisEvent,
  AnalysisStatus,
  CoachingResult,
  ConfidenceDimensions,
  FeedbackEntry,
  NewFeedbackInput,
  QualityMetrics,
  QualityTier,
  RawQualityMetrics,
  VideoAnalysisRecord,
  VideoMetadata,
} from "@/lib/video-analysis/types";

// Client-side CRUD for the video-analysis feature, mirroring the
// conventions in src/lib/schedules.ts: snake_case row type + camelCase
// app type + rowToX() mapper, talking directly to Supabase from the
// browser (RLS enforces ownership — no API route needed for reads).

export type VideoAnalysisRow = {
  id: string;
  user_id: string;
  match_id: string | null;
  title: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  width_px: number | null;
  height_px: number | null;
  estimated_fps: number | null;
  status: string;
  progress: number;
  is_demo: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToVideoAnalysis(row: VideoAnalysisRow): VideoAnalysisRecord {
  return {
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    title: row.title,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    durationSeconds: row.duration_seconds,
    widthPx: row.width_px,
    heightPx: row.height_px,
    estimatedFps: row.estimated_fps,
    status: row.status as AnalysisStatus,
    progress: row.progress,
    isDemo: row.is_demo,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getVideoAnalyses(): Promise<VideoAnalysisRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("video_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_VIDEO_ANALYSES_PER_FETCH);
  if (error) throw error;
  return (data ?? []).map(rowToVideoAnalysis);
}

export async function getVideoAnalysisById(
  id: string,
): Promise<VideoAnalysisRecord | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("video_analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToVideoAnalysis(data) : undefined;
}

export type NewVideoAnalysisInput = {
  id: string;
  title: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  metadata: VideoMetadata;
  matchId?: string | null;
};

export async function createVideoAnalysis(
  input: NewVideoAnalysisInput,
): Promise<VideoAnalysisRecord> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from("video_analyses")
    .insert({
      id: input.id,
      user_id: user.id,
      match_id: input.matchId ?? null,
      title: input.title,
      storage_path: input.storagePath,
      original_filename: input.originalFilename,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      duration_seconds: input.metadata.durationSeconds,
      width_px: input.metadata.widthPx,
      height_px: input.metadata.heightPx,
      estimated_fps: input.metadata.estimatedFps,
      status: "uploaded",
      progress: 0,
    })
    .select("*")
    .single();
  if (error) {
    if (isQuotaExceededError(error)) {
      throw new Error(
        "今月の解析回数の上限に達しました。来月になると解析回数がリセットされます。",
      );
    }
    throw error;
  }
  return rowToVideoAnalysis(data);
}

export async function deleteVideoAnalysis(record: VideoAnalysisRecord): Promise<void> {
  const supabase = createClient();

  // Delete the storage object first: if this fails, nothing has been
  // deleted yet and the whole operation is safely retryable. Supabase
  // Storage's remove() is idempotent for an already-missing key, so a
  // retry after a partial failure below also works cleanly.
  const { error: storageError } = await supabase.storage
    .from(MATCH_VIDEOS_BUCKET)
    .remove([record.storagePath]);
  if (storageError) {
    throw new Error(`動画ファイルの削除に失敗しました: ${storageError.message}`);
  }

  const { error } = await supabase.from("video_analyses").delete().eq("id", record.id);
  if (error) {
    throw new Error(
      `動画ファイルは削除されましたが、記録の削除に失敗しました。もう一度お試しください: ${error.message}`,
    );
  }
}

export type QualityMetricsRow = {
  id: string;
  video_analysis_id: string;
  sampled_frame_count: number;
  mean_brightness: number | null;
  brightness_stddev: number | null;
  dark_frame_ratio: number | null;
  overexposed_frame_ratio: number | null;
  blur_proxy_score: number | null;
  quality_tier: string;
  quality_reasons: string[];
  computed_at: string;
};

export function rowToQualityMetrics(row: QualityMetricsRow): QualityMetrics {
  return {
    id: row.id,
    videoAnalysisId: row.video_analysis_id,
    sampledFrameCount: row.sampled_frame_count,
    meanBrightness: row.mean_brightness,
    brightnessStddev: row.brightness_stddev,
    darkFrameRatio: row.dark_frame_ratio,
    overexposedFrameRatio: row.overexposed_frame_ratio,
    blurProxyScore: row.blur_proxy_score,
    tier: row.quality_tier as QualityTier,
    reasons: row.quality_reasons,
    computedAt: row.computed_at,
  };
}

export async function saveQualityMetrics(
  videoAnalysisId: string,
  metrics: RawQualityMetrics,
  tier: QualityTier,
  reasons: string[],
): Promise<QualityMetrics> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from("analysis_quality_metrics")
    .insert({
      video_analysis_id: videoAnalysisId,
      user_id: user.id,
      sampled_frame_count: metrics.sampledFrameCount,
      mean_brightness: metrics.meanBrightness,
      brightness_stddev: metrics.brightnessStddev,
      dark_frame_ratio: metrics.darkFrameRatio,
      overexposed_frame_ratio: metrics.overexposedFrameRatio,
      blur_proxy_score: metrics.blurProxyScore,
      quality_tier: tier,
      quality_reasons: reasons,
      raw_metrics: metrics,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToQualityMetrics(data);
}

export async function getQualityMetrics(
  videoAnalysisId: string,
): Promise<QualityMetrics | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analysis_quality_metrics")
    .select("*")
    .eq("video_analysis_id", videoAnalysisId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToQualityMetrics(data) : undefined;
}

type AnalysisEventRow = {
  id: string;
  video_analysis_id: string;
  stage: string;
  event_type: string;
  timestamp_seconds: number | null;
  conclusion: string;
  evidence: string;
  confidence: Record<string, unknown>;
  why_uncertain: string;
  alternative_interpretation: string;
  missing_data: string;
  human_review_recommended: boolean;
  is_demo: boolean;
  created_at: string;
};

function rowToAnalysisEvent(row: AnalysisEventRow): AnalysisEvent {
  return {
    id: row.id,
    videoAnalysisId: row.video_analysis_id,
    stage: row.stage as AnalysisEvent["stage"],
    eventType: row.event_type,
    timestampSeconds: row.timestamp_seconds,
    conclusion: row.conclusion,
    evidence: row.evidence,
    confidence: row.confidence as unknown as ConfidenceDimensions,
    whyUncertain: row.why_uncertain,
    alternativeInterpretation: row.alternative_interpretation,
    missingData: row.missing_data,
    humanReviewRecommended: row.human_review_recommended,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  };
}

export async function getAnalysisEvents(videoAnalysisId: string): Promise<AnalysisEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analysis_events")
    .select("*")
    .eq("video_analysis_id", videoAnalysisId)
    .order("timestamp_seconds", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(rowToAnalysisEvent);
}

type CoachingResultRow = {
  id: string;
  video_analysis_id: string;
  summary: string;
  strengths: string[];
  growth_areas: string[];
  conclusion: string;
  evidence: string;
  confidence: Record<string, unknown>;
  why_uncertain: string;
  alternative_interpretation: string;
  missing_data: string;
  human_review_recommended: boolean;
  is_demo: boolean;
  created_at: string;
};

function rowToCoachingResult(row: CoachingResultRow): CoachingResult {
  return {
    id: row.id,
    videoAnalysisId: row.video_analysis_id,
    summary: row.summary,
    strengths: row.strengths,
    growthAreas: row.growth_areas,
    conclusion: row.conclusion,
    evidence: row.evidence,
    confidence: row.confidence as unknown as ConfidenceDimensions,
    whyUncertain: row.why_uncertain,
    alternativeInterpretation: row.alternative_interpretation,
    missingData: row.missing_data,
    humanReviewRecommended: row.human_review_recommended,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  };
}

export async function getCoachingResult(
  videoAnalysisId: string,
): Promise<CoachingResult | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coaching_results")
    .select("*")
    .eq("video_analysis_id", videoAnalysisId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCoachingResult(data) : undefined;
}

type FeedbackRow = {
  id: string;
  video_analysis_id: string;
  target_type: string;
  target_id: string;
  rating: string;
  comment: string;
  created_at: string;
};

function rowToFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    videoAnalysisId: row.video_analysis_id,
    targetType: row.target_type as FeedbackEntry["targetType"],
    targetId: row.target_id,
    rating: row.rating as FeedbackEntry["rating"],
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function saveFeedback(
  videoAnalysisId: string,
  input: NewFeedbackInput,
): Promise<FeedbackEntry> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from("analysis_feedback")
    .insert({
      video_analysis_id: videoAnalysisId,
      user_id: user.id,
      target_type: input.targetType,
      target_id: input.targetId,
      rating: input.rating,
      comment: input.comment ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToFeedback(data);
}
