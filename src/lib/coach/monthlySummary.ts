import { extractTopKeywords, getAverageRatings, getPositionCounts } from "@/lib/analytics";
import type { MatchRecord } from "@/lib/matches";

export type MonthlySummary = {
  count: number;
  previousCount: number;
  countDiff: number;
  averageRating: number | null;
  previousAverageRating: number | null;
  refereeCount: number;
  assistantCount: number;
  unsetCount: number;
  quickLogCount: number;
  detailedCount: number;
  recordRate: number | null;
  topGoodKeyword: string | null;
  topImprovementKeyword: string | null;
};

function matchesInMonth(matches: MatchRecord[], year: number, month: number): MatchRecord[] {
  return matches.filter((record) => {
    if (!record.date) return false;
    const date = new Date(record.date);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month;
  });
}

// "今月のサマリー" for the home dashboard. All-real-data, no fixed sample
// numbers — every field is either null (no data) or derived from the
// signed-in user's own matches for the current calendar month.
export function getMonthlySummary(
  matches: MatchRecord[],
  referenceDate: Date = new Date(),
): MonthlySummary {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const prevDate = new Date(year, month - 1, 1);

  const current = matchesInMonth(matches, year, month);
  const previous = matchesInMonth(matches, prevDate.getFullYear(), prevDate.getMonth());

  const count = current.reduce((sum, record) => sum + (record.matchCount || 1), 0);
  const previousCount = previous.reduce((sum, record) => sum + (record.matchCount || 1), 0);

  const currentRatings = getAverageRatings(current);
  const previousRatings = getAverageRatings(previous);

  const positionCounts = getPositionCounts(current);
  const refereeCount = positionCounts.find((p) => p.position === "主審")?.count ?? 0;
  const assistantCount = positionCounts.find((p) => p.position === "副審")?.count ?? 0;
  const unsetCount = positionCounts.find((p) => p.position === "未設定")?.count ?? 0;

  const quickLogCount = current.filter((m) => m.entryType === "quick").length;
  const detailedCount = current.length - quickLogCount;

  return {
    count,
    previousCount,
    countDiff: count - previousCount,
    averageRating: currentRatings.overall > 0 ? currentRatings.overall : null,
    previousAverageRating: previousRatings.overall > 0 ? previousRatings.overall : null,
    refereeCount,
    assistantCount,
    unsetCount,
    quickLogCount,
    detailedCount,
    recordRate: current.length > 0 ? (detailedCount / current.length) * 100 : null,
    topGoodKeyword: extractTopKeywords(current, 1, ["goodPoints"])[0]?.word ?? null,
    topImprovementKeyword: extractTopKeywords(current, 1, ["improvements"])[0]?.word ?? null,
  };
}
