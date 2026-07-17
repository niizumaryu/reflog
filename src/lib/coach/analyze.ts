import { extractTopKeywords, getAverageRatings } from "@/lib/analytics";
import { sortByNewest, type MatchRecord } from "@/lib/matches";
import type { CoachAnalysisInput, CoachAnalysisResult, KeywordTrend } from "@/lib/coach/types";

function parseDate(record: MatchRecord): Date | null {
  if (!record.date) return null;
  const parsed = new Date(record.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function topKeyword(
  matches: MatchRecord[],
  field: keyof MatchRecord,
): KeywordTrend | null {
  const [top] = extractTopKeywords(matches, 1, [field]);
  if (!top || top.count < 2) return null;
  return { keyword: top.word, count: top.count };
}

// Pure, deterministic analysis of a user's match history. No randomness and
// no I/O — every UI surface (home advice card, match feedback, growth page)
// derives from this single pass over the data so trends stay consistent
// across the app.
export function analyzeRecords(input: CoachAnalysisInput): CoachAnalysisResult {
  const { matches } = input;
  const referenceDate = input.referenceDate ?? new Date();

  if (matches.length === 0) {
    return {
      hasData: false,
      totalRecords: 0,
      quickLogCount: 0,
      detailedCount: 0,
      recentMatches: [],
      recentAverage: null,
      previousAverage: null,
      ratingTrend: "unknown",
      daysSinceLastRecord: null,
      repeatedImprovement: null,
      repeatedGood: null,
      pendingQuickLogs: [],
      activeMonthsCount: 0,
    };
  }

  const newest = sortByNewest(matches);
  const recentMatches = newest.slice(0, 5);
  const previousMatches = newest.slice(5, 10);

  const recentRatings = getAverageRatings(recentMatches);
  const previousRatings = getAverageRatings(previousMatches);
  const recentAverage = recentRatings.overall > 0 ? recentRatings.overall : null;
  const previousAverage =
    previousMatches.length > 0 && previousRatings.overall > 0
      ? previousRatings.overall
      : null;

  let ratingTrend: CoachAnalysisResult["ratingTrend"] = "unknown";
  if (recentAverage !== null && previousAverage !== null) {
    const diff = recentAverage - previousAverage;
    ratingTrend = diff > 0.15 ? "up" : diff < -0.15 ? "down" : "flat";
  }

  const lastDate = parseDate(newest[0]);
  const daysSinceLastRecord = lastDate ? daysBetween(referenceDate, lastDate) : null;

  const quickLogCount = matches.filter((m) => m.entryType === "quick").length;
  const detailedCount = matches.length - quickLogCount;

  const activeMonthsCount = new Set(
    matches
      .map((record) => parseDate(record))
      .filter((date): date is Date => date !== null)
      .map((date) => `${date.getFullYear()}-${date.getMonth()}`),
  ).size;

  const pendingQuickLogs = newest.filter((m) => m.entryType === "quick").slice(0, 3);

  return {
    hasData: true,
    totalRecords: matches.length,
    quickLogCount,
    detailedCount,
    recentMatches,
    recentAverage,
    previousAverage,
    ratingTrend,
    daysSinceLastRecord,
    repeatedImprovement: topKeyword(recentMatches, "improvements"),
    repeatedGood: topKeyword(recentMatches, "goodPoints"),
    pendingQuickLogs,
    activeMonthsCount,
  };
}
