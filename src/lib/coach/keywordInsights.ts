import { extractTopKeywords } from "@/lib/analytics";
import type { MatchRecord } from "@/lib/matches";
import type { KeywordTrend } from "@/lib/coach/types";

export type KeywordInsights = {
  goodTop: KeywordTrend[];
  improvementTop: KeywordTrend[];
  nextGoalTop: KeywordTrend[];
  tagTop: KeywordTrend[];
  rising: KeywordTrend[];
  improving: string[];
};

const EMPTY_INSIGHTS: KeywordInsights = {
  goodTop: [],
  improvementTop: [],
  nextGoalTop: [],
  tagTop: [],
  rising: [],
  improving: [],
};

function parseDate(record: MatchRecord): Date | null {
  if (!record.date) return null;
  const parsed = new Date(record.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toTrend(entries: { word: string; count: number }[]): KeywordTrend[] {
  return entries.map(({ word, count }) => ({ keyword: word, count }));
}

// Categorized keyword rankings. Only fields that unambiguously belong to a
// single category are used per bucket — the free-tag `keywords` field isn't
// polarity-tagged (good vs. improvement), so it gets its own "よく使うタグ"
// bucket instead of being guessed into good/improvement.
export function analyzeKeywords(
  matches: MatchRecord[],
  limit = 3,
): KeywordInsights {
  if (matches.length === 0) return EMPTY_INSIGHTS;

  const goodTop = toTrend(extractTopKeywords(matches, limit, ["goodPoints"]));
  const improvementTop = toTrend(
    extractTopKeywords(matches, limit, ["improvements"]),
  );
  const nextGoalTop = toTrend(extractTopKeywords(matches, limit, ["nextGoal"]));
  const tagTop = toTrend(extractTopKeywords(matches, limit, ["keywords"]));

  const dated = matches
    .map((record) => ({ record, date: parseDate(record) }))
    .filter((entry): entry is { record: MatchRecord; date: Date } => entry.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Not enough dated history to compare "recent" vs. "earlier" meaningfully.
  if (dated.length < 4) {
    return { goodTop, improvementTop, nextGoalTop, tagTop, rising: [], improving: [] };
  }

  const mid = Math.floor(dated.length / 2);
  const older = dated.slice(0, mid).map((entry) => entry.record);
  const recent = dated.slice(mid).map((entry) => entry.record);

  const activityFields: (keyof MatchRecord)[] = [
    "goodPoints",
    "improvements",
    "nextGoal",
    "keywords",
  ];
  const olderActivity = new Map(
    extractTopKeywords(older, 50, activityFields).map((e) => [e.word, e.count]),
  );
  const recentActivity = extractTopKeywords(recent, 50, activityFields);

  const rising = recentActivity
    .filter((entry) => {
      const olderCount = olderActivity.get(entry.word) ?? 0;
      if (entry.count < 2) return false;
      if (olderCount === 0) return true;
      const recentRate = entry.count / recent.length;
      const olderRate = olderCount / older.length;
      return recentRate > olderRate * 1.5;
    })
    .slice(0, 3);

  const olderImprovementWords = new Set(
    extractTopKeywords(older, 50, ["improvements"]).map((e) => e.word),
  );
  const recentGoodWords = new Set(
    extractTopKeywords(recent, 50, ["goodPoints"]).map((e) => e.word),
  );
  const improving = [...olderImprovementWords].filter((word) =>
    recentGoodWords.has(word),
  ).slice(0, 3);

  return {
    goodTop,
    improvementTop,
    nextGoalTop,
    tagTop,
    rising: toTrend(rising),
    improving,
  };
}
