import type { MatchRecord, RefereePosition } from "@/lib/matches";

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
    return { judgment: 0, position: 0, communication: 0, overall: 0 };
  }
  const totals = records.reduce(
    (acc, record) => {
      acc.judgment += record.judgmentRating || 0;
      acc.position += record.positionRating || 0;
      acc.communication += record.communicationRating || 0;
      return acc;
    },
    { judgment: 0, position: 0, communication: 0 },
  );
  const judgment = totals.judgment / records.length;
  const position = totals.position / records.length;
  const communication = totals.communication / records.length;
  const overall = (judgment + position + communication) / 3;
  return { judgment, position, communication, overall };
}

export function extractTopKeywords(
  records: MatchRecord[],
  limit = 8,
  fields: (keyof MatchRecord)[] = ["improvements"],
): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const field of fields) {
      const text = record[field];
      if (typeof text !== "string" || !text) continue;
      const tokens = text
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
