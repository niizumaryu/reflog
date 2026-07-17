import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { MATCH_VIDEOS_BUCKET } from "@/lib/video-analysis/constants";
import {
  buildInsufficientQualityCoaching,
  mockBallDetector,
  mockCourtDetector,
  mockEventDetector,
  mockPersonDetector,
  mockRefereeCoachEngine,
} from "@/lib/video-analysis/mockAdapters";
import { assertValidStatusTransition } from "@/lib/video-analysis/statusMachine";
import {
  rowToQualityMetrics,
  rowToVideoAnalysis,
  type QualityMetricsRow,
  type VideoAnalysisRow,
} from "@/lib/video-analysis/videoAnalyses";
import type {
  AnalysisStatus,
  CandidateEvent,
  CoachingResultDraft,
  DetectorInput,
  EvidentiaryFields,
  QualityMetrics,
} from "@/lib/video-analysis/types";

// Server-side orchestration, invoked by the analyze Route Handler. Runs
// the real quality-gate check first, then either withholds judgment
// (insufficient quality) or runs the demo detection/coaching stages in
// order, persisting real incremental progress after each stage.

type Client = SupabaseClient<Database>;

export class PipelineError extends Error {}

async function loadVideoAnalysis(supabase: Client, id: string, userId: string) {
  const { data, error } = await supabase
    .from("video_analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PipelineError("解析対象の動画が見つかりません。");
  return rowToVideoAnalysis(data as VideoAnalysisRow);
}

async function loadQualityMetrics(supabase: Client, videoAnalysisId: string): Promise<QualityMetrics> {
  const { data, error } = await supabase
    .from("analysis_quality_metrics")
    .select("*")
    .eq("video_analysis_id", videoAnalysisId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new PipelineError(
      "映像品質メトリクスが見つかりません。アップロード処理が完了していない可能性があります。",
    );
  }
  return rowToQualityMetrics(data as QualityMetricsRow);
}

async function updateStatus(
  supabase: Client,
  id: string,
  currentStatus: AnalysisStatus,
  fields: {
    status?: AnalysisStatus;
    progress?: number;
    errorMessage?: string | null;
  },
) {
  if (fields.status !== undefined) {
    assertValidStatusTransition(currentStatus, fields.status);
  }

  const { error } = await supabase
    .from("video_analyses")
    .update({
      ...(fields.status !== undefined ? { status: fields.status } : {}),
      ...(fields.progress !== undefined ? { progress: fields.progress } : {}),
      ...(fields.errorMessage !== undefined ? { error_message: fields.errorMessage } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

async function insertEvent(
  supabase: Client,
  userId: string,
  videoAnalysisId: string,
  event: CandidateEvent,
) {
  const { error } = await supabase.from("analysis_events").insert({
    video_analysis_id: videoAnalysisId,
    user_id: userId,
    stage: event.stage,
    event_type: event.eventType,
    timestamp_seconds: event.timestampSeconds,
    conclusion: event.conclusion,
    evidence: event.evidence,
    confidence: event.confidence,
    why_uncertain: event.whyUncertain,
    alternative_interpretation: event.alternativeInterpretation,
    missing_data: event.missingData,
    human_review_recommended: event.humanReviewRecommended,
    is_demo: event.isDemo,
  });
  if (error) throw error;
}

function stageResultToEvent(
  stage: CandidateEvent["stage"],
  eventType: string,
  result: EvidentiaryFields,
): CandidateEvent {
  return {
    stage,
    eventType,
    timestampSeconds: null,
    conclusion: result.conclusion,
    evidence: result.evidence,
    confidence: result.confidence,
    whyUncertain: result.whyUncertain,
    alternativeInterpretation: result.alternativeInterpretation,
    missingData: result.missingData,
    humanReviewRecommended: result.humanReviewRecommended,
    isDemo: result.isDemo,
  };
}

async function insertCoachingResult(
  supabase: Client,
  userId: string,
  videoAnalysisId: string,
  draft: CoachingResultDraft,
) {
  const { error } = await supabase.from("coaching_results").insert({
    video_analysis_id: videoAnalysisId,
    user_id: userId,
    summary: draft.summary,
    strengths: draft.strengths,
    growth_areas: draft.growthAreas,
    conclusion: draft.conclusion,
    evidence: draft.evidence,
    confidence: draft.confidence,
    why_uncertain: draft.whyUncertain,
    alternative_interpretation: draft.alternativeInterpretation,
    missing_data: draft.missingData,
    human_review_recommended: draft.humanReviewRecommended,
    is_demo: draft.isDemo,
  });
  if (error) throw error;
}

export async function runAnalysisPipeline(
  supabase: Client,
  videoAnalysisId: string,
  userId: string,
): Promise<void> {
  const videoAnalysis = await loadVideoAnalysis(supabase, videoAnalysisId, userId);
  const qualityMetrics = await loadQualityMetrics(supabase, videoAnalysisId);

  if (qualityMetrics.tier === "insufficient") {
    const draft = buildInsufficientQualityCoaching(qualityMetrics);
    await insertCoachingResult(supabase, userId, videoAnalysisId, draft);
    await updateStatus(supabase, videoAnalysisId, videoAnalysis.status, {
      status: "completed_insufficient_quality",
      progress: 100,
    });
    return;
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(MATCH_VIDEOS_BUCKET)
    .createSignedUrl(videoAnalysis.storagePath, 60 * 60);
  if (signedUrlError) throw signedUrlError;

  const detectorInput: DetectorInput = {
    videoAnalysisId,
    videoSignedUrl: signedUrlData.signedUrl,
    qualityMetrics,
    durationSeconds: videoAnalysis.durationSeconds,
  };

  const court = await mockCourtDetector.detect(detectorInput);
  await insertEvent(
    supabase,
    userId,
    videoAnalysisId,
    stageResultToEvent("court_detection", "court_visibility_check", court),
  );
  await updateStatus(supabase, videoAnalysisId, videoAnalysis.status, { progress: 20 });

  const persons = await mockPersonDetector.detect(detectorInput);
  await insertEvent(
    supabase,
    userId,
    videoAnalysisId,
    stageResultToEvent("person_detection", "person_detection_summary", persons),
  );
  await updateStatus(supabase, videoAnalysisId, videoAnalysis.status, { progress: 40 });

  const ball = await mockBallDetector.detect(detectorInput);
  await insertEvent(
    supabase,
    userId,
    videoAnalysisId,
    stageResultToEvent("ball_detection", "ball_detection_summary", ball),
  );
  await updateStatus(supabase, videoAnalysisId, videoAnalysis.status, { progress: 60 });

  const candidateEvents = await mockEventDetector.detect({
    ...detectorInput,
    court,
    persons,
    ball,
  });
  for (const candidateEvent of candidateEvents) {
    await insertEvent(supabase, userId, videoAnalysisId, candidateEvent);
  }
  await updateStatus(supabase, videoAnalysisId, videoAnalysis.status, { progress: 80 });

  const coachingDraft = await mockRefereeCoachEngine.generateCoaching({
    ...detectorInput,
    court,
    persons,
    ball,
    events: candidateEvents,
  });
  await insertCoachingResult(supabase, userId, videoAnalysisId, coachingDraft);
  await updateStatus(supabase, videoAnalysisId, videoAnalysis.status, {
    status: "completed",
    progress: 100,
  });
}
