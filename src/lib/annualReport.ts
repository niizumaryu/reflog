import { getAverageRatings, getPositionCounts } from "@/lib/analytics";
import type { MatchRecord } from "@/lib/matches";

export const CATEGORY_BUCKETS = [
  "U12",
  "U15",
  "U18",
  "大学",
  "社会人",
  "プロ",
  "その他",
] as const;

export type CategoryBucket = (typeof CATEGORY_BUCKETS)[number];

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

function parseMatchDate(record: MatchRecord): Date | null {
  if (!record.date) return null;
  const parsed = new Date(record.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getAvailableYears(records: MatchRecord[]): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);
  for (const record of records) {
    const date = parseMatchDate(record);
    if (date) years.add(date.getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

export function filterMatchesByYear(
  records: MatchRecord[],
  year: number,
): MatchRecord[] {
  return records.filter((record) => {
    const date = parseMatchDate(record);
    return date?.getFullYear() === year;
  });
}

export function classifyCategory(rawCategory: string): CategoryBucket {
  const text = rawCategory.toLowerCase();
  if (text.includes("u12") || text.includes("小学")) return "U12";
  if (text.includes("u15") || text.includes("中学")) return "U15";
  if (text.includes("u18") || text.includes("高校")) return "U18";
  if (text.includes("大学")) return "大学";
  if (text.includes("社会人")) return "社会人";
  if (
    text.includes("プロ") ||
    text.includes("bリーグ") ||
    /\bb[123]\b/.test(text)
  ) {
    return "プロ";
  }
  return "その他";
}

export type AnnualSummary = {
  totalMatchCount: number;
  refereeCount: number;
  assistantCount: number;
  unsetCount: number;
  averageRating: number;
  activeMonths: number;
};

export function getAnnualSummary(yearMatches: MatchRecord[]): AnnualSummary {
  // A saved record always represents at least one officiated match, even if
  // its optional 試合数 field was left blank (and thus stored as 0) — so an
  // unset/zero value falls back to 1 rather than dropping the record from
  // the total.
  const totalMatchCount = yearMatches.reduce(
    (sum, record) => sum + (record.matchCount || 1),
    0,
  );
  const positionCounts = getPositionCounts(yearMatches);
  const refereeCount =
    positionCounts.find((p) => p.position === "主審")?.count ?? 0;
  const assistantCount =
    positionCounts.find((p) => p.position === "副審")?.count ?? 0;
  const unsetCount =
    positionCounts.find((p) => p.position === "未設定")?.count ?? 0;
  const averageRating = getAverageRatings(yearMatches).overall;

  const activeMonths = new Set(
    yearMatches
      .map((record) => parseMatchDate(record)?.getMonth())
      .filter((month): month is number => month !== undefined),
  ).size;

  return {
    totalMatchCount,
    refereeCount,
    assistantCount,
    unsetCount,
    averageRating,
    activeMonths,
  };
}

export function getMonthlyMatchCounts(
  yearMatches: MatchRecord[],
): { month: number; label: string; count: number; hasRecord: boolean }[] {
  const counts = new Array(12).fill(0) as number[];
  const recordCounts = new Array(12).fill(0) as number[];
  for (const record of yearMatches) {
    const date = parseMatchDate(record);
    if (!date) continue;
    const month = date.getMonth();
    counts[month] += record.matchCount || 1;
    recordCounts[month] += 1;
  }
  return counts.map((count, month) => ({
    month: month + 1,
    label: MONTH_LABELS[month],
    count,
    hasRecord: recordCounts[month] > 0,
  }));
}

export function getMonthlyRatingTrend(
  yearMatches: MatchRecord[],
): { month: number; label: string; average: number | null }[] {
  const byMonth: MatchRecord[][] = Array.from({ length: 12 }, () => []);
  for (const record of yearMatches) {
    const date = parseMatchDate(record);
    if (!date) continue;
    byMonth[date.getMonth()].push(record);
  }
  return byMonth.map((records, month) => ({
    month: month + 1,
    label: MONTH_LABELS[month],
    average: records.length > 0 ? getAverageRatings(records).overall : null,
  }));
}

export function getCategoryBreakdown(
  yearMatches: MatchRecord[],
): { category: CategoryBucket; count: number }[] {
  const counts = new Map<CategoryBucket, number>(
    CATEGORY_BUCKETS.map((bucket) => [bucket, 0]),
  );
  for (const record of yearMatches) {
    const bucket = classifyCategory(record.category);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return CATEGORY_BUCKETS.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}
