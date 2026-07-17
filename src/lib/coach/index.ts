export * from "@/lib/coach/types";
export { analyzeRecords } from "@/lib/coach/analyze";
export { generateCoachAdvice } from "@/lib/coach/advice";
export { generateMatchFeedback } from "@/lib/coach/matchFeedback";
export { generateTodayAdvice } from "@/lib/coach/todayAdvice";
export { analyzeKeywords, type KeywordInsights } from "@/lib/coach/keywordInsights";
export { evaluateBadges, getRecentlyEarnedBadges, type BadgeProgress, type BadgeStatus } from "@/lib/coach/badges";
export {
  PERIOD_OPTIONS,
  PERIOD_LABELS,
  filterMatchesByPeriod,
  getRollingMonthlyBuckets,
  type PeriodOption,
  type MonthlyBucket,
} from "@/lib/coach/period";
export { RuleBasedCoachProvider, coachProvider } from "@/lib/coach/provider";
export { getMonthlySummary, type MonthlySummary } from "@/lib/coach/monthlySummary";
export { getKeywordMonthlyTrend, type KeywordMonthlyTrend, type KeywordTrendPoint } from "@/lib/coach/keywordTrend";
