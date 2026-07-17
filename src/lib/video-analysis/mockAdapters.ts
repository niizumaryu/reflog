import type {
  BallDetectionResult,
  BallDetector,
  CandidateEvent,
  CoachingInput,
  CoachingResultDraft,
  CourtDetectionResult,
  CourtDetector,
  DetectorInput,
  EventDetector,
  PersonDetectionResult,
  PersonDetector,
  QualityMetrics,
  RefereeCoachEngine,
} from "@/lib/video-analysis/types";

// DEMO implementations only. No real computer-vision model runs here —
// every method below is a placeholder that makes that fact explicit in
// its own output (conclusion/whyUncertain/missingData), never a
// fabricated detection or ruling. Swapping in a real detector later
// means writing a new class that implements the same interface
// (CourtDetector/PersonDetector/BallDetector/EventDetector/
// RefereeCoachEngine) and pointing the pipeline at it — no caller needs
// to change.

function evidenceSummary(qualityMetrics: QualityMetrics, durationSeconds: number | null): string {
  const duration = durationSeconds !== null ? `${durationSeconds.toFixed(1)}秒` : "不明";
  const frames = qualityMetrics.sampledFrameCount;
  return `実測: 動画長 ${duration} / サンプリングフレーム数 ${frames} / 映像品質 ${qualityMetrics.tier}`;
}

export class MockCourtDetector implements CourtDetector {
  async detect(input: DetectorInput): Promise<CourtDetectionResult> {
    return {
      courtVisible: false,
      conclusion: "コートライン検出はデモ段階のため実行していません。",
      evidence: evidenceSummary(input.qualityMetrics, input.durationSeconds),
      confidence: {
        videoQuality: input.qualityMetrics.tier,
        detection: "not_applicable",
        overall: "demo_only",
      },
      whyUncertain:
        "コートライン・ランドマーク検出モデルがまだ統合されていないため、コートの視認性やコート座標への変換を判定できません。",
      alternativeInterpretation:
        "将来的にはコートライン検出とホモグラフィ推定により、映像座標を標準コート座標へ変換する予定です。",
      missingData: "コートライン検出モデル、カメラキャリブレーション",
      humanReviewRecommended: true,
      isDemo: true,
    };
  }
}

export class MockPersonDetector implements PersonDetector {
  async detect(input: DetectorInput): Promise<PersonDetectionResult> {
    return {
      estimatedPersonCount: null,
      refereeIdentified: false,
      conclusion: "選手・審判の検出はデモ段階のため実行していません。",
      evidence: evidenceSummary(input.qualityMetrics, input.durationSeconds),
      confidence: {
        videoQuality: input.qualityMetrics.tier,
        detection: "not_applicable",
        overall: "demo_only",
      },
      whyUncertain:
        "人物検出・役割分類(審判/選手/コーチ)モデルがまだ統合されていないため、人数や審判の位置を特定できません。",
      alternativeInterpretation:
        "将来的にはユニフォーム色・位置・時系列行動から役割を分類する予定です。",
      missingData: "人物検出モデル、役割分類モデル",
      humanReviewRecommended: true,
      isDemo: true,
    };
  }
}

export class MockBallDetector implements BallDetector {
  async detect(input: DetectorInput): Promise<BallDetectionResult> {
    return {
      ballTrackAvailable: false,
      conclusion: "ボール検出・軌道推定はデモ段階のため実行していません。",
      evidence: evidenceSummary(input.qualityMetrics, input.durationSeconds),
      confidence: {
        videoQuality: input.qualityMetrics.tier,
        detection: "not_applicable",
        overall: "demo_only",
      },
      whyUncertain:
        "ボールは小さく高速に移動するため、専用の小物体検出モデルと時系列軌道推定が必要です。まだ統合されていません。",
      alternativeInterpretation:
        "将来的にはマルチスケール推論と軌道予測を組み合わせて検出精度を高める予定です。",
      missingData: "ボール専用検出モデル、軌道追跡",
      humanReviewRecommended: true,
      isDemo: true,
    };
  }
}

export class MockEventDetector implements EventDetector {
  async detect(
    input: DetectorInput & {
      court: CourtDetectionResult;
      persons: PersonDetectionResult;
      ball: BallDetectionResult;
    },
  ): Promise<CandidateEvent[]> {
    const placeholder: CandidateEvent = {
      stage: "event_detection",
      eventType: "demo_pipeline_placeholder",
      timestampSeconds: null,
      conclusion:
        "プレー場面(シュート・ドライブ・接触候補など)の自動抽出はデモ段階のため実行していません。",
      evidence: evidenceSummary(input.qualityMetrics, input.durationSeconds),
      confidence: {
        videoQuality: input.qualityMetrics.tier,
        detection: "not_applicable",
        overall: "demo_only",
      },
      whyUncertain:
        "プレー場面の抽出にはコート・人物・ボール検出の結果を組み合わせた時系列行動認識モデルが必要ですが、まだ統合されていません。",
      alternativeInterpretation:
        "将来的には接触候補・違反候補などを『要確認』として提示し、断定的な判定は行いません。",
      missingData: "時系列行動認識モデル、コート/人物/ボール検出結果",
      humanReviewRecommended: true,
      isDemo: true,
    };
    return [placeholder];
  }
}

export class MockRefereeCoachEngine implements RefereeCoachEngine {
  async generateCoaching(input: CoachingInput): Promise<CoachingResultDraft> {
    return {
      summary:
        "この解析はデモ版のパイプラインです。実際の審判位置・視野・メカニクス分析はまだ行われていません。",
      strengths: [],
      growthAreas: [],
      conclusion: "改善提案の生成はデモ段階のため実行していません。",
      evidence: evidenceSummary(input.qualityMetrics, input.durationSeconds),
      confidence: {
        videoQuality: input.qualityMetrics.tier,
        detection: "not_applicable",
        overall: "demo_only",
      },
      whyUncertain:
        "審判の位置・走行距離・視野方向・メカニクスを分析するには姿勢推定・軌跡追跡・コート座標変換モデルが必要ですが、まだ統合されていません。",
      alternativeInterpretation:
        "将来的には根拠タイムスタンプ付きの具体的な改善提案を、信頼度とともに提示する予定です。",
      missingData: "姿勢推定モデル、軌跡追跡モデル、コート座標変換",
      humanReviewRecommended: true,
      isDemo: true,
    };
  }
}

export const mockCourtDetector = new MockCourtDetector();
export const mockPersonDetector = new MockPersonDetector();
export const mockBallDetector = new MockBallDetector();
export const mockEventDetector = new MockEventDetector();
export const mockRefereeCoachEngine = new MockRefereeCoachEngine();

// Used when quality is `insufficient` — the pipeline stops before running
// any detection stage at all, and this is the only result written.
export function buildInsufficientQualityCoaching(
  qualityMetrics: QualityMetrics,
): CoachingResultDraft {
  const reasonLabels = qualityMetrics.reasons.join(", ") || "不明な要因";
  return {
    summary: "映像から解析に必要な情報を十分に取得できなかったため、判定を保留しました。",
    strengths: [],
    growthAreas: [],
    conclusion: "判定不能: 映像品質が解析に必要な最低条件を満たしていません。",
    evidence: `サンプリングフレーム数 ${qualityMetrics.sampledFrameCount}、検出理由: ${reasonLabels}`,
    confidence: {
      videoQuality: "insufficient",
      detection: "not_applicable",
      overall: "demo_only",
    },
    whyUncertain:
      "動画の長さ・解像度・デコード可能なフレーム数のいずれかが解析の最低条件を満たさなかったため、これ以降の解析(コート・人物・ボール検出、コーチング)を実行していません。",
    alternativeInterpretation:
      "より明るく、手ぶれの少ない、解像度の高い映像であれば解析できる可能性があります。",
    missingData: "十分な解像度・長さ・明るさを持つ映像",
    humanReviewRecommended: true,
    isDemo: true,
  };
}
