export const MATCH_VIDEOS_BUCKET = "match-videos";

// Client-side upload limits. Enforced in validateVideoFile()/
// validateVideoDuration() before any network request. The Storage
// bucket's file_size_limit/allowed_mime_types and the video_analyses
// CHECK constraints (see supabase/migrations/20260716_add_video_analysis.sql
// and 20260717_harden_video_analysis.sql) are the server-side backstop —
// keep those numbers in sync with the constants below if either changes.
export const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024; // 300MB
export const MIN_VIDEO_DURATION_SECONDS = 2; // below this, a video can't be analyzed at all
export const MAX_VIDEO_DURATION_SECONDS = 15 * 60; // 15 minutes
export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

// Hard-fail thresholds: below these, the pipeline withholds judgment
// entirely (status becomes completed_insufficient_quality) rather than
// running the demo detection stages on data that can't support them.
export const QUALITY_HARD_FAILS = {
  minDurationSeconds: MIN_VIDEO_DURATION_SECONDS,
  minDimensionPx: 180,
  minSampledFrameCount: 3,
};

// How long a video_analyses row may sit in 'uploaded' or 'analyzing'
// without a fresh updated_at before the UI treats it as stalled (e.g.
// the serverless function that ran the pipeline crashed or was killed
// by a platform timeout without ever reaching its own failure handler)
// and offers a manual retry instead of spinning forever.
export const STALE_ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const PLAN_LABELS: Record<string, string> = {
  free: "無料プラン",
  pro: "有料プラン(準備中)",
  admin: "管理者・開発者",
};

// Soft-fail thresholds: each crossed threshold is appended to
// quality_reasons and caps downstream confidence, but analysis still runs.
export const QUALITY_SOFT_FAILS = {
  minMeanBrightness: 25,
  maxMeanBrightness: 230,
  maxDarkFrameRatio: 0.5,
  minBlurProxyScore: 8,
  minResolutionPx: 360,
  minEstimatedFps: 10,
};

export const FRAME_SAMPLE_COUNT: number = 12;

export const QUALITY_REASON_LABELS: Record<string, string> = {
  insufficient_data_for_analysis: "解析に必要なデータが不足しています",
  poor_lighting: "明るさが不適切です(暗すぎる・明るすぎる)",
  mostly_dark_frames: "暗いフレームが多く含まれています",
  low_sharpness: "映像のシャープさが不足しています(手ぶれ・ピンボケの可能性)",
  low_resolution: "解像度が低い可能性があります",
  low_frame_rate: "フレームレートが低い可能性があります",
};

export const STAGE_LABELS: Record<string, string> = {
  court_detection: "コート検出",
  person_detection: "選手・審判検出",
  ball_detection: "ボール検出",
  event_detection: "プレー場面検出",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  court_visibility_check: "コート視認性チェック",
  person_detection_summary: "人物検出サマリー",
  ball_detection_summary: "ボール検出サマリー",
  demo_pipeline_placeholder: "デモパイプライン(未実装のプレースホルダー)",
};

export const STATUS_LABELS: Record<string, string> = {
  uploaded: "アップロード済み",
  analyzing: "解析中",
  completed: "解析完了",
  completed_insufficient_quality: "判定不能(映像品質不足)",
  failed: "解析失敗",
};
