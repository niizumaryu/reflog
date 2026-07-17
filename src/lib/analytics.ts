import type { MatchRecord, RefereePosition } from "@/lib/matches";
import { getOverallAverage } from "./matches";

function averageOf(values: number[]): number {
  const rated = values.filter((value) => value > 0);
  if (rated.length === 0) return 0;
  return rated.reduce((sum, value) => sum + value, 0) / rated.length;
}

const KEYWORD_DELIMITERS = /[、,。・\/\n\r]+/;
const STOPWORDS = new Set(["こと", "もの", "とき", "ため", "など", "これ", "それ"]);

export function getMonthlyMatchCount(
  records: MatchRecord[],
  reference: Date = new Date(),
): number {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return records
    .filter((record) => {
      const d = new Date(record.date);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === year &&
        d.getMonth() === month
      );
    })
    .reduce((sum, record) => sum + (record.matchCount || 1), 0);
}

export function getYearlyMatchCount(
  records: MatchRecord[],
  reference: Date = new Date(),
): number {
  const year = reference.getFullYear();
  return records
    .filter((record) => {
      const d = new Date(record.date);
      return !Number.isNaN(d.getTime()) && d.getFullYear() === year;
    })
    .reduce((sum, record) => sum + (record.matchCount || 1), 0);
}

export function getPositionCounts(
  records: MatchRecord[],
): { position: RefereePosition | "未設定"; count: number }[] {
  const counts = new Map<RefereePosition | "未設定", number>();
  for (const record of records) {
    const key = record.refereePosition || "未設定";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([position, count]) => ({ position, count }));
}

export function getAverageRatings(records: MatchRecord[]) {
  if (records.length === 0) {
    return {
      judgment: 0,
      mechanics: 0,
      position: 0,
      gameControl: 0,
      communication: 0,
      stamina: 0,
      overall: 0,
    };
  }
  const judgment = averageOf(records.map((r) => r.judgmentRating));
  const mechanics = averageOf(records.map((r) => r.mechanicsRating));
  const position = averageOf(records.map((r) => r.positionRating));
  const gameControl = averageOf(records.map((r) => r.gameControlRating));
  const communication = averageOf(records.map((r) => r.communicationRating));
  const stamina = averageOf(records.map((r) => r.staminaRating));
  const perRecordOverall = records
    .map((record) => getOverallAverage(record))
    .filter((value) => value > 0);
  const overall =
    perRecordOverall.length === 0
      ? 0
      : perRecordOverall.reduce((sum, value) => sum + value, 0) /
        perRecordOverall.length;
  return { judgment, mechanics, position, gameControl, communication, stamina, overall };
}

// `keywords` is always included alongside whatever free-text fields are
// passed in: it's the user's own hand-picked tags, so it's higher-signal
// than anything extracted from prose and should count everywhere keyword
// rankings are shown.
export function extractTopKeywords(
  records: MatchRecord[],
  limit = 8,
  fields: (keyof MatchRecord)[] = ["improvements", "keywords"],
): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const field of fields) {
      const value = record[field];
      if (Array.isArray(value)) {
        for (const tag of value) {
          const token = String(tag).trim();
          if (token.length === 0) continue;
          counts.set(token, (counts.get(token) ?? 0) + 1);
        }
        continue;
      }
      if (typeof value !== "string" || !value) continue;
      const tokens = value
        .split(KEYWORD_DELIMITERS)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
      for (const token of tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
export function getMonthlyCounts(records: MatchRecord[]) {
  const counts = Array(12).fill(0);

  records.forEach((record) => {
    const d = new Date(record.date);

    if (!Number.isNaN(d.getTime())) {
      const month = d.getMonth();
      counts[month] += record.matchCount || 1;
    }
  });

  return counts.map((count, index) => ({
  month: index + 1,
  label: `${index + 1}月`,
  count,
  hasRecord: count > 0,
}));
}
export function getMonthlyAverageRatings(records: MatchRecord[]) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthRecords = records.filter((record) => {
      const d = new Date(record.date);
      return !Number.isNaN(d.getTime()) && d.getMonth() === index;
    });

    const ratings = monthRecords
      .map((record) => getOverallAverage(record))
      .filter((rating): rating is number => typeof rating === "number");

    const average =
      ratings.length === 0
        ? null
        : ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    return {
      month: index + 1,
      label: `${index + 1}月`,
      average,
    };
  });
}