import type { KeywordInsights } from "@/lib/coach/keywordInsights";
import type { CoachAnalysisResult } from "@/lib/coach/types";

// Turns a CoachAnalysisResult + KeywordInsights into a short list of
// natural-language observations for the /growth hub's AIコーチ section.
// Each line names the underlying evidence (a repeated keyword, a rating
// trend, a data gap) rather than issuing a bare verdict.
export function generateCoachAdvice(
  analysis: CoachAnalysisResult,
  keywords: KeywordInsights,
): string[] {
  if (!analysis.hasData) {
    return ["まだ分析できる記録がありません。試合を記録すると、ここに成長傾向が表示されます。"];
  }

  const lines: string[] = [];

  if (analysis.repeatedImprovement) {
    lines.push(
      `最近${analysis.recentMatches.length}試合で「${analysis.repeatedImprovement.keyword}」が繰り返し改善点として記録されています。次はここを1つのテーマにしてみましょう。`,
    );
  }

  if (analysis.repeatedGood) {
    lines.push(
      `「${analysis.repeatedGood.keyword}」は良かった点として複数回記録されています。自信を持って続けていきましょう。`,
    );
  }

  if (analysis.ratingTrend === "up") {
    lines.push("平均自己評価が以前の記録より上がっています。今のやり方を続けていきましょう。");
  } else if (analysis.ratingTrend === "down") {
    lines.push("直近の自己評価がやや下がり気味です。焦らず、1つずつ振り返ってみましょう。");
  }

  if (analysis.pendingQuickLogs.length >= 2) {
    lines.push("Quick Logが続いているため、時間があるときに詳細を追記してみましょう。");
  }

  if (analysis.daysSinceLastRecord !== null && analysis.daysSinceLastRecord >= 14) {
    lines.push(
      `最近${analysis.daysSinceLastRecord}日ほど記録がありません。前回の課題を確認して次の試合に備えましょう。`,
    );
  }

  if (keywords.rising.length > 0) {
    lines.push(
      `最近増えているキーワード: ${keywords.rising.map((k) => k.keyword).join("、")}`,
    );
  }

  if (keywords.improving.length > 0) {
    lines.push(
      `改善が見られる可能性があるキーワード: ${keywords.improving.join("、")}(以前は改善点として、最近は良かった点として記録されています)`,
    );
  }

  if (lines.length === 0) {
    lines.push(
      "記録を続けることで、傾向やテーマがより具体的に見えてきます。次の試合も記録を続けましょう。",
    );
  }

  return lines;
}
