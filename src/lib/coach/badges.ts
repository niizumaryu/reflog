import { getOverallAverage, sortByOldest, type MatchRecord } from "@/lib/matches";

// Badges are computed entirely from existing match records — no dedicated
// Supabase table. This keeps them trivially recalculable (no stale/duplicate
// state to reconcile) and avoids a migration for what is, today, a pure
// function of data the app already stores.
export type BadgeStatus = "earned" | "locked";

export type BadgeProgress = {
  key: string;
  icon: string;
  name: string;
  description: string;
  condition: string;
  status: BadgeStatus;
  earnedAt: string | null;
  progressCurrent: number;
  progressTarget: number;
};

const SEASON_COMPLETE_THRESHOLD = 20;

function parseDate(record: MatchRecord): Date | null {
  if (!record.date) return null;
  const parsed = new Date(record.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(record: MatchRecord): string | null {
  const date = parseDate(record);
  return date ? `${date.getFullYear()}-${date.getMonth()}` : null;
}

// `oldest[index]` is the record at which the Nth achievement happened, so
// its createdAt doubles as a stable, re-derivable "earned at" timestamp.
function nthRecordDate(oldest: MatchRecord[], index: number): string | null {
  return oldest[index]?.createdAt ?? null;
}

function countBadge(
  key: string,
  icon: string,
  name: string,
  threshold: number,
  oldestMatching: MatchRecord[],
): BadgeProgress {
  const current = oldestMatching.length;
  return {
    key,
    icon,
    name,
    description: `合計${threshold}試合の記録を達成`,
    condition: `試合記録が累計${threshold}件に到達する`,
    status: current >= threshold ? "earned" : "locked",
    earnedAt: current >= threshold ? nthRecordDate(oldestMatching, threshold - 1) : null,
    progressCurrent: Math.min(current, threshold),
    progressTarget: threshold,
  };
}

export function evaluateBadges(matches: MatchRecord[]): BadgeProgress[] {
  const oldest = sortByOldest(matches);
  const quickOldest = oldest.filter((m) => m.entryType === "quick");
  const detailedOldest = oldest.filter((m) => m.entryType !== "quick");
  const fiveStarOldest = oldest.filter((m) => getOverallAverage(m) === 5);

  const distinctMonthsInOrder: string[] = [];
  const seenMonths = new Set<string>();
  for (const record of oldest) {
    const key = monthKey(record);
    if (key && !seenMonths.has(key)) {
      seenMonths.add(key);
      distinctMonthsInOrder.push(key);
    }
  }
  const distinctMonthsCount = distinctMonthsInOrder.length;

  // For a "reach N distinct months" badge, earned-at is the date of the
  // first record in the month that pushed the distinct count to N.
  function monthMilestoneDate(target: number): string | null {
    if (distinctMonthsCount < target) return null;
    const targetMonthKey = distinctMonthsInOrder[target - 1];
    const record = oldest.find((r) => monthKey(r) === targetMonthKey);
    return record?.createdAt ?? null;
  }

  // Best (earliest-reached) calendar year total, for the "season complete"
  // badge — avoids guessing at real competition-level tiers.
  const yearTotals = new Map<number, MatchRecord[]>();
  for (const record of oldest) {
    const date = parseDate(record);
    if (!date) continue;
    const year = date.getFullYear();
    const list = yearTotals.get(year) ?? [];
    list.push(record);
    yearTotals.set(year, list);
  }
  let seasonBest = 0;
  let seasonEarnedAt: string | null = null;
  for (const [, records] of [...yearTotals.entries()].sort((a, b) => a[0] - b[0])) {
    seasonBest = Math.max(seasonBest, records.length);
    if (records.length >= SEASON_COMPLETE_THRESHOLD && !seasonEarnedAt) {
      seasonEarnedAt = records[SEASON_COMPLETE_THRESHOLD - 1]?.createdAt ?? null;
    }
  }

  const badges: BadgeProgress[] = [
    {
      key: "first_record",
      icon: "🥇",
      name: "はじめの一歩",
      description: "初めて試合記録を保存",
      condition: "試合記録を1件保存する",
      status: oldest.length >= 1 ? "earned" : "locked",
      earnedAt: nthRecordDate(oldest, 0),
      progressCurrent: Math.min(oldest.length, 1),
      progressTarget: 1,
    },
    {
      key: "quick_log_debut",
      icon: "⚡",
      name: "30秒記録デビュー",
      description: "初めてQuick Logを保存",
      condition: "30秒記録(Quick Log)を1件保存する",
      status: quickOldest.length >= 1 ? "earned" : "locked",
      earnedAt: nthRecordDate(quickOldest, 0),
      progressCurrent: Math.min(quickOldest.length, 1),
      progressTarget: 1,
    },
    {
      key: "detailed_log_debut",
      icon: "📋",
      name: "詳細記録デビュー",
      description: "初めて詳細記録を保存",
      condition: "詳細記録を1件保存する",
      status: detailedOldest.length >= 1 ? "earned" : "locked",
      earnedAt: nthRecordDate(detailedOldest, 0),
      progressCurrent: Math.min(detailedOldest.length, 1),
      progressTarget: 1,
    },
    countBadge("matches_10", "🔟", "10試合達成", 10, oldest),
    countBadge("matches_25", "🎖️", "25試合達成", 25, oldest),
    countBadge("matches_50", "🏅", "50試合達成", 50, oldest),
    countBadge("matches_100", "🏆", "100試合達成", 100, oldest),
    {
      key: "continuous_months",
      icon: "📆",
      name: "継続記録",
      description: "複数月にわたり記録を継続",
      condition: "異なる2か月以上で記録を保存する",
      status: distinctMonthsCount >= 2 ? "earned" : "locked",
      earnedAt: monthMilestoneDate(2),
      progressCurrent: Math.min(distinctMonthsCount, 2),
      progressTarget: 2,
    },
    {
      key: "detailed_10",
      icon: "✍️",
      name: "振り返り上手",
      description: "詳細記録を10件保存",
      condition: "詳細記録を累計10件保存する",
      status: detailedOldest.length >= 10 ? "earned" : "locked",
      earnedAt: nthRecordDate(detailedOldest, 9),
      progressCurrent: Math.min(detailedOldest.length, 10),
      progressTarget: 10,
    },
    {
      key: "growth_trajectory",
      icon: "🌱",
      name: "成長の軌跡",
      description: "異なる3か月以上で記録",
      condition: "異なる3か月以上で記録を保存する",
      status: distinctMonthsCount >= 3 ? "earned" : "locked",
      earnedAt: monthMilestoneDate(3),
      progressCurrent: Math.min(distinctMonthsCount, 3),
      progressTarget: 3,
    },
    {
      key: "five_star",
      icon: "⭐",
      name: "高評価記録",
      description: "総合自己評価5の記録を保存",
      condition: "総合自己評価が5の記録を1件保存する",
      status: fiveStarOldest.length >= 1 ? "earned" : "locked",
      earnedAt: nthRecordDate(fiveStarOldest, 0),
      progressCurrent: Math.min(fiveStarOldest.length, 1),
      progressTarget: 1,
    },
    {
      key: "season_complete",
      icon: "🎽",
      name: "シーズン完走",
      description: `1年間に${SEASON_COMPLETE_THRESHOLD}件以上の記録`,
      condition: `同じ年に${SEASON_COMPLETE_THRESHOLD}件以上の試合記録を保存する`,
      status: seasonBest >= SEASON_COMPLETE_THRESHOLD ? "earned" : "locked",
      earnedAt: seasonEarnedAt,
      progressCurrent: Math.min(seasonBest, SEASON_COMPLETE_THRESHOLD),
      progressTarget: SEASON_COMPLETE_THRESHOLD,
    },
  ];

  return badges;
}

export function getRecentlyEarnedBadges(
  badges: BadgeProgress[],
  limit = 3,
): BadgeProgress[] {
  return badges
    .filter((b) => b.status === "earned" && b.earnedAt)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))
    .slice(0, limit);
}
