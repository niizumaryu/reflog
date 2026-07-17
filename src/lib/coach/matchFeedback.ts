import { getAverageRatings } from "@/lib/analytics";
import { getOverallAverage, type MatchRecord } from "@/lib/matches";
import type { MatchFeedback } from "@/lib/coach/types";

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function findPriorMatches(match: MatchRecord, allMatches: MatchRecord[]): MatchRecord[] {
  const others = allMatches.filter((m) => m.id !== match.id);
  if (!match.date) return others;
  return others.filter((m) => !m.date || m.date <= match.date);
}

function buildGoodTrend(match: MatchRecord, overall: number): string {
  if (match.goodPoints) {
    return `「${truncate(match.goodPoints, 60)}」という点は、今回の記録の良かった点です。次の試合でも続けていきましょう。`;
  }
  if (overall >= 4) {
    return pick([
      "各項目の自己評価が高く、安定したパフォーマンスが出せていました。",
      "総じて評価の高い試合で、今のやり方に自信を持って良い内容でした。",
    ]);
  }
  if (overall >= 3) {
    return "厳しい場面もありながら、最後までしっかり試合に向き合えました。";
  }
  return "難しい試合でしたが、記録を残せたこと自体が次につながる一歩です。";
}

function buildImprovementPoint(match: MatchRecord, isQuickLog: boolean): string {
  if (match.improvements) {
    return `「${truncate(match.improvements, 60)}」を次回への課題として意識しましょう。`;
  }
  if (isQuickLog) {
    return "Quick Logのため改善点の記録がありません。気づいたことがあれば詳細記録に追記してみましょう。";
  }
  return "特筆すべき改善点の記録はありませんでした。次の試合でも気づきがあれば書き残してみましょう。";
}

function buildChangeFromPast(
  currentOverall: number,
  priorAverage: number,
  priorCount: number,
): string {
  if (priorCount === 0) {
    return "これが最初の記録です。ここからの変化を一緒に追っていきましょう。";
  }
  if (currentOverall === 0 || priorAverage === 0) {
    return "自己評価の記録が少ないため、過去との比較はまだ十分にできません。";
  }
  const diff = currentOverall - priorAverage;
  if (diff > 0.3) {
    return `これまでの平均${priorAverage.toFixed(1)}と比べて、今回は${currentOverall.toFixed(1)}と評価が上がっています。良い流れです。`;
  }
  if (diff < -0.3) {
    return `これまでの平均${priorAverage.toFixed(1)}と比べると、今回は${currentOverall.toFixed(1)}とやや低めでした。焦らず次に活かしましょう。`;
  }
  return `これまでの平均${priorAverage.toFixed(1)}と近い水準を維持できています。安定感が出てきています。`;
}

function buildNextFocus(match: MatchRecord, isQuickLog: boolean): string {
  if (match.nextGoal) {
    return `次の試合では「${truncate(match.nextGoal, 60)}」を意識して臨んでみましょう。`;
  }
  if (isQuickLog) {
    return "次回意識することが未記入です。詳細記録を追加すると、より具体的な提案ができます。";
  }
  const position = match.refereePosition;
  if (position === "主審") {
    return "次は試合序盤での基準づくりと、一貫したゲームコントロールを意識してみましょう。";
  }
  if (position === "副審") {
    return "次はプライマリーエリアの意識と、主審を支える広い視野を意識してみましょう。";
  }
  return "次の試合では、自分の担当エリアの意識を明確にして臨んでみましょう。";
}

function findRelatedKeywords(match: MatchRecord, priorMatches: MatchRecord[]): string[] {
  if (match.keywords.length === 0) return [];
  const priorTagCounts = new Map<string, number>();
  for (const m of priorMatches) {
    for (const tag of m.keywords) {
      priorTagCounts.set(tag, (priorTagCounts.get(tag) ?? 0) + 1);
    }
  }
  return match.keywords.filter((tag) => (priorTagCounts.get(tag) ?? 0) >= 1).slice(0, 5);
}

// Per-match analysis comparing this record against the user's own history.
// Deliberately separate from generateAiCoachComment (src/lib/aiCoach.ts) —
// that section stays a manual "コーチに聞く" prompt-style comment, while this
// one is the always-visible "今回のフィードバック" the growth spec asks for,
// centered on historical comparison rather than a standalone tip.
export function generateMatchFeedback(
  match: MatchRecord,
  allMatches: MatchRecord[],
): MatchFeedback {
  const isQuickLog = match.entryType === "quick";
  const overall = getOverallAverage(match);
  const priorMatches = findPriorMatches(match, allMatches);
  const priorAverage = getAverageRatings(priorMatches).overall;

  return {
    isQuickLog,
    goodTrend: buildGoodTrend(match, overall),
    improvementPoint: buildImprovementPoint(match, isQuickLog),
    changeFromPast: buildChangeFromPast(overall, priorAverage, priorMatches.length),
    nextFocus: buildNextFocus(match, isQuickLog),
    relatedKeywords: findRelatedKeywords(match, priorMatches),
  };
}
