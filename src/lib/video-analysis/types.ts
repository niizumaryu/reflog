// Shared types for the AI video analysis feature.
//
// Two categories of data flow through this module:
//   1. REAL data — video metadata and quality metrics computed directly
//      from the uploaded file/frames in the browser (qualityMetrics.ts).
//   2. DEMO data — court/person/ball/event detection and coaching output,
//      produced today by MockAdapters (mockAdapters.ts) because no real
//      computer-vision model runs in this app yet. Every demo result is
//      flagged `isDemo: true` and carries the full evidentiary shape below
//      so the UI never presents a guess as a fact.
//
// The Detector/CoachEngine interfaces are the seam a future real adapter
// (calling an actual CV model or worker service) would implement — no
// caller of runAnalysisPipeline needs to change when that happens.

export type AnalysisStatus =
  | "uploaded"
  | "analyzing"
  | "completed"
  | "completed_insufficient_quality"
  | "failed";

export type QualityTier = "insufficient" | "low" | "medium" | "high";

export type VideoAnalysisRecord = {
  id: string;
  userId: string;
  matchId: string | null;
  title: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  widthPx: number | null;
  heightPx: number | null;
  estimatedFps: number | null;
  status: AnalysisStatus;
  progress: number;
  isDemo: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

// Real, client-computed video metadata (Stage 1: ingestion).
export type VideoMetadata = {
  durationSeconds: number | null;
  widthPx: number | null;
  heightPx: number | null;
  estimatedFps: number | null;
};

// Real, client-computed quality signals (Stage 2: quality assessment).
// Every number here comes from actually sampling frames of the uploaded
// video — never fabricated or guessed.
export type RawQualityMetrics = {
  sampledFrameCount: number;
  meanBrightness: number | null;
  brightnessStddev: number | null;
  darkFrameRatio: number | null;
  overexposedFrameRatio: number | null;
  blurProxyScore: number | null;
};

export type QualityClassification = {
  tier: QualityTier;
  reasons: string[];
};

export type QualityMetrics = RawQualityMetrics &
  QualityClassification & {
    id: string;
    videoAnalysisId: string;
    computedAt: string;
  };

// Multi-dimensional confidence — never a single blended number.
export type ConfidenceDimensions = {
  videoQuality: QualityTier;
  detection: "not_applicable" | "low" | "medium" | "high";
  overall: "demo_only" | "low" | "medium" | "high";
};

// The full evidentiary shape every demo finding must carry.
export type EvidentiaryFields = {
  conclusion: string;
  evidence: string;
  confidence: ConfidenceDimensions;
  whyUncertain: string;
  alternativeInterpretation: string;
  missingData: string;
  humanReviewRecommended: boolean;
  isDemo: boolean;
};

export type AnalysisEventStage =
  | "court_detection"
  | "person_detection"
  | "ball_detection"
  | "event_detection";

export type AnalysisEvent = EvidentiaryFields & {
  id: string;
  videoAnalysisId: string;
  stage: AnalysisEventStage;
  eventType: string;
  timestampSeconds: number | null;
  createdAt: string;
};

export type CoachingResult = EvidentiaryFields & {
  id: string;
  videoAnalysisId: string;
  summary: string;
  strengths: string[];
  growthAreas: string[];
  createdAt: string;
};

export type PlanType = "free" | "pro" | "admin";

// One row per plan_type from public.plan_limits. monthlyAnalysisLimit
// null means unlimited.
export type PlanLimit = {
  planType: PlanType;
  monthlyAnalysisLimit: number | null;
  label: string;
};

// Derived, display-ready summary of a user's monthly analysis usage.
// Computed client-side from the profile row + plan_limits (see
// planUsage.ts) — never trusted from a client-writable source, since the
// actual enforcement happens in the enforce_video_analysis_quota DB
// trigger regardless of what this summary shows.
export type UsageSummary = {
  planType: PlanType;
  planLabel: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  canStartAnalysis: boolean;
  resetsOn: string;
};

export type FeedbackTargetType = "event" | "coaching";
export type FeedbackRating = "agree" | "disagree" | "unsure";

export type FeedbackEntry = {
  id: string;
  videoAnalysisId: string;
  targetType: FeedbackTargetType;
  targetId: string;
  rating: FeedbackRating;
  comment: string;
  createdAt: string;
};

export type NewFeedbackInput = {
  targetType: FeedbackTargetType;
  targetId: string;
  rating: FeedbackRating;
  comment?: string;
};

// ---------------------------------------------------------------------
// Adapter interfaces — the swappable seam for real detectors later.
// ---------------------------------------------------------------------

export type DetectorInput = {
  videoAnalysisId: string;
  videoSignedUrl: string;
  qualityMetrics: QualityMetrics;
  durationSeconds: number | null;
};

export type CourtDetectionResult = EvidentiaryFields & {
  courtVisible: boolean;
};

export type PersonDetectionResult = EvidentiaryFields & {
  estimatedPersonCount: number | null;
  refereeIdentified: boolean;
};

export type BallDetectionResult = EvidentiaryFields & {
  ballTrackAvailable: boolean;
};

export type CandidateEvent = Omit<
  AnalysisEvent,
  "id" | "videoAnalysisId" | "createdAt"
>;

export interface CourtDetector {
  detect(input: DetectorInput): Promise<CourtDetectionResult>;
}

export interface PersonDetector {
  detect(input: DetectorInput): Promise<PersonDetectionResult>;
}

export interface BallDetector {
  detect(input: DetectorInput): Promise<BallDetectionResult>;
}

export interface EventDetector {
  detect(
    input: DetectorInput & {
      court: CourtDetectionResult;
      persons: PersonDetectionResult;
      ball: BallDetectionResult;
    },
  ): Promise<CandidateEvent[]>;
}

export type CoachingInput = DetectorInput & {
  court: CourtDetectionResult;
  persons: PersonDetectionResult;
  ball: BallDetectionResult;
  events: CandidateEvent[];
};

export type CoachingResultDraft = Omit<
  CoachingResult,
  "id" | "videoAnalysisId" | "createdAt"
>;

export interface RefereeCoachEngine {
  generateCoaching(input: CoachingInput): Promise<CoachingResultDraft>;
}
