import { analyzeKeywords, analyzeRecords, generateCoachAdvice } from "@/lib/coach";
import type { MatchRecord } from "@/lib/matches";
import { createNotification, hasNotification } from "@/lib/notifications/center";
import { getNotificationSettings } from "@/lib/notifications/settings";

function jstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(date);
}

// Builds a short "改善ポイント" + "継続ポイント" message from the same
// rule-based coach analysis already used on /growth, and drops it into the
// notification center right after a match record is saved. At most one
// ai_advice notification is created per calendar day (deduped via
// hasNotification). Best-effort: any failure (not signed in, network, RLS)
// is swallowed so it never blocks the match-save flow that calls it.
export async function maybeNotifyAiAdvice(
  matches: MatchRecord[],
  referenceDate: Date = new Date(),
): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.enabled || !settings.aiAdviceEnabled) return;

    const referenceId = jstDateKey(referenceDate);
    if (await hasNotification("ai_advice", referenceId)) return;

    const analysis = analyzeRecords({ matches, referenceDate });
    if (!analysis.hasData) return;

    const lines: string[] = [];
    if (analysis.repeatedImprovement) {
      lines.push(
        `改善ポイント: 「${analysis.repeatedImprovement.keyword}」を意識してみましょう。`,
      );
    }
    if (analysis.repeatedGood) {
      lines.push(
        `継続ポイント: 「${analysis.repeatedGood.keyword}」は良い傾向です。続けていきましょう。`,
      );
    }
    if (lines.length === 0) {
      const keywords = analyzeKeywords(matches);
      const [fallback] = generateCoachAdvice(analysis, keywords);
      if (fallback) lines.push(fallback);
    }
    if (lines.length === 0) return;

    await createNotification({
      type: "ai_advice",
      title: "AIコーチからのアドバイス",
      body: lines.join("\n"),
      url: "/growth",
      referenceId,
    });
  } catch (error) {
    console.error("Failed to create AI advice notification:", error);
  }
}
