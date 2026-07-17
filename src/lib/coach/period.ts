import type { MatchRecord } from "@/lib/matches";

// Period filter used by the growth charts page. Rolling windows (not tied to
// a calendar year) so "直近3か月" always means the last 3 months regardless
// of when in the year it is.
export const PERIOD_OPTIONS = ["3m", "6m", "1y", "all"] as const;
export type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export const PERIOD_LABELS: Record<PeriodOption, string> = {
  "3m": "直近3か月",
  "6m": "直近6か月",
  "1y": "直近1年",
  all: "全期間",
};

function parseDate(record: MatchRecord): Date | null {
  if (!record.date) return null;
  const parsed = new Date(record.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthsForPeriod(period: PeriodOption): number | null {
  if (period === "3m") return 3;
  if (period === "6m") return 6;
  if (period === "1y") return 12;
  return null;
}

export function getPeriodStart(
  period: PeriodOption,
  referenceDate: Date = new Date(),
): Date | null {
  const months = monthsForPeriod(period);
  if (months === null) return null;
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - months + 1,
    1,
  );
  return start;
}

export function filterMatchesByPeriod(
  matches: MatchRecord[],
  period: PeriodOption,
  referenceDate: Date = new Date(),
): MatchRecord[] {
  const start = getPeriodStart(period, referenceDate);
  if (!start) return matches;
  return matches.filter((record) => {
    const date = parseDate(record);
    return date !== null && date >= start;
  });
}

export type MonthlyBucket = {
  key: string; // "2026-03"
  label: string; // "3月"
  count: number;
  average: number | null;
};

// Builds one bucket per calendar month from `start` through `referenceDate`,
// even for months with zero records, so charts always show a continuous
// timeline instead of skipping gaps.
export function getRollingMonthlyBuckets(
  matches: MatchRecord[],
  period: PeriodOption,
  getOverallAverage: (record: MatchRecord) => number,
  referenceDate: Date = new Date(),
): MonthlyBucket[] {
  const dated = matches
    .map((record) => ({ record, date: parseDate(record) }))
    .filter((entry): entry is { record: MatchRecord; date: Date } => entry.date !== null);

  let start = getPeriodStart(period, referenceDate);
  if (!start) {
    if (dated.length === 0) {
      start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    } else {
      const earliest = dated.reduce((min, entry) =>
        entry.date < min.date ? entry : min,
      );
      start = new Date(earliest.date.getFullYear(), earliest.date.getMonth(), 1);
    }
  }

  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const buckets: MonthlyBucket[] = [];
  const cursor = new Date(start);
  // Hard cap to guard against pathological data (e.g. a stray future/past
  // date) blowing up the chart into thousands of empty months.
  let guard = 0;
  while (cursor <= end && guard < 240) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: `${cursor.getMonth() + 1}月`, count: 0, average: null });
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }

  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const ratingsByKey = new Map<string, number[]>();

  for (const { record, date } of dated) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    bucket.count += record.matchCount || 1;
    const overall = getOverallAverage(record);
    if (overall > 0) {
      const list = ratingsByKey.get(key) ?? [];
      list.push(overall);
      ratingsByKey.set(key, list);
    }
  }

  for (const bucket of buckets) {
    const ratings = ratingsByKey.get(bucket.key);
    bucket.average =
      ratings && ratings.length > 0
        ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
        : null;
  }

  return buckets;
}
