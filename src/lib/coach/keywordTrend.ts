import { extractTopKeywords } from "@/lib/analytics";
import type { MatchRecord } from "@/lib/matches";
import { filterMatchesByPeriod, getRollingMonthlyBuckets, type PeriodOption } from "@/lib/coach/period";

export type KeywordTrendPoint = { label: string; count: number };

export type KeywordMonthlyTrend = {
  keyword: string | null;
  buckets: KeywordTrendPoint[];
};

// Monthly occurrence count of the single most common improvement keyword
// within the selected period — a lightweight proxy for "is this recurring
// theme trending up or down." Not a claim about causality, just a count.
export function getKeywordMonthlyTrend(
  matches: MatchRecord[],
  period: PeriodOption,
  referenceDate: Date = new Date(),
): KeywordMonthlyTrend {
  const periodMatches = filterMatchesByPeriod(matches, period, referenceDate);
  const [top] = extractTopKeywords(periodMatches, 1, ["improvements", "keywords"]);
  if (!top) return { keyword: null, buckets: [] };

  const monthBuckets = getRollingMonthlyBuckets(periodMatches, period, () => 0, referenceDate);
  const counts = new Map(monthBuckets.map((bucket) => [bucket.key, 0]));

  for (const record of periodMatches) {
    if (!record.date) continue;
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!counts.has(key)) continue;
    const haystack = [record.improvements, record.keywords.join(" ")].join(" ");
    if (haystack.includes(top.word)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return {
    keyword: top.word,
    buckets: monthBuckets.map((bucket) => ({
      label: bucket.label,
      count: counts.get(bucket.key) ?? 0,
    })),
  };
}
