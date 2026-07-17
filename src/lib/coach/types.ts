import type { MatchRecord } from "@/lib/matches";

// Shared shape for coach-related analysis. Kept intentionally small so a
// future real-AI provider (OpenAI/Claude/etc.) only needs to satisfy this
// contract instead of matching internal rule-based implementation details.

export type KeywordTrend = { keyword: string; count: number };

export type CoachAnalysisInput = {
  matches: MatchRecord[];
  referenceDate?: Date;
};

export type CoachAnalysisResult = {
  hasData: boolean;
  totalRecords: number;
  quickLogCount: number;
  detailedCount: number;
  recentMatches: MatchRecord[];
  recentAverage: number | null;
  previousAverage: number | null;
  ratingTrend: "up" | "down" | "flat" | "unknown";
  daysSinceLastRecord: number | null;
  repeatedImprovement: KeywordTrend | null;
  repeatedGood: KeywordTrend | null;
  pendingQuickLogs: MatchRecord[];
  activeMonthsCount: number;
};

export type MatchFeedback = {
  isQuickLog: boolean;
  goodTrend: string;
  improvementPoint: string;
  changeFromPast: string;
  nextFocus: string;
  relatedKeywords: string[];
};

export type ScheduleLike = {
  scheduled_date: string | null;
};

export type TodayAdviceKind =
  | "before_match_tomorrow"
  | "match_today"
  | "recent_save"
  | "quick_log_pending"
  | "inactive"
  | "empty";

export type TodayAdviceAction = { label: string; href: string };

export type TodayAdvice = {
  kind: TodayAdviceKind;
  title: string;
  message: string;
  supportingNote?: string;
  primaryAction?: TodayAdviceAction;
  secondaryAction?: TodayAdviceAction;
};

// The interface a future generative-AI backed provider would implement.
// RuleBasedCoachProvider (src/lib/coach/provider.ts) is the only
// implementation today; swapping in a real API later means adding a new
// class here without touching any UI call site.
export interface CoachProvider {
  analyzeRecords(input: CoachAnalysisInput): CoachAnalysisResult;
  generateMatchFeedback(
    match: MatchRecord,
    allMatches: MatchRecord[],
  ): MatchFeedback;
  generateTodayAdvice(
    matches: MatchRecord[],
    schedules: ScheduleLike[],
    referenceDate?: Date,
  ): TodayAdvice;
}
